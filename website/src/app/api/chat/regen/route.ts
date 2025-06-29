import type { Id } from "../../../../../convex/_generated/dataModel";
import { z } from "zod";
import { regenMessage } from "~/server/chat/send";
import type { MODEL_IDS } from "~/server/chat";

const SCHEMA = z.object({
  msgId: z.string(),
  userId: z.string(),
  model: z.string(),
  embeddedThread: z.string(),
});

export async function POST(req: Request) {
  const body = await req.json();
  // Expecting: msgId, threadId, embedThreadId, message, files, response, reasoning, userId, model

  const parse = SCHEMA.safeParse(body);

  if (parse.success === false) {
    console.error("Validation error:", parse.error);
    return new Response("Invalid JSON", { status: 400 });
  }

  const { msgId, userId, model, embeddedThread } = parse.data;

  try {
    const resp = await regenMessage(
      msgId as Id<"messages">,
      userId as "local" | Id<"users">,
      embeddedThread as Id<"embeddedThreads">,
      model as MODEL_IDS,
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
