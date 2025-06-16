"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import type { Id } from "convex/_generated/dataModel";
import type { Threads } from "~/server/chat";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ThreadLink({
  thread,
  isActive,
}: {
  thread: Threads;
  isActive: boolean;
}) {
  return (
    <Link
      href={`/chat/${thread._id}`}
      className={`mx-3 my-1 block rounded-xl border border-transparent p-4 no-underline transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_4px_15px_rgba(102,126,234,0.4)]"
          : "bg-white/30 text-gray-600 hover:-translate-y-0.5 hover:bg-white/60 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
      }`}
    >
      <div className="mb-1 text-[15px] font-semibold">{thread.name}</div>
      {thread.description ? (
        <div className="text-[13px] leading-[1.4] opacity-70">
          {thread.description?.text}
        </div>
      ) : (
        <div></div>
      )}
    </Link>
  );
}

export function ThreadsContainer({
  user,
  activeThreadId,
}: {
  user: Id<"users"> | "local";
  activeThreadId: Id<"threads">;
}) {
  const [threadIds, setThreadIds] = useState<Id<"threads">[]>([]);

  useEffect(() => {
    const storedThreads = localStorage.getItem("threads");
    if (storedThreads) {
      setThreadIds(storedThreads.split(",").map((id) => id as Id<"threads">));
    }
  }, []);

  const localThreads = useQuery(api.thread.getLocalThreads, {
    threads: threadIds,
    userId: user,
  }) ?? {
    owner: [],
    canSee: [],
    canSend: [],
  };
  const userThreads = useQuery(api.thread.getThreadsForUser, {
    userId: user,
  }) ?? {
    owner: [],
    canSee: [],
    canSend: [],
  };
  const threads: Threads[] = localThreads.owner
    .concat(localThreads.canSee)
    .concat(localThreads.canSend)
    .concat(userThreads.owner)
    .concat(userThreads.canSee)
    .concat(userThreads.canSend);

  return (
    <div>
      {threads.map((thread, index) => (
        <ThreadLink
          key={index}
          thread={thread}
          isActive={thread._id === activeThreadId}
        />
      ))}
    </div>
  );
}
