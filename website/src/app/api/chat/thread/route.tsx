import { api } from "../../../../../convex/_generated/api";
import { fetchMutation } from "convex/nextjs";
import { workos } from "~/server/workos";
import { defaultMetadata } from "~/server/workos/defaults";
import { z } from "zod";
import { handleMessage } from "~/server/chat/send";
import { streamText } from "ai";

const JSON = z.object({
  userId: z.string().optional(),
  prompt: z.string(),
  model: z.string(),
});

const SYSTEM_PROMPT =
  "You are a helpful assistant. Your job is to respond with a good title for a thread. You should only respond with the name of the thread, nothing else. The name must be descriptive but strictly less that 35 characters.";

export async function POST(req: Request) {
  console.log("NEW THREAD")
  const res = await req.json();
  const json = JSON.safeParse(res);
  if (json.success === false) {
    console.log(`INVALID JSON: ${json.error.toString()}`)
    return new Response("Invalid JSON", { status: 400 });
  }
  const { prompt, model, userId } = json.data;

//  const user = await workos.userManagement.getUser(userId);

  //let titleModel: string;
  // if (!user) {
  //   titleModel = defaultMetadata.titleModel;
  // } else if (user.metadata.titleModel) {
  //   titleModel = user.metadata.titleModel;
  // } else {
  const titleModel = defaultMetadata.titleModel;
//  }

  const resp = await handleMessage(userId ?? "local", model);
  if (resp.isErr()) {
    console.log(`ERROR: ${resp.error.toString()}`)
    return new Response(resp.error.message, { status: 400 });
  }

  const openRouter = resp.value;

  const thread = await fetchMutation(api.thread.createThread, {
    name: "",
    userId: userId ?? "local",
  });
  let title = "";

  streamText({
    model: openRouter.chat(titleModel),
    system: SYSTEM_PROMPT,
    prompt,

    onChunk: async ({ chunk }) => {
      try {
        if (chunk.type === "text-delta") {
          title += chunk.textDelta;
          await fetchMutation(api.messages.editThreadTitle, {
            threadId: thread,
            name: title,
          });
        }
      } catch (err) {
        console.error(`[MESSAGE][STREAM][ERROR] ${err}`);
      }
    },

    onError: ({ error: err }) => {
      console.error(`[MESSAGE][STREAM][ERROR] ${err}`);
    },
  });

  return Response.json({
    threadId: thread,
  });
}
