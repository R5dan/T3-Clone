import { WorkOS } from "@workos-inc/node";
import env from "~/env.js";
import type { MODEL_IDS } from "../chat/types";

export const workos = new WorkOS(env.WORKOS_API_KEY)

export type Metadata = {
  userId: string; // Convex ID
  openRouterKey: string;
  defaultModel: MODEL_IDS;
  titleModel: MODEL_IDS;
};

