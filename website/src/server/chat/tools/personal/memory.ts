import { tool } from "ai";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { z } from "zod";

function store(userId: Id<"users">) {
  return async function tool({ memory }: { memory: string }) {
    await fetchMutation(api.utils.addMemory, {
      userId,
      memory,
    });
  };
}

export async function fetch(userId: Id<"users">) {
  const res = await fetchQuery(api.utils.getMemories, {
    userId,
  });
  if (res instanceof Error) {
    return null;
  }
  return res;
}

export const MemoryTool = (userId: Id<"users">) =>
  tool({
    description:
      "Set a memory for the user so you have access to it in other threads",
    parameters: z.object({
      memory: z.string().describe("The memory to store"),
    }),
    execute: store(userId),
  });
