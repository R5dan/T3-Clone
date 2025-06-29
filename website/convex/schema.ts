import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    prompt: v.array(
      v.union(
        v.object({
          role: v.literal("text"),
          content: v.string(),
        }),
        v.object({ role: v.literal("image"), image: v.id("images") }),
        v.object({ role: v.literal("file"), file: v.id("files") }),
      ),
    ),
    response: v.array(
      v.union(
        v.object({
          role: v.literal("text"),
          content: v.string(),
        }),
      ),
    ),
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

  drafts: defineTable({
    thread: v.id("threads"),
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
    user: v.union(v.id("users"), v.literal("local")),
  })
    .index("user", ["user"])
    .index("thread", ["thread"])
    .index("threadAndUser", ["thread", "user"]),

  images: defineTable({
    url: v.string(),
    mimeType: v.string(),
    filename: v.optional(v.string()),
  }),

  files: defineTable({
    url: v.string(),
    mimeType: v.string(),
    filename: v.string(),
  }),

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
    email: v.string(),
    friends: v.array(v.id("users")),
    blocked: v.array(v.id("users")),
    requestedFriend: v.array(v.id("users")),
    requestingFriend: v.array(v.id("users")),

    openRouterKey: v.optional(v.string()),
    defaultModel: v.string(),
    titleModel: v.string(),

    memories: v.array(v.string()),
    tools: v.record(v.string(), v.array(v.string())),
    toolCredentials: v.object({
      serpapi: v.optional(v.string()),
      exa: v.optional(v.string()),
      google: v.optional(v.string()),
    }),
    toolPreferences: v.object({
      search: v.optional(v.array(v.union(v.literal("google"), v.literal("duckduckgo"), v.literal("serpapi"), v.literal("exa")))),
    })
  })
    .index("id", ["id"])
    .index("email", ["email"]),
});
