import type { Id } from "../../../../../convex/_generated/dataModel";
import { z } from "zod";
import { editMessage } from "~/server/chat/send";
import type { MODEL_IDS } from "~/server/chat";

const SCHEMA = z.object({
  msgId: z.string(),
  threadId: z.string(),
  embedThreadId: z.string(),
  message: z.string(),
  files: z.array(z.string()),
  userId: z.string(),
  model: z.string(),
});

export async function POST(req: Request) {
  const body = await req.json();
  // Expecting: msgId, threadId, embedThreadId, message, files, response, reasoning, userId, model

  const parse = SCHEMA.safeParse(body);

  if (parse.success === false) {
    console.error("Validation error:", parse.error);
    return new Response("Invalid JSON", { status: 400 });
  }

  const { msgId, threadId, embedThreadId, message, files, userId, model } =
    parse.data;

  try {
    const resp = await editMessage(
      message,
      msgId as Id<"messages">,
      threadId as Id<"threads">,
      embedThreadId as Id<"embeddedThreads">,
      userId as "local" | Id<"users">,
      model as MODEL_IDS,
      files as (Id<"files"> | Id<"images">)[],
    );

    if (resp instanceof Error) {
      console.error("Error:", resp);
      return new Response(resp.message, { status: 400 });
    } else if (resp.isErr()) {
      console.error("Error:", resp.error);
      return new Response(resp.error.message, { status: 400 });
    }
    return resp.value.toDataStreamResponse({
      sendReasoning: true,
      sendSources: true,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error?.toString?.() ?? "Unknown error" },
      { status: 500 },
    );
  }
}
