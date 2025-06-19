import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getNotes = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return [];
    }

    return await ctx.db
      .query("notes")
      .withIndex("thread", (q) => q.eq("thread", args.threadId))
      .collect();
  },
});

export const getUserOwnedNotes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("creator", (q) => q.eq("creator", args.userId))
      .collect();
  },
});

export const getUserThreadNotes = query({
  args: { userId: v.id("users"), threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("creator_and_thread", (q) =>
        q.eq("creator", args.userId).eq("thread", args.threadId),
      )
      .collect();

    return notes;
  },
});

export const createNote = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.insert("notes", {
      message: args.note,
      thread: args.threadId,
      creator: args.userId,
      updatedAt: BigInt(Date.now()),
    });
    return note;
  },
});

export const createOrEditNote = mutation({
  args: {
    userId: v.id("users"),
    note: v.string(),
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const posNote = await ctx.db
      .query("notes")
      .withIndex("creator_and_thread", (q) =>
        q.eq("creator", args.userId).eq("thread", args.threadId),
      )
      .first();
    if (posNote) {
      await ctx.db.patch(posNote._id, {
        message: args.note,
        updatedAt: BigInt(Date.now()),
      });
      return posNote;
    }
    const note = await ctx.db.insert("notes", {
      message: args.note,
      thread: args.threadId,
      creator: args.userId,
      updatedAt: BigInt(Date.now()),
    });
    return note;
  },
});

export const editNote = mutation({
  args: {
    noteId: v.id("notes"),
    userId: v.id("users"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      return new Error("Note not found");
    }
    if (note.creator !== args.userId) {
      return new Error("Not authorized");
    }
    await ctx.db.patch(args.noteId, {
      message: args.note,
      updatedAt: BigInt(Date.now()),
    });
  },
});

export const addUser = mutation({
  args: { userId: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.insert("users", {
      id: args.userId,
      owner: [],
      canSee: [],
      canSend: [],
      email: args.email,
    });

    return user;
  },
});

export const getUser = query({
  args: { userId: v.id("users"), email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user;
  },
});

export const getUserFromWorkOS = query({
  args: { userId: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      // @ts-expect-error wont be null
      .withIndex("id", (q) => q.eq("id", args.userId))
      .first();
    return user;
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    return user;
  },
});