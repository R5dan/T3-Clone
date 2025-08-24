import { api } from "../../../../../convex/_generated/api";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { DEFAULT_TITLE_MODEL } from "~/server/workos/defaults";
import { z } from "zod";
import { handleMessage } from "~/server/chat/send";
import { streamObject } from "ai";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import type { MODEL_IDS } from "~/server/chat";

const JSON = z.object({
  userId: z.string().optional(),
  prompt: z.array(
    z.union([
      z.object({
        type: z.literal("text"),
        text: z.string(),
      }),
      z.object({
        type: z.literal("image"),
        image: z.string(),
        mimeType: z.string(),
        filename: z.string(),
      }),
      z.object({
        type: z.literal("file"),
        data: z.string(),
        mimeType: z.string(),
        filename: z.string(),
      }),
    ]),
  ),
});

const SYSTEM_PROMPT =
  "You are a helpful assistant. Your job is to respond with a good title for a thread. You should only respond with the name of the thread, nothing else. The name must be descriptive but strictly less that 35 characters.";

export async function POST(req: Request) {
  console.log("NEW THREAD");
  const res = await req.json();
  const json = JSON.safeParse(res);
  if (json.success === false) {
    console.log(`INVALID JSON: ${json.error.toString()}`);
    return new Response("Invalid JSON", { status: 400 });
  }
  const { prompt, userId } = json.data;

  let convexUser: Doc<"users"> | undefined | null;
  if (!userId) {
    convexUser = null;
  } else {
    convexUser = await fetchQuery(api.utils.getUserFromWorkOS, {
      userId,
    });
  }

  let titleModel: MODEL_IDS;
  if (!convexUser) {
    titleModel = DEFAULT_TITLE_MODEL;
  } else {
    titleModel = convexUser.titleModel as MODEL_IDS;
  }

  const resp = await handleMessage(userId ?? "local", titleModel);
  if (resp.isErr()) {
    console.log(`ERROR: ${resp.error.toString()}`);
    return new Response(resp.error.message, { status: 400 });
  }

  const openRouter = resp.value;
  console.log("OPENROUTER", openRouter);
  const threadId = await fetchMutation(api.thread.createThread, {
    name: "Unnamed Thread",
    userId: (convexUser?._id ?? "local"),
  });
  const thread = await fetchQuery(api.thread.getOptionalThread, { threadId });
  if (!thread || thread instanceof Error) {
    console.log("ERROR: THREAD NOT FOUND");
    return new Response("Thread not found", { status: 400 });
  }
  const embeddedThreadId = thread.defaultThread;

  streamObject({
    model: openRouter.chat(titleModel),
    system: SYSTEM_PROMPT,
    prompt: prompt
      .map((part) => {
        if (part.type === "text") {
          return part.text;
        }
      })
      .join(""),
    schema: z.object({
      title: z.string(),
    }),

    onError: async (error) => {
      await fetchMutation(api.thread.editThreadTitle, {
        threadId: thread._id,
        name: "No title: Error",
      });
    },

    onFinish: async (data) => {
      await fetchMutation(api.thread.editThreadTitle, {
        threadId: thread._id,
        name: data.object?.title ?? "No title",
      });
    },
  });

  return Response.json({
    threadId,
    embeddedThreadId,
  });
}
