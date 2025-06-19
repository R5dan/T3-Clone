import type { TOOL } from "./types";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { workos } from "~/server/workos";
import { Ok, Err } from "neverthrow";
import { FileError, InvalidUserId, NoOpenRouterKey } from "~/server/errors";
import { FREE_MODELS } from "./models";
import type { MODEL_IDS } from "./types";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import env from "~/env.js";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PostHog } from "posthog-node";
import { withTracing } from "@posthog/ai";

export async function handleMessage(userId: string, model: MODEL_IDS) {
  let key: string;
  if (userId !== "local") {
    const user = await workos.userManagement.getUser(userId);

    if (!user) {
      return new Err(new InvalidUserId(userId));
    }

    if (!("openRouterKey" in user.metadata)) {
      return new Err(new NoOpenRouterKey());
    }

    key = user.metadata.openRouterKey;
  } else if (FREE_MODELS.filter((m) => m === model).length === 1) {
    key = env.OPENROUTER_KEY;
  } else if (userId === "local") {
    console.log(`NO KEY: ${model}`);
    console.log(
      FREE_MODELS.filter((m) => m.split("/")[0] === model.split("/")[0]),
    );
    console.log(FREE_MODELS.filter((m) => m === model));
    return new Err(new NoOpenRouterKey());
  } else {
    return new Err(new NoOpenRouterKey());
  }
  console.log("OPENROUTER KEY:", key);
  const openRouter = createOpenRouter({
    apiKey: key,
    extraBody: {
      plugins: [
        {
          id: "file-parser",
          pdf: {
            engine: "pdf-text",
          },
        },
      ],
    },
  });
  return new Ok(openRouter);
}

export async function sendMessage(
  message: string,
  thread: Id<"threads">,
  embeddedThread: Id<"embeddedThreads">,
  userId: Id<"users"> | "local",
  tools: Record<TOOL, boolean>,
  model: MODEL_IDS,
  files: (Id<"files"> | Id<"images">)[],
) {
  const openRouter = await handleMessage(userId, model);
  if (openRouter.isErr()) {
    return openRouter;
  }
  const msgs = await fetchQuery(api.messages.getMessages, {
    embeddedThreadId: embeddedThread,
  });
  const phClient = new PostHog(
    "phc_vaUjGO5ThZF2xbJI3TqssLCBeLHEKtsqKfmHRSrmkuK",
    { host: "https://eu.i.posthog.com" },
  );

  const result = streamText({
    model: withTracing(openRouter.value.chat(model), phClient, {
      posthogDistinctId: userId,
      posthogProperties: {
        threadId: thread,
        embeddedThreadId: embeddedThread,
      },
    }),
    messages: (
      await Promise.all(
        msgs
          .map(async (msg) => {
            if (msg.reasoning) {
              return [
                {
                  role: "user" as const,
                  content: await Promise.all(
                    msg.prompt.map(async (prompt) => {
                      if (prompt.role === "text") {
                        return {
                          type: "text" as const,
                          text: prompt.content,
                        };
                      } else if (prompt.role === "image") {
                        const image = await fetchQuery(api.files.getImage, {
                          image: prompt.image,
                        });
                        if (image instanceof FileError) {
                          return null;
                        }
                        return {
                          type: "image" as const,
                          image: image.url,
                        };
                      } else if (prompt.role === "file") {
                        const file = await fetchQuery(api.files.getFile, {
                          file: prompt.file,
                        });
                        if (file instanceof Error) {
                          return null;
                        }
                        return {
                          type: "file" as const,
                          file: file.url,
                          filename: file.filename,
                          mimeType: file.mimeType,
                        };
                      }
                    }),
                  ),
                },
                {
                  role: "assistant" as const,
                  content: msg.response
                    .map((resp) => {
                      if (resp.role === "text") {
                        return {
                          type: "text" as const,
                          text: resp.content,
                        };
                      }
                    })
                    .concat([
                      {
                        type: "reasoning" as const,
                        text: msg.reasoning,
                      },
                    ]),
                },
              ];
            }
            return [
              {
                role: "user",
                content: msg.prompt,
              },
              {
                role: "assistant",
                content: msg.response,
              },
            ];
          })
          .concat([
            {
              role: "user" as const,
              content: [
                {
                  type: "text" as const,
                  text: message,
                },
                ...(
                  await Promise.all(
                    files.map(async (data) => {
                      if (data.__tableName === "images") {
                        const image = await fetchQuery(api.files.getImage, {
                          image: data,
                        });
                        if (image instanceof Error) {
                          return null;
                        }
                        return {
                          type: "image" as const,
                          image: image.url,
                        };
                      } else {
                        const file = await fetchQuery(api.files.getFile, {
                          file: data,
                        });
                        if (file instanceof Error) {
                          return null;
                        }
                        return {
                          type: "file" as const,
                          file: file.url,
                          filename: file.filename,
                          mimeType: file.mimeType,
                        };
                      }
                    }),
                  )
                ).filter((file) => file !== null),
              ],
            },
          ]),
      )
    ).flat(),
    onFinish: async (event) => {
      console.log("[MESSAGE][STREAM][FINISH]", event);
      try {
        await fetchMutation(api.messages.addMessage, {
          response: event.text,
          model: model,
          threadId: thread,
          embeddedThreadId: embeddedThread,
          userId,
          message,
          reasoning: event.reasoning,
          files,
        });
      } catch (err) {
        console.error("[MESSAGE][MUTATION][ERROR]", err);
      }
    },
    // Close the stream when finished
    onError: async ({ error }) => {
      console.error("[MESSAGE][STREAM][ERROR]", error);
    },
  });
  // const stream = new ReadableStream({
  //   async start(controller) {
  //     try {
  //       console.log("START");

  //       result.

  //       console.log("CLOSING");
  //       controller.close();
  //       console.log(`END: ${await result.finishReason}`);
  //     } catch (err) {
  //       console.error("[MESSAGE][STREAM][START][ERROR]", err);
  //       controller.error(err);
  //     }
  //     console.log("CLOSED");
  //   },
  // });
  console.log("RETURNING STREAM");
  return new Ok(result);
}

export async function editMessage(
  message: string,
  msgId: Id<"messages">,
  thread: Id<"threads">,
  embeddedThread: Id<"embeddedThreads">,
  userId: Id<"users"> | "local",
  model: MODEL_IDS,
  files: (Id<"files"> | Id<"images">)[],
) {
  const openRouter = await handleMessage(userId, model);
  if (openRouter.isErr()) {
    return openRouter;
  }
  const msgs = await fetchQuery(api.messages.getMessages, {
    embeddedThreadId: embeddedThread,
  });

  const msg = await fetchQuery(api.messages.getMessage, {
    messageId: msgId,
  });

  if (!msg) {
    return new Error("Message not found");
  }

  const phClient = new PostHog(
    "phc_vaUjGO5ThZF2xbJI3TqssLCBeLHEKtsqKfmHRSrmkuK",
    { host: "https://eu.i.posthog.com" },
  );

  const result = streamText({
    model: withTracing(openRouter.value.chat(model), phClient, {
      posthogDistinctId: userId,
      posthogProperties: {
        embeddedThreadId: embeddedThread,
      },
    }),
    messages: (
      await Promise.all(
        msgs
          .slice(
            0,
            msgs.findIndex((msg) => msg._id === msgId),
          )
          .map(async (msg) => {
            if (msg.reasoning) {
              return [
                {
                  role: "user" as const,
                  content: await Promise.all(
                    msg.prompt.map(async (prompt) => {
                      if (prompt.role === "text") {
                        return {
                          type: "text" as const,
                          text: prompt.content,
                        };
                      } else if (prompt.role === "image") {
                        const image = await fetchQuery(api.files.getImage, {
                          image: prompt.image,
                        });
                        if (image instanceof FileError) {
                          return null;
                        }
                        return {
                          type: "image" as const,
                          image: image.url,
                        };
                      } else if (prompt.role === "file") {
                        const file = await fetchQuery(api.files.getFile, {
                          file: prompt.file,
                        });
                        if (file instanceof Error) {
                          return null;
                        }
                        return {
                          type: "file" as const,
                          file: file.url,
                          filename: file.filename,
                          mimeType: file.mimeType,
                        };
                      }
                    }),
                  ),
                },
                {
                  role: "assistant" as const,
                  content: msg.response
                    .map((resp) => {
                      if (resp.role === "text") {
                        return {
                          type: "text" as const,
                          text: resp.content,
                        };
                      }
                    })
                    .concat([
                      {
                        type: "reasoning" as const,
                        text: msg.reasoning,
                      },
                    ]),
                },
              ];
            }
            return [
              {
                role: "user",
                content: msg.prompt,
              },
              {
                role: "assistant",
                content: msg.response,
              },
            ];
          })
          .concat([
            {
              role: "user" as const,
              content: [
                {
                  type: "text" as const,
                  text: message,
                },
                ...(
                  await Promise.all(
                    files.map(async (data) => {
                      if (data.__tableName === "images") {
                        const image = await fetchQuery(api.files.getImage, {
                          image: data,
                        });
                        if (image instanceof Error) {
                          return null;
                        }
                        return {
                          type: "image" as const,
                          image: image.url,
                        };
                      } else {
                        const file = await fetchQuery(api.files.getFile, {
                          file: data,
                        });
                        if (file instanceof Error) {
                          return null;
                        }
                        return {
                          type: "file" as const,
                          file: file.url,
                          filename: file.filename,
                          mimeType: file.mimeType,
                        };
                      }
                    }),
                  )
                ).filter((file) => file !== null),
              ],
            },
          ]),
      )
    ).flat(),
    onFinish: async (event) => {
      console.log("[MESSAGE][STREAM][FINISH]", event);
      try {
        await fetchMutation(api.messages.editMessage, {
          msgId,
          threadId: thread,
          embedThreadId: embeddedThread,
          message,
          files: [],
          response: event.text,
          reasoning: event.reasoning,
          userId,
          model,
        });
      } catch (err) {
        console.error("[MESSAGE][MUTATION][ERROR]", err);
      }
    },
    // Close the stream when finished
    onError: async ({ error }) => {
      console.error("[MESSAGE][STREAM][ERROR]", error);
    },
  });
  // const stream = new ReadableStream({
  //   async start(controller) {
  //     try {
  //       console.log("START");

  //       result.

  //       console.log("CLOSING");
  //       controller.close();
  //       console.log(`END: ${await result.finishReason}`);
  //     } catch (err) {
  //       console.error("[MESSAGE][STREAM][START][ERROR]", err);
  //       controller.error(err);
  //     }
  //     console.log("CLOSED");
  //   },
  // });
  console.log("RETURNING STREAM");
  return new Ok(result);
}

export async function regenMessage(
  msgId: Id<"messages">,
  userId: Id<"users"> | "local",
  embeddedThread: Id<"embeddedThreads">,
  model: MODEL_IDS,
) {
  const openRouter = await handleMessage(userId, model);
  if (openRouter.isErr()) {
    return openRouter;
  }
  const msg = await fetchQuery(api.messages.getMessage, {
    messageId: msgId,
  });

  if (!msg) {
    return new Error("Message not found");
  }

  const embedThread = await fetchQuery(api.thread.getEmbeddedThread, {
    threadId: embeddedThread,
  });

  if (!embedThread) {
    return new Error("Embedded thread not found");
  }

  const phClient = new PostHog(
    "phc_vaUjGO5ThZF2xbJI3TqssLCBeLHEKtsqKfmHRSrmkuK",
    { host: "https://eu.i.posthog.com" },
  );

  const result = streamText({
    model: withTracing(openRouter.value.chat(model), phClient, {
      posthogDistinctId: userId,
      posthogProperties: {
        threadId: msg.thread,
        embeddedThreadId: embeddedThread,
      },
    }),
    messages: (
      await Promise.all(
        embedThread.messages
          .slice(
            0,
            embedThread.messages.findIndex((msg) => msg === msgId),
          )
          .map(async (regen) => {
            if (regen.thread === msg.thread) {
              return [
                {
                  role: "user" as const,
                  content: await Promise.all(
                    regen.message.prompt.map(async (prompt) => {
                      if (prompt.role === "text") {
                        return {
                          type: "text" as const,
                          text: prompt.content,
                        };
                      } else if (prompt.role === "image") {
                        const image = await fetchQuery(api.files.getImage, {
                          image: prompt.image,
                        });
                        if (image instanceof FileError) {
                          return null;
                        }
                        return {
                          type: "image" as const,
                          image: image.url,
                        };
                      } else if (prompt.role === "file") {
                        const file = await fetchQuery(api.files.getFile, {
                          file: prompt.file,
                        });
                        if (file instanceof Error) {
                          return null;
                        }
                        return {
                          type: "file" as const,
                          file: file.url,
                          filename: file.filename,
                          mimeType: file.mimeType,
                        };
                      }
                    }),
                  ),
                },
                {
                  role: "assistant" as const,
                  content: regen.message.response
                    .map((resp) => {
                      if (resp.role === "text") {
                        return {
                          type: "text" as const,
                          text: resp.content,
                        };
                      }
                    })
                    .concat([
                      {
                        type: "reasoning" as const,
                        text: regen.message.reasoning,
                      },
                    ]),
                },
              ];
            }
            return [
              {
                role: "user",
                content: regen.message.prompt,
              },
              {
                role: "assistant",
                content: regen.message.response,
              },
            ];
          })
          .concat([
            {
              role: "user" as const,
              content: [
                {
                  type: "text" as const,
                  text: msg.message,
                },
                ...(
                  await Promise.all(
                    msg.files.map(async (data) => {
                      if (data.__tableName === "images") {
                        const image = await fetchQuery(api.files.getImage, {
                          image: data,
                        });
                        if (image instanceof Error) {
                          return null;
                        }
                        return {
                          type: "image" as const,
                          image: image.url,
                        };
                      } else {
                        const file = await fetchQuery(api.files.getFile, {
                          file: data,
                        });
                        if (file instanceof Error) {
                          return null;
                        }
                        return {
                          type: "file" as const,
                          file: file.url,
                          filename: file.filename,
                          mimeType: file.mimeType,
                        };
                      }
                    }),
                  )
                ).filter((file) => file !== null),
              ],
            },
          ]),
      )
    ).flat(),
    onFinish: async (event) => {
      console.log("[MESSAGE][STREAM][FINISH]", event);
      try {
        await fetchMutation(api.messages.regenMessage, {
          msgId,
          threadId: msg.thread,
          embedThreadId: msg.embeddedThread,
          message,
          files: [],
          response: event.text,
          reasoning: event.reasoning,
          userId,
          model,
        });
      } catch (err) {
        console.error("[MESSAGE][MUTATION][ERROR]", err);
      }
    },
    // Close the stream when finished
    onError: async ({ error }) => {
      console.error("[MESSAGE][STREAM][ERROR]", error);
    },
  });
  // const stream = new ReadableStream({
  //   async start(controller) {
  //     try {
  //       console.log("START");

  //       result.

  //       console.log("CLOSING");
  //       controller.close();
  //       console.log(`END: ${await result.finishReason}`);
  //     } catch (err) {
  //       console.error("[MESSAGE][STREAM][START][ERROR]", err);
  //       controller.error(err);
  //     }
  //     console.log("CLOSED");
  //   },
  // });
  console.log("RETURNING STREAM");
  return new Ok(result);
}
