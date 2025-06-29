import { fetchQuery } from "convex/nextjs";
import { Page as Chat } from "./chat";
import { api } from "../../../../convex/_generated/api";
import { withAuth } from "@workos-inc/authkit-nextjs";
import type { Id } from "../../../../convex/_generated/dataModel";
import { redirect } from "next/navigation";
import type { Doc } from "../../../../convex/_generated/dataModel";

async function Safety({ threadId }: { threadId: Id<"threads"> }): Promise<{
  convexUser: Doc<"users"> | null;
  perm: "owner" | "canSend" | "canSee";
}> {
  const [{ user }, thread] = await Promise.all([
    withAuth(),
    fetchQuery(api.thread.getThread, { threadId }),
  ]);

  if (!thread || thread instanceof Error) {
    console.log("No thread found or error:", thread);
    redirect("/chat");
  }

  // Authenticated user: get Convex user and check permissions
  const convexUser = user
    ? await fetchQuery(api.utils.getUserFromWorkOS, {
        userId: user.id,
      })
    : null;
  const userId = convexUser?._id;

  if (userId) {
    if (thread.owner === userId) {
      return { convexUser, perm: "owner" };
    }
    if (thread.canSend?.includes(userId)) {
      return { convexUser, perm: "canSend" };
    }
    if (thread.canSee?.includes(userId)) {
      return { convexUser, perm: "canSee" };
    }
  }
  if (thread.owner === "local") {
    return { convexUser: convexUser, perm: "owner" };
  } 
  console.log("Authenticated user, but no permission:", { userId, thread });
  redirect("/chat");
}

export default async function Page({
  params,
}: {
  params: Promise<{ threadId?: string[] }>;
}) {
  const { threadId } = await params;
  const newThreadId =
    Array.isArray(threadId) && threadId.length > 0
      ? (threadId[0] as Id<"threads">)
      : undefined;

  console.log(`threadId: ${newThreadId}`);
  console.log("Rendering Chat Page", { newThreadId, threadId });

  if (newThreadId) {
    const { convexUser, perm } = await Safety({
      threadId: newThreadId,
    });

    return <Chat threadId={newThreadId} convexUser={convexUser} perm={perm} />;
  }

  const { user } = await withAuth();
  const convexUser = user
    ? await fetchQuery(api.utils.getUserFromWorkOS, {
        userId: user.id,
      })
    : null;

  return <Chat threadId={newThreadId} convexUser={convexUser} perm="owner" />;
}
