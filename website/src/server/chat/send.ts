import type { TOOL } from "./types";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { workos } from "~/server/workos";
import { Ok, Err } from "neverthrow";
import { InvalidUserId, NoOpenRouterKey } from "~/server/errors";
import { FREE_MODELS } from "./models";
import type { MODEL_IDS } from "./types";
import { fetchMutation } from "convex/nextjs";
import env from "~/env.js";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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
) {
  const openRouter = await handleMessage(userId, model);
  if (openRouter.isErr()) {
    return openRouter;
  }
  let hasStartedReasoning = false;
  let hasStartedText = false;
  const encoder = new TextEncoder();
  const result = streamText({
    model: openRouter.value.chat(model),
    prompt: message,
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
