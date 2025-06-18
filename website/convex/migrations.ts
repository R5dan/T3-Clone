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

export const runIt = migrations.runner(internal.migrations.migrateToNewSchema);