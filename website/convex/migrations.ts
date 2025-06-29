import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

export const migrateToNewSchema = migrations.define({
  table: "messages",
  migrateOne: async (ctx, doc) => {
    if (!(doc.prompt instanceof Array)) {
      await ctx.db.patch(doc._id, {
        prompt: [
          {
            role: "text",
            content: doc.prompt,
          },
        ],
      });
    }
    if (!(doc.response instanceof Array)) {
      await ctx.db.patch(doc._id, {
        response: [
          {
            role: "text",
            content: doc.response,
          },
        ],
      });
    }
  },
});

export const migrateToFriends = migrations.define({
  table: "users",
  migrateOne: async (ctx, doc) => {
    if (!(doc.friends instanceof Array)) {
      await ctx.db.patch(doc._id, {
        friends: [],
      });
    }
    if (!(doc.blocked instanceof Array)) {
      await ctx.db.patch(doc._id, {
        blocked: [],
      });
    }
    if (!(doc.requestedFriend instanceof Array)) {
      await ctx.db.patch(doc._id, {
        requestedFriend: [],
      });
    }
    if (!(doc.requestingFriend instanceof Array)) {
      await ctx.db.patch(doc._id, {
        requestingFriend: [],
      });
    }
  },
});

export const migrateMetadata = migrations.define({
  table: "users",
  migrateOne: async (ctx, doc) => {
    if (!doc.defaultModel) {
      await ctx.db.patch(doc._id, {
        defaultModel: "",
      });
    }
    if (!doc.titleModel) {
      await ctx.db.patch(doc._id, {
        titleModel: "",
      });
    }
  },
});

export const migrateToTools = migrations.define({
  table: "users",
  migrateOne: async (ctx, doc) => {
    if (!doc.tools) {
      await ctx.db.patch(doc._id, {
        tools: {},
      });
    }
    if (!doc.toolCredentials) {
      await ctx.db.patch(doc._id, {
        toolCredentials: {},
      });
    }
    if (!doc.toolPreferences) {
      await ctx.db.patch(doc._id, {
        toolPreferences: {},
      });
    }
    if (!doc.memories) {
      await ctx.db.patch(doc._id, {
        memories: [],
      });
    }
  },
});

export const runIt = migrations.runner(internal.migrations.migrateToTools);
