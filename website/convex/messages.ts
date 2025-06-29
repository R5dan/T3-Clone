import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { NoThread, NoMessage, NoUser, NoDraft, NoEdit, NoRegen } from "../src/server/errors";

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
    message: v.array(
      v.union(
        v.object({
          role: v.literal("text"),
          content: v.string(),
        }),
        v.object({ role: v.literal("image"), image: v.id("images") }),
        v.object({ role: v.literal("file"), file: v.id("files") }),
      ),
    ),
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
      prompt: args.message,
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

    return mid;
  },
});

export const editMessage = mutation({
  args: {
    msgId: v.id("messages"),
    threadId: v.id("threads"),
    embedThreadId: v.id("embeddedThreads"),
    message: v.array(
      v.union(
        v.object({
          role: v.literal("text"),
          content: v.string(),
        }),
        v.object({ role: v.literal("image"), image: v.id("images") }),
        v.object({ role: v.literal("file"), file: v.id("files") }),
      ),
    ),
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
      ctx.db.insert("edits", {
        msgs: [],
        thread: args.threadId,
      }),
      ctx.db.get(msg.edits),
    ]);
    if (!edit) {
      return new NoMessage(msg._id);
    }
    if (!regen) {
      return new NoMessage(msg._id);
    }

    const message = await ctx.db.insert("messages", {
      prompt: args.message,
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
      regens: regen,

      curEdit: BigInt(edit.msgs.length),
      curResp: BigInt(0),
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
        msgs: [{ thread: args.embedThreadId, message }],
      }),
    ]);

    return embedThread;
  },
});

export const regenMessage = mutation({
  args: {
    threadId: v.id("threads"),
    embedThreadId: v.id("embeddedThreads"),
    msgId: v.id("messages"),
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
      ctx.db.insert("edits", {
        msgs: [],
        thread: args.threadId,
      }),
    ]);
    if (!edit) {
      return new NoMessage(msg._id);
    }
    if (!regen) {
      return new NoMessage(msg._id);
    }

    const message = await ctx.db.insert("messages", {
      prompt: msg.prompt,
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

      curEdit: BigInt(0),
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
        msgs: [{ thread: args.embedThreadId, message }],
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

export const getEdit = query({
  args: { editId: v.union(v.id("edits"), v.null()) },
  handler: async (ctx, args) => {
    if (args.editId === null) {
      return null;
    }
    const edit = await ctx.db.get(args.editId);
    if (!edit) {
      return null;
    }
    return edit;
  },
});

export const getUserDrafts = query({
  args: { userId: v.union(v.id("users"), v.literal("local")) },
  handler: async (ctx, args) => {
    return (
      await ctx.db.query("drafts").withIndex("user", (q) => q.eq("user", args.userId)).collect()
    )
  }
});

export const getThreadDrafts = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return (
      await ctx.db.query("drafts").withIndex("thread", (q) => q.eq("thread", args.threadId)).collect()
    )
  }
});

export const getThreadUserDrafts = query({
  args: { threadId: v.id("threads"), userId: v.union(v.id("users"), v.literal("local")) },
  handler: async (ctx, args) => {
    return (
      await ctx.db.query("drafts").withIndex("threadAndUser", (q) => q.eq("thread", args.threadId).eq("user", args.userId)).collect()
    
    )
  }
});

export const editDraft = mutation({
  args: {
    draftId: v.id("drafts"),
    message: v.array(
      v.union(
        v.object({
          role: v.literal("text"),
          content: v.string(),
        }),
        v.object({ role: v.literal("image"), image: v.id("images") }),
        v.object({ role: v.literal("file"), file: v.id("files") }),
      ),
    ),
    model: v.string(),
    userId: v.union(v.id("users"), v.literal("local")),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      return new NoDraft(args.draftId);
    }
    const [user] = args.userId === "local" ? "local" : await Promise.all([
      ctx.db.get(args.userId),
    ]);
    if (!user) {
      return new NoUser(args.userId);
    }
    await ctx.db.patch(args.draftId, {
      message: args.message,
      model: args.model,
      user: args.userId,
    });
  },
});

export const createDraft = mutation({
  args: {
    threadId: v.id("threads"),
    message: v.array(
      v.union(
        v.object({
          role: v.literal("text"),
          content: v.string(),
        }),
        v.object({ role: v.literal("image"), image: v.id("images") }),
        v.object({ role: v.literal("file"), file: v.id("files") }),
      ),
    ),
    model: v.string(),
    userId: v.union(v.id("users"), v.literal("local")),
  },
  handler: async (ctx, args) => {
    const [thread, user] = await Promise.all([
      ctx.db.get(args.threadId),
      (args.userId === "local" ? Promise.resolve("local") : ctx.db.get(args.userId)),
    ]);
    if (!thread) {
      return new NoThread(args.threadId);
    }
    if (!user) {
      return new NoUser(args.userId);
    }
    await ctx.db.insert("drafts", {
      thread: args.threadId,
      message: args.message,
      model: args.model,
      user: args.userId,
    });
  },
});

export const updateDraft = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
    message: v.array(
      v.union(
        v.object({
          role: v.literal("text"),
          content: v.string(),
        }),
        v.object({ role: v.literal("image"), image: v.id("images") }),
        v.object({ role: v.literal("file"), file: v.id("files") }),
      ),
    ),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.query("drafts").withIndex("threadAndUser", (q) => q.eq("thread", args.threadId).eq("user", args.userId)).first();
    if (!draft) {
      await ctx.db.insert("drafts", {
        thread: args.threadId,
        message: args.message,
        model: args.model,
        user: args.userId,
      });
    } else {
      await ctx.db.patch(draft._id, {
        message: args.message,
        model: args.model,
      });
    }
  }
});

export const deleteDraft = mutation({
  args: { draftId: v.id("drafts") },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      return new NoDraft(args.draftId);
    }
    await ctx.db.delete(args.draftId);
  },
});

export const deleteEdit = mutation({
  args: { editId: v.id("edits") },
  handler: async (ctx, args) => {
    const edit = await ctx.db.get(args.editId);
    if (!edit) {
      return new NoEdit(args.editId);
    }
    await ctx.db.delete(args.editId);
  },
});

export const deleteRegen = mutation({
  args: { regenId: v.id("edits") },
  handler: async (ctx, args) => {
    const regen = await ctx.db.get(args.regenId);
    if (!regen) {
      return new NoRegen(args.regenId);
    }
    await ctx.db.delete(args.regenId);
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) {
      return new NoMessage(args.messageId);
    }
    const [edit, regen] = await Promise.all([
      ctx.db.get(msg.edits),
      ctx.db.get(msg.regens),
    ]);
    if (!edit) {
      return new NoEdit(msg._id);
    }
    if (!regen) {
      return new NoRegen(msg._id);
    }

    await Promise.all([
      ctx.db.delete(args.messageId),
      regen.msgs.length === 1 ? ctx.db.delete(regen._id) : ctx.db.patch(regen._id, { msgs: regen.msgs.filter((msg) => msg.message !== args.messageId) }),
      edit.msgs.length === 1 ? ctx.db.delete(edit._id) : ctx.db.patch(edit._id, { msgs: edit.msgs.filter((msg) => msg.message !== args.messageId) }),
    ]);
  },
});