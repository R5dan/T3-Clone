import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { NoImage, NoFile } from "../src/server/errors";

export const createImage = mutation({
  args: {
    url: v.string(),
    mimeType: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { url, mimeType, filename } = args;
    const image = await ctx.db.insert("images", {
      url,
      mimeType,
      filename,
    });
    return image;
  },
});

export const addImageToPrompt = mutation({
  args: {
    image: v.id("images"),
    message: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { image, message } = args;
    const msg = await ctx.db.get(message);
    if (!msg) {
      return;
    }
    await ctx.db.patch(message, {
      prompt: [
        {
          role: "image",
          image,
        },
      ],
    });
  },
});

export const getImage = query({
  args: {
    image: v.id("images"),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.image);
    if (!image) {
      return new NoImage(args.image);
    }
    return image;
  },
});

export const createFile = mutation({
  args: {
    url: v.string(),
    mimeType: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.insert("files", {
      url: args.url,
      mimeType: args.mimeType,
      filename: args.filename,
    });
    return file;
  },
});

export const addFileToPrompt = mutation({
  args: {
    url: v.string(),
    mimeType: v.string(),
    filename: v.string(),
    message: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { url, mimeType, filename, message } = args;
    const file = await ctx.db.insert("files", {
      url,
      mimeType,
      filename,
    });
    const msg = await ctx.db.get(message);
    if (!msg) {
      return;
    }
    await ctx.db.patch(message, {
      prompt: msg.prompt.concat([
        {
          role: "file",
          file,
        },
      ]),
    });
  },
});

export const getFile = query({
  args: {
    file: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.file);
    if (!file) {
      return new NoFile(args.file);
    }
    return file;
  },
});
