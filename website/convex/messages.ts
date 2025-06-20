import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { NoThread, NoMessage } from "../src/server/errors";

export const getMessages = query({
  args: { embeddedThreadId: v.id("embeddedThreads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.embeddedThreadId);
    if (!thread) {
      return [];
    }
    return (
      await Promise.all(thread.messages.map((id) => ctx.db.get(id)))
    ).filter((msg) => msg !== null);
  },
});

export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) {
      return null;
    }
    return msg;
  },
});

export const addMessage = mutation({
  args: {
    threadId: v.id("threads"),
    message: v.string(),
    files: v.array(v.union(v.id("files"), v.id("images"))),
    reasoning: v.optional(v.string()),
    response: v.string(),
    userId: v.union(v.id("users"), v.literal("local")),
    model: v.string(),
    embeddedThreadId: v.id("embeddedThreads"),
  },
  handler: async (ctx, args) => {
    const [thread, embeddedThread] = await Promise.all([
      ctx.db.get(args.threadId),
      ctx.db.get(args.embeddedThreadId),
    ]);
    if (!thread) {
      return new NoThread(args.threadId);
    }
    if (!embeddedThread) {
      return new NoThread(args.embeddedThreadId);
    }

    const [edit, regen] = await Promise.all([
      ctx.db.insert("edits", {
        msgs: [],
        thread: args.threadId,
      }),
      ctx.db.insert("edits", {
        msgs: [],
        thread: args.threadId,
      }),
    ]);

    const mid = await ctx.db.insert("messages", {
      prompt: [
        {
          role: "text",
          content: args.message,
        },
        ...args.files.map((file) => {
          if (file.__tableName === "images") {
            return {
              role: "image" as const,
              image: file,
            };
          } else {
            return {
              role: "file" as const,
              file: file,
            };
          }
        }),
      ],
      response: [
        {
          role: "text",
          content: args.response,
        },
      ],
      reasoning: args.reasoning,
      hasReasoning: args.reasoning ? true : false,
      model: args.model,
      sender: args.userId,
      pinned: false,

      curEdit: BigInt(0),
      curResp: BigInt(0),
      thread: args.threadId,

      edits: edit,
      regens: regen,
    });

    await Promise.all([
      ctx.db.patch(edit, {
        msgs: [{ thread: args.embeddedThreadId, message: mid }],
      }),
      ctx.db.patch(regen, {
        msgs: [{ thread: args.embeddedThreadId, message: mid }],
      }),
      ctx.db.patch(args.embeddedThreadId, {
        messages: embeddedThread.messages.concat([mid]),
      }),
    ]);
  },
});

export const editMessage = mutation({
  args: {
    msgId: v.id("messages"),
    threadId: v.id("threads"),
    embedThreadId: v.id("embeddedThreads"),
    message: v.string(),
    files: v.array(v.union(v.id("files"), v.id("images"))),
    response: v.string(),
    reasoning: v.optional(v.string()),
    userId: v.union(v.id("users"), v.literal("local")),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const [msg, thread] = await Promise.all([
      ctx.db.get(args.msgId),
      ctx.db.get(args.embedThreadId),
    ]);
    if (!msg) {
      return new NoMessage(args.msgId);
    }
    if (!thread) {
      return new NoThread(args.threadId);
    }
    const [regen, edit] = await Promise.all([
      ctx.db.get(msg.regens),
      ctx.db.get(msg.edits),
    ]);
    if (!edit) {
      return new NoMessage(msg._id);
    }
    if (!regen) {
      return new NoMessage(msg._id);
    }

    const message = await ctx.db.insert("messages", {
      prompt: [
        {
          role: "text",
          content: args.message,
        },
        ...args.files.map((file) => {
          if (file.__tableName === "images") {
            return {
              role: "image" as const,
              image: file,
            };
          } else {
            return {
              role: "file" as const,
              file: file,
            };
          }
        }),
      ],
      response: [
        {
          role: "text",
          content: args.response,
        },
      ],
      reasoning: args.reasoning,
      hasReasoning: args.reasoning ? true : false,
      model: args.model,
      sender: args.userId,
      pinned: false,
      edits: msg.edits,
      regens: regen._id,

      curEdit: BigInt(edit.msgs.length),
      curResp: BigInt(regen.msgs.length),
      thread: args.threadId,
    });

    const [embedThread] = await Promise.all([
      ctx.db.insert("embeddedThreads", {
        thread: args.threadId,
        messages: thread.messages
          .slice(0, thread.messages.indexOf(args.msgId))
          .concat([message]),
      }),
      ctx.db.patch(msg.edits, {
        msgs: edit.msgs.concat([{ thread: args.embedThreadId, message }]),
      }),
      ctx.db.patch(msg.regens, {
        msgs: regen.msgs.concat([{ thread: args.embedThreadId, message }]),
      }),
    ]);

    return embedThread;
  },
});

export const pinMessage = mutation({
  args: {
    threadId: v.id("threads"),
    embedThreadId: v.id("embeddedThreads"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return new NoThread(args.threadId);
    }

    const msg = await ctx.db.get(args.messageId);
    if (!msg) {
      return new NoMessage(args.messageId);
    }

    await Promise.all([
      ctx.db.patch(args.threadId, {
        pinned: thread.pinned.concat({
          message: args.messageId,
          thread: args.embedThreadId,
        }),
      }),
      ctx.db.patch(args.messageId, {
        pinned: true,
      }),
    ]);
  },
});

export const unpinMessage = mutation({
  args: {
    threadId: v.id("threads"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return new NoThread(args.threadId);
    }

    const msg = await ctx.db.get(args.messageId);
    if (!msg) {
      return new NoMessage(args.messageId);
    }

    await Promise.all([
      ctx.db.patch(args.threadId, {
        pinned: thread.pinned.filter((msg) => msg.message !== args.messageId),
      }),
      ctx.db.patch(args.messageId, {
        pinned: false,
      }),
    ]);
  },
});
