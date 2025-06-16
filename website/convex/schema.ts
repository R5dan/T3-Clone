import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    prompt: v.string(),
    response: v.string(),
    reasoning: v.optional(v.string()),
    hasReasoning: v.boolean(),
    model: v.string(),

    sender: v.union(v.id("users"), v.literal("local")),
    pinned: v.boolean(),
    edits: v.id("edits"),
    regens: v.id("edits"),

    curEdit: v.int64(),
    curResp: v.int64(),

    thread: v.id("threads"),
  })
    .index("pinned", ["pinned"])
    .index("sender", ["sender"])
    .index("model", ["model"])
    .index("edits", ["edits"])
    .index("regens", ["regens"])
    .index("thread", ["thread"])
    .index("threadAndSender", ["thread", "sender"]),

  edits: defineTable({
    msgs: v.array(
      v.object({
        thread: v.id("embeddedThreads"),
        message: v.id("messages"),
      }),
    ),
    thread: v.id("threads"),
  }).index("thread", ["thread"]),

  threads: defineTable({
    name: v.string(),
    pinned: v.array(
      v.object({
        message: v.id("messages"),
        thread: v.id("embeddedThreads"),
      }),
    ),
    owner: v.union(v.id("users"), v.literal("local")),
    canSee: v.array(v.union(v.id("users"), v.literal("local"))),
    canSend: v.array(v.union(v.id("users"), v.literal("local"))),
    defaultThread: v.optional(v.id("embeddedThreads")),

    description: v.optional(
      v.object({
        text: v.string(),
        updatedAt: v.int64(), // Seconds since epoch
        creator: v.id("users"),
      }),
    ),
  })
    .index("owner", ["owner"])
    .index("name", ["name"])
    .index("owner_and_name", ["owner", "name"]),

  embeddedThreads: defineTable({
    thread: v.optional(v.id("threads")),
    messages: v.array(v.id("messages")),
  }).index("thread", ["thread"]),

  notes: defineTable({
    message: v.string(),
    thread: v.id("threads"),
    creator: v.id("users"),
    updatedAt: v.int64(), // Seconds since epoch
  })
    .index("thread", ["thread"])
    .index("creator", ["creator"])
    .index("updatedAt", ["updatedAt"])
    .index("creator_and_thread", ["creator", "thread"]),

  users: defineTable({
    // unauthenticated
    id: v.string(), // workos id
    owner: v.array(v.id("threads")),
    canSee: v.array(v.id("threads")),
    canSend: v.array(v.id("threads")),
  }).index("id", ["id"]),
});
