import { MODELS } from "./models";
import { z } from "zod";

import type { Doc, Id } from "../../../convex/_generated/dataModel";

export type MODEL = {
  id: MODEL_IDS;
  name: MODEL_NAMES;
  description: string;
  context_length: number;
  architecture: {
    input_modalities:
      | ["text"]
      | ["text", "image"]
      | ["text", "file"]
      | ["text", "image", "file"];
    output_modalities: ["text"];
  };
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
    internal_reasoning: string;
  };
};
export type MODEL_IDS = (typeof MODELS)[number]["id"] | "openrouter/auto";
export type MODEL_NAMES = (typeof MODELS)[number]["name"] | "Auto";
export const MODEL_IDS_VALUES = MODELS.map((model) => model.id);
export const MODEL_NAMES_VALUES = MODELS.map((model) => model.name);

export type Message = Doc<"messages">;

export type Threads = Doc<"threads">;

export type embeddedThreads = Doc<"embeddedThreads">;

export type notes = Doc<"notes">;

export type users = Doc<"users">;

export type Edit = Doc<"edits">;

export const MessageSendBodySchema = z.object({
  threadId: z.string(),
  embeddedThreadId: z.string(),
  message: z.array(
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
  tools: z.array(z.string()),
  model: z.string().refine((val) => true),
});

export type MessageSendBody = {
  threadId: Id<"threads">;
  embeddedThreadId: Id<"embeddedThreads">;
  message: (
    | {
        type: "text";
        text: string;
      }
    | { type: "image"; image: string; mimeType: string; filename: string }
    | { type: "file"; data: string; mimeType: string; filename: string }
  )[];
  tools: string[];
  model: MODEL_IDS;
};
