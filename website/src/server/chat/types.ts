import type { TOOLS } from "./consts";
import { MODELS } from "./models";

import type {Doc} from "convex/_generated/dataModel"

export type TOOL = (typeof TOOLS)[number];
export type MODEL = {
  id: string;
  name: string;
  description: string;
  context_length: number;
  architecture: {
    input_modalities: string[];
    output_modalities: string[];
  };
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
    internal_reasoning: string;
  };
};
export type MODEL_IDS = (typeof MODELS)[number]["id"] | "auto";
export type MODEL_NAMES = (typeof MODELS)[number]["name"] | "Auto";
export const MODEL_IDS_VALUES = MODELS.map((model) => model.id);
export const MODEL_NAMES_VALUES = MODELS.map((model) => model.name);

export type Message = Doc<"messages">;

export type Threads = Doc<"threads">;

export type embeddedThreads = Doc<"embeddedThreads">;

export type notes = Doc<"notes">;

export type users = Doc<"users">;

export type Edit = Doc<"edits">;
