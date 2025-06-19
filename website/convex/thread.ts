import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { NoThread, InvalidUserId, LocalUser } from "../src/server/errors";

// export const branchThread = mutation({
//   args: { threadId: v.id("threads"), userId: v.id("users") },
//   handler: async (ctx, args) => {
//     const [thread, user] = await Promise.all([
//       ctx.db.get(args.threadId),
//       ctx.db.get(args.userId),
//     ]);
//     if (!thread) {
//       return new NoThread(args.threadId));
//     }
//     if (!user) {
//       return new NoUser(args.userId));
//     }

//     const newThreadId = await ctx.db.insert("threads", {
//       name: thread.name,
//       owner: args.userId,
//       pinned: thread.pinned,
//       canSee: [],
//       canSend: [],
//       description: thread.description,
//     });

//     await Promise.all([
//       ctx.db.patch(args.threadId, {
//         messages: newMsgIds,
//       }),
//       ctx.db.patch(args.userId, {
//         owner: user.owner.concat([newThreadId]),
//       }),
//     ]);

//     return newThreadId;
//   },
// });

export const getThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);

    if (!thread) {
      return new NoThread(args.threadId);
    }

    return thread;
  },
});

export const getUserOwnedThreads = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("threads")
      .withIndex("owner", (q) => q.eq("owner", args.userId))
      .collect();
  },
});

export const getUserSeenThreads = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const threadIds = (await ctx.db.get(args.userId))?.canSee;
    if (!threadIds) {
      return [];
    }
    const threads = [];
    for (const threadId of threadIds) {
      const thread = await ctx.db.get(threadId);
      if (thread) {
        threads.push(thread);
      }
    }
  },
});

export const getUserCanSendThreads = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const threadIds = (await ctx.db.get(args.userId))?.canSend;
    if (!threadIds) {
      return [];
    }
    const threads = [];
    for (const threadId of threadIds) {
      const thread = await ctx.db.get(threadId);
      if (thread) {
        threads.push(thread);
      }
    }
  },
});

export const getThreadsForUser = query({
  args: { userId: v.union(v.id("users"), v.literal("local")) },
  handler: async (ctx, args) => {
    if (args.userId === "local") {
      return {
        owner: [],
        canSee: [],
        canSend: [],
      };
    }
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return {
        owner: [],
        canSee: [],
        canSend: [],
      };
    }

    const canSee = user.canSee;
    const canSend = user.canSend;
    const owned = user.owner;

    const threads: Record<"owner"|"canSee"|"canSend", Array<Doc<"threads">>> = { owner: [], canSee: [], canSend: [] };

    await Promise.all([
      canSee.map(async (threadId) => {
        const thread = await ctx.db.get(threadId);
        if (thread) {
          threads.canSee.push(thread);
        }
      }),
      canSend.map(async (threadId) => {
        const thread = await ctx.db.get(threadId);
        if (thread) {
          threads.canSend.push(thread);
        }
      }),
      owned.map(async (threadId) => {
        const thread = await ctx.db.get(threadId);
        if (thread) {
          threads.owner.push(thread);
        }
      }),
    ]
    );
    
    return threads;
  },
});

export const getLocalThreads = query({
  args: {
    threads: v.array(v.id("threads")),
    userId: v.union(v.id("users"), v.literal("local")),
  },
  handler: async (ctx, args) => {
    const threads: Record<"owner" | "canSee" | "canSend", Doc<"threads">[]> = {
      owner: [],
      canSee: [],
      canSend: [],
    };
    //const user = args.userId === "local" ? null : await ctx.db.get(args.userId);
    await Promise.all(
      args.threads.map(async (threadId) => {
        const thread = await ctx.db.get(threadId);
        if (!thread) {
          return;
        }
        if (thread.owner === args.userId || thread.owner === "local") {
          threads.owner.push(thread);
        } else if (
          thread.canSee.includes(args.userId) ||
          thread.canSee.includes("local")
        ) {
          threads.canSee.push(thread);
        } else if (
          thread.canSend.includes(args.userId) ||
          thread.canSend.includes("local")
        ) {
          threads.canSend.push(thread);
        }
        return;
      }),
    );
    return threads;
  },
});

export const createThread = mutation({
  args: {
    name: v.string(),
    userId: v.union(v.id("users"), v.literal("local")),
  },
  handler: async (ctx, args) => {
    let threadId: Id<"threads">;
    let embeddedThreadId: Id<"embeddedThreads">;
    let user: Doc<"users"> | null | undefined = undefined;
    if (args.userId === "local") {
      [embeddedThreadId, threadId] = await Promise.all([
        ctx.db.insert("embeddedThreads", {
          messages: [],
        }),
        ctx.db.insert("threads", {
          name: args.name,
          owner: args.userId,
          pinned: [],
          canSee: [],
          canSend: [],
        }),
      ]);
    } else {
      [embeddedThreadId, threadId, user] = await Promise.all([
        ctx.db.insert("embeddedThreads", {
          messages: [],
        }),
        ctx.db.insert("threads", {
          name: args.name,
          owner: args.userId,
          pinned: [],
          canSee: [],
          canSend: [],
        }),
        ctx.db.get(args.userId),
      ]);
    }
    if (user) {
      user.owner.push(threadId);
      await Promise.all([
        ctx.db.patch(user._id, { owner: user.owner.concat([threadId]) }),
        ctx.db.patch(embeddedThreadId, {
          thread: threadId,
        }),
        ctx.db.patch(threadId, { defaultThread: embeddedThreadId }),
      ]);
    } else {
      await Promise.all([
        ctx.db.patch(embeddedThreadId, {
          thread: threadId,
        }),
        ctx.db.patch(threadId, { defaultThread: embeddedThreadId }),
      ]);
    }

    return threadId;
  },
});

export const editThreadTitle = mutation({
  args: {
    threadId: v.id("threads"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return new NoThread(args.threadId);
    }

    await ctx.db.patch(args.threadId, {
      name: args.name,
    });
  },
});

export const removeDescription = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return new NoThread(args.threadId);
    }

    await ctx.db.patch(args.threadId, { description: undefined });
  },
});

export const updateDescription = mutation({
  args: {
    threadId: v.id("threads"),
    description: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return new NoThread(args.threadId);
    }

    if (thread.owner !== args.userId) {
      return new InvalidUserId(args.userId);
    }

    await ctx.db.patch(args.threadId, {
      description: {
        text: args.description,
        updatedAt: BigInt(Date.now()),
        creator: args.userId,
      },
    });
  },
});

export const inviteUser = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
    perm: v.union(v.literal("canSee"), v.literal("canSend")),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return new NoThread(args.threadId);
    }

    if (thread.owner !== args.userId) {
      return new InvalidUserId(args.userId);
    }
    if (args.perm === "canSee") {
      await ctx.db.patch(args.threadId, {
        canSee: thread.canSee.concat([args.userId]),
      });
    } else if (args.perm === "canSend") {
      await ctx.db.patch(args.threadId, {
        canSend: thread.canSend.concat([args.userId]),
      });
    }
  },
});

export const removeUser = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return new NoThread(args.threadId);
    }

    if (thread.owner !== args.userId) {
      return new InvalidUserId(args.userId);
    }

    await ctx.db.patch(args.threadId, {
      canSee: thread.canSee.filter((id) => id !== args.userId),
      canSend: thread.canSend.filter((id) => id !== args.userId),
    });
  },
});