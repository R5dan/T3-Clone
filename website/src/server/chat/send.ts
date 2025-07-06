import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  streamText,
  type FilePart,
  type ImagePart,
  type JSONValue,
  type ProviderMetadata,
  type TextPart,
} from "ai";
import { workos } from "~/server/workos";
import { Ok, Err } from "neverthrow";
import {
  FileError,
  InvalidUserId,
  NoOpenRouterKey,
  NoThread,
} from "~/server/errors";
import { FREE_MODELS } from "./models";
import type { MODEL_IDS } from "./types";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import env from "~/env.js";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PostHog } from "posthog-node";
import { withTracing } from "@posthog/ai";
import type { MessageSendBodySchema } from "./types";
import type { z } from "zod";
import { getTools } from "./tools";

type ProviderOptions = Record<string, Record<string, JSONValue>>;

interface ReasoningPart {
  type: "reasoning";
  /**
  The reasoning text.
     */
  text: string;
  /**
  An optional signature for verifying that the reasoning originated from the model.
     */
  signature?: string;
  /**
  Additional provider-specific metadata. They are passed through
  to the provider from the AI SDK and enable provider-specific
  functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;
  /**
  @deprecated Use `providerOptions` instead.
   */
  experimental_providerMetadata?: ProviderMetadata;
}

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

type msgType = z.infer<typeof MessageSendBodySchema.shape.message>;

export async function sendMessage(
  message: msgType,
  thread: Id<"threads">,
  embeddedThread: Id<"embeddedThreads">,
  userId: Id<"users"> | "local",
  tools: string[],
  model: MODEL_IDS,
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

  const toolsObj = await getTools(tools, userId);

  const result = streamText({
    model: withTracing(openRouter.value.chat(model), phClient, {
      posthogDistinctId: userId,
      posthogProperties: {
        threadId: thread,
        embeddedThreadId: embeddedThread,
      },
    }),
    tools: toolsObj,
    messages: (
      await Promise.all(
        msgs.map(async (msg) => {
          const userContent: (TextPart | ImagePart | FilePart)[] = (
            await Promise.all(
              msg.prompt.map(async (prompt) => {
                if (prompt.role === "text") {
                  return {
                    type: "text",
                    text: prompt.content,
                  } satisfies TextPart;
                }

                if (prompt.role === "image") {
                  const image = await fetchQuery(api.files.getImage, {
                    image: prompt.image,
                  });
                  if (image instanceof FileError) return null;
                  return {
                    type: "image",
                    image: image.url,
                    mimeType: image.mimeType,
                  } satisfies ImagePart;
                }

                if (prompt.role === "file") {
                  const file = await fetchQuery(api.files.getFile, {
                    file: prompt.file,
                  });
                  if (file instanceof Error) return null;
                  return {
                    type: "file",
                    data: file.url,
                    filename: file.filename,
                    mimeType: file.mimeType,
                  } satisfies FilePart;
                }

                return null;
              }),
            )
          ).filter((part) => part !== null);

          const assistantContent = [
            ...msg.response
              .map((resp) => {
                if (resp.role === "text") {
                  return {
                    type: "text",
                    text: resp.content,
                  } satisfies TextPart;
                }
                return null;
              })
              .filter((m) => m !== null),

            ...(msg.reasoning
              ? [
                  {
                    type: "reasoning",
                    text: msg.reasoning,
                  } satisfies ReasoningPart,
                ]
              : []),
          ];

          return [
            {
              role: "user" as const,
              content: userContent,
            },
            {
              role: "assistant" as const,
              content: assistantContent,
            },
          ];
        }),
      )
    )
      .flat()
      .concat([
        {
          role: "user" as const,
          content: message,
        },
      ]),
    onFinish: async (event) => {
      console.log("[MESSAGE][STREAM][FINISH]", event);
      try {
        const convexMsg = (
          await Promise.all(
            message.map(async (msg) => {
              if (msg.type === "text") {
                return {
                  role: "text" as const,
                  content: msg.text,
                };
              } else if (msg.type === "image") {
                const image = await fetchMutation(api.files.createImage, {
                  filename: msg.filename,
                  mimeType: msg.mimeType,
                  url: msg.image,
                });
                return {
                  role: "image" as const,
                  image: image,
                } as {
                  role: "image";
                  image: Id<"images">;
                };
              } else if (msg.type === "file") {
                const file = await fetchMutation(api.files.createFile, {
                  filename: msg.filename,
                  mimeType: msg.mimeType,
                  url: msg.data,
                });
                return {
                  role: "file" as const,
                  file,
                } as { role: "file"; file: Id<"files"> };
              }
            }),
          )
        ).filter((msg) => !!msg);
        const msgId = await fetchMutation(api.messages.addMessage, {
          response: event.text,
          model: model,
          threadId: thread,
          embeddedThreadId: embeddedThread,
          userId,
          message: convexMsg,
          reasoning: event.reasoning,
        });

        if (msgId instanceof NoThread) {
          return;
        }

        // phClient.capture({
        //   event: "$ai-generation",
        //   distinctId: msgId,
        //   properties: {
        //     "$ai_trace_id": thread,
        //     "$ai_model": model,
        //     "$ai_provider":
        //   }
        // })
      } catch (err) {
        console.error("[MESSAGE][MUTATION][ERROR]", err);
      }
    },
    // Close the stream when finished
    onError: async ({ error }) => {
      console.error("[MESSAGE][STREAM][ERROR]", error);
    },
    onChunk: async (chunk) => {
      if (chunk.type === "tool-call") {
        console.log("STARTING TOOL STREAM");
        console.log(chunk);
      }
    }
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
  message: msgType,
  msgId: Id<"messages">,
  thread: Id<"threads">,
  embeddedThread: Id<"embeddedThreads">,
  userId: Id<"users"> | "local",
  model: MODEL_IDS,
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

  // @ts-expect-error - fetch is not typed
  const { ip } = (await fetch("/api/utils/ip")).json() as { ip: string };

  const result = streamText({
    model: withTracing(openRouter.value.chat(model), phClient, {
      posthogDistinctId: userId,
      posthogProperties: {
        embeddedThreadId: embeddedThread,
        ip,
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
            const userContent: (TextPart | ImagePart | FilePart)[] = (
              await Promise.all(
                msg.prompt.map(async (prompt) => {
                  if (prompt.role === "text") {
                    return {
                      type: "text",
                      text: prompt.content,
                    } satisfies TextPart;
                  }

                  if (prompt.role === "image") {
                    const image = await fetchQuery(api.files.getImage, {
                      image: prompt.image,
                    });
                    if (image instanceof FileError) return null;
                    return {
                      type: "image",
                      image: image.url,
                      mimeType: image.mimeType,
                    } satisfies ImagePart;
                  }

                  if (prompt.role === "file") {
                    const file = await fetchQuery(api.files.getFile, {
                      file: prompt.file,
                    });
                    if (file instanceof Error) return null;
                    return {
                      type: "file",
                      data: file.url,
                      filename: file.filename,
                      mimeType: file.mimeType,
                    } satisfies FilePart;
                  }

                  return null;
                }),
              )
            ).filter((part) => part !== null);

            const assistantContent = [
              ...msg.response
                .map((resp) => {
                  if (resp.role === "text") {
                    return {
                      type: "text",
                      text: resp.content,
                    } satisfies TextPart;
                  }
                  return null;
                })
                .filter((m) => m !== null),

              ...(msg.reasoning
                ? [
                    {
                      type: "reasoning",
                      text: msg.reasoning,
                    } satisfies ReasoningPart,
                  ]
                : []),
            ];

            return [
              {
                role: "user" as const,
                content: userContent,
              },
              {
                role: "assistant" as const,
                content: assistantContent,
              },
            ];
          }),
      )
    )
      .flat()
      .concat([
        {
          role: "user" as const,
          content: message,
        },
      ]),
    onFinish: async (event) => {
      console.log("[MESSAGE][STREAM][FINISH]", event);
      try {
        await fetchMutation(api.messages.editMessage, {
          msgId,
          threadId: thread,
          embedThreadId: embeddedThread,
          message: (
            await Promise.all(
              message.map(async (part) => {
                if (part.type === "text") {
                  return {
                    role: "text",
                    content: part.text,
                  } as {
                    role: "text";
                    content: string;
                  };
                } else if (part.type === "image") {
                  const imageId = await fetchMutation(api.files.createImage, {
                    url: part.image,
                    mimeType: part.mimeType,
                    filename: part.filename,
                  });
                  return {
                    role: "image",
                    image: imageId,
                  } as {
                    role: "image";
                    image: Id<"images">;
                  };
                } else if (part.type === "file") {
                  const fileId = await fetchMutation(api.files.createFile, {
                    url: part.data,
                    mimeType: part.mimeType,
                    filename: part.filename,
                  });
                  return {
                    role: "file",
                    file: fileId,
                  } as {
                    role: "file";
                    file: Id<"files">;
                  };
                }
              }),
            )
          ).filter((part) => part !== undefined),
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
          .map(async (msgId) => {
            const msg = await fetchQuery(api.messages.getMessage, {
              messageId: msgId,
            });
            if (!msg) {
              return null;
            }
            const userContent: (TextPart | ImagePart | FilePart)[] = (
              await Promise.all(
                msg.prompt.map(async (prompt) => {
                  if (prompt.role === "text") {
                    return {
                      type: "text",
                      text: prompt.content,
                    } satisfies TextPart;
                  }

                  if (prompt.role === "image") {
                    const image = await fetchQuery(api.files.getImage, {
                      image: prompt.image,
                    });
                    if (image instanceof FileError) return null;
                    return {
                      type: "image",
                      image: image.url,
                      mimeType: image.mimeType,
                    } satisfies ImagePart;
                  }

                  if (prompt.role === "file") {
                    const file = await fetchQuery(api.files.getFile, {
                      file: prompt.file,
                    });
                    if (file instanceof Error) return null;
                    return {
                      type: "file",
                      data: file.url,
                      filename: file.filename,
                      mimeType: file.mimeType,
                    } satisfies FilePart;
                  }

                  return null;
                }),
              )
            ).filter((part) => part !== null);

            const assistantContent = [
              ...msg.response
                .map((resp) => {
                  if (resp.role === "text") {
                    return {
                      type: "text",
                      text: resp.content,
                    } satisfies TextPart;
                  }
                  return null;
                })
                .filter((m) => m !== null),

              ...(msg.reasoning
                ? [
                    {
                      type: "reasoning",
                      text: msg.reasoning,
                    } satisfies ReasoningPart,
                  ]
                : []),
            ];

            return [
              {
                role: "user" as const,
                content: userContent,
              },
              {
                role: "assistant" as const,
                content: assistantContent,
              },
            ];
          }),
      )
    )
      .flat()
      .filter((msg) => msg !== null),
    onFinish: async (event) => {
      console.log("[MESSAGE][STREAM][FINISH]", event);
      try {
        await fetchMutation(api.messages.regenMessage, {
          msgId,
          threadId: msg.thread,
          response: event.text,
          reasoning: event.reasoning,
          embedThreadId: embeddedThread,
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
