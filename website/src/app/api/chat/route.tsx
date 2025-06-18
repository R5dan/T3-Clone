// import { withAuth } from "@workos-inc/authkit-nextjs";
import { sendMessage, type MODEL, type MODEL, type MODEL_IDS } from "~/server/chat";
import { z } from "zod";
import { TOOLS } from "~/server/chat/consts";
import type { Id } from "../../../../convex/_generated/dataModel";

const chatSchema = z.object({
  threadId: z.string(),
  embeddedThreadId: z.string(),
  message: z.string(),
  tools: z.record(z.enum(TOOLS), z.boolean()),
  model: z.string(),
  files: z.array(z.string()),
});

export async function POST(req: Request) {
  console.log("POST: New message");
  const json = await req.json();
  const parsedJson = chatSchema.safeParse(json);

  if (parsedJson.success === false) {
    console.error("Validation error:", parsedJson.error);
    return new Response("Invalid JSON", { status: 400 });
  }

  // if (!user) {
  //   return new Response("Unauthenticated", { status: 401 });
  // }

  const { threadId, embeddedThreadId, message, tools, model, files } = parsedJson.data;

  console.log("CLEARED PARSING");

  const msgRes = await sendMessage(
    message,
    threadId as Id<"threads">,
    embeddedThreadId as Id<"embeddedThreads">,
    "local",
    tools as Record<(typeof TOOLS)[number], boolean>,
    model as MODEL_IDS,
    files as (Id<"files"> | Id<"images">)[],
  );

  console.log("CLEARED SEND");

  if (msgRes.isErr()) {
    console.error("Error:", msgRes.error);
    return new Response(msgRes.error.message, { status: 400 });
  }

  console.log("RETURNING RESPONSE");

  return msgRes.value.toDataStreamResponse({
    sendReasoning: true,
    sendSources: true,
  });
}
console.log("CLOSING");
