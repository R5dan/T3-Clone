import type { Tool } from "ai";
import React from "react";
import { Brain, Search } from "lucide-react";

import { SearchSetup } from "./search";
import { api } from "convex/_generated/api";
import type { Doc, Id } from "convex/_generated/dataModel";
import { MemoryTool } from "./memory";
import { fetchQuery } from "convex/nextjs";

export const LOCAL_TOOLS: Record<string, {
  icon: React.ReactNode;
  description: string;
  setup: (user: null) => Record<string, Tool>;
}> = {
  search: {
    icon: <Search />,
    description: "Search the web",
    setup: SearchSetup,
  }
}

export const ALL_TOOLS: Record<string, {
  icon: React.ReactNode;
  description: string;
  setup: (user: Doc<"users">) => Record<string, Tool>;
}> = {
  search: {
    icon: <Search />,
    description: "Search the web",
    setup: SearchSetup,
  },
  memory: {
    icon: <Brain />,
    description: "Let the AI remember things across threads",
    setup: (user: Doc<"users">) => {
      return {
        memory: MemoryTool(user._id)
      }
    },
  }
}

function getLocalTools(tools: string[]) {
  const toolsObj: Record<string, Tool> = {};
  tools.forEach((tool) => {
    const toolCollection = LOCAL_TOOLS[tool];
    if (!toolCollection) {
      return;
    }
    const tools = toolCollection.setup(null);
    Object.entries(tools).forEach(([key, value]) => {
      toolsObj[key] = value;
    });
  })

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

export async function getTools(tools: string[], userId: Id<"users"> | "local"): Promise<Record<string, Tool>> {
  if (userId === "local") {
    return getLocalTools(tools);
  }
  const user = await fetchQuery(api.utils.getUser, {userId});

  if (!user) {
    return getLocalTools(tools);
  }

  return getLoggedInTools(tools, user);
}