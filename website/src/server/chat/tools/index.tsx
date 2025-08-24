import type { TOOL } from "./types";
import Search from "./search";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import Personal from "./personal";
import { fetchQuery } from "convex/nextjs";

export const LOCAL_TOOLS: Record<string, TOOL> = {
  search: Search,
};

export const ALL_TOOLS: Record<string, TOOL> = {
  search: Search,
  personal: Personal,
};

function getLocalTools(tools: string[]) {
  const toolsObj: Record<string, TOOL> = {};
  tools.forEach((tool) => {
    const toolCollection = LOCAL_TOOLS[tool];
    if (!toolCollection) {
      return;
    }
    const tools = toolCollection.setup(null);
    Object.entries(tools).forEach(([key, value]) => {
      toolsObj[key] = value;
    });
  });

  return toolsObj;
}

function getLoggedInTools(tools: string[], user: Doc<"users">) {
  const toolsObj: Record<string, Tool> = {};
  tools.forEach((tool) => {
    const toolCollection = ALL_TOOLS[tool];
    if (!toolCollection) {
      return;
    }
    const tools = toolCollection.setup(user);
    Object.entries(tools).forEach(([key, value]) => {
      toolsObj[key] = value;
    });
  });

  return toolsObj;
}

export async function getTools(
  tools: string[],
  userId: Id<"users"> | "local",
): Promise<Record<string, Tool>> {
  if (userId === "local") {
    return getLocalTools(tools);
  }
  const user = await fetchQuery(api.utils.getUser, { userId });

  if (!user) {
    return getLocalTools(tools);
  }

  return getLoggedInTools(tools, user);
}
