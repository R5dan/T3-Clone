import { withAuth } from "@workos-inc/authkit-nextjs";
import { sendMessage } from "~/server/chat";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  type MessageSendBody,
  MessageSendBodySchema,
} from "~/server/chat/types";
import { NextResponse } from "next/server";
new NextResponse()
export async function POST(req: Request) {
  console.log("POST: New message");
  const json = await req.json();
  console.log("JSON:", json);
  const parsedJson = MessageSendBodySchema.safeParse(json);

  if (parsedJson.success === false) {
    console.error("Validation error:", parsedJson.error);
    return new Response("Invalid JSON", { status: 400 });
  }

  const user = await withAuth();

  const { threadId, embeddedThreadId, message, tools, model } =
    parsedJson.data as MessageSendBody;

  console.log("CLEARED PARSING");

  const msgRes = await sendMessage(
    message,
    threadId,
    embeddedThreadId,
    (user.user?.metadata.userId ?? "local") as "local" | Id<"users">,
    tools,
    model,
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
