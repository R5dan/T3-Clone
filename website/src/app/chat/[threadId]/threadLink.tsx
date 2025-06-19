"use client";

import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Threads } from "~/server/chat";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem("threadSidebarOpen");
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    const storedThreads = localStorage.getItem("threads");
    if (storedThreads) {
      setThreadIds(storedThreads.split(",").map((id) => id as Id<"threads">));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("threadSidebarOpen", String(isOpen));
  }, [isOpen]);

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
  const router = useRouter();
  const threads: Threads[] = localThreads.owner
    .concat(localThreads.canSee)
    .concat(localThreads.canSend)
    .concat(userThreads.owner)
    .concat(userThreads.canSee)
    .concat(userThreads.canSend);

  if (isOpen) {
    return (
      <aside className="flex w-[300px] flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex shrink-0 flex-row border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white px-1 py-5 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
          <button
            aria-label="Close sidebar"
            onClick={() => setIsOpen(false)}
            className="rounded pr-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <PanelRightClose />
          </button>
          <div className="w-full text-center text-xl font-bold text-gray-900 dark:text-gray-100">
            Chats
          </div>
        </div>
        <div className="flex flex-row justify-between overflow-y-auto py-4">
          <div>
            {threads.map((thread, index) => (
              <ThreadLink
                key={index}
                thread={thread}
                isActive={thread._id === activeThreadId}
              />
            ))}
          </div>
          <div className="inset-x-0 bottom-0">
            <button onClick={() => router.push("/auth/login")}>LOGIN</button>
          </div>
        </div>
      </aside>
    );
  } else {
    return (
      <div className="flex h-[68.917px] shrink-0 flex-col gap-2 border-r border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white px-1 py-5 transition-all duration-300 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
        <button
          aria-label="Open sidebar"
          onClick={() => setIsOpen(true)}
          className="rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <PanelRightOpen />
        </button>
      </div>
    );
  }
}
