"use client";

import { api } from "../../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Threads } from "~/server/chat";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { fetchMutation } from "convex/nextjs";
import React from "react";
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

export const ThreadsContainer = React.memo(function ThreadsContainer({
  user,
  activeThreadId,
  perm,
  setIsOpen,
  isOpen,
}: {
  user: Id<"users"> | "local";
  activeThreadId: Id<"threads"> | null;
    perm: "canSee" | "canSend" | "owner";
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isOpen: boolean;
}) {
  const [threadIds, setThreadIds] = useState<
    Record<Id<"threads">, "owner" | "canSee" | "canSend">
  >({});
  const convexUser = useQuery(api.utils.getUser, {
    userId: user,
  });
  const addThread = useMutation(api.thread.addUserToThreads);

  console.log("ThreadLink render", {
    convexUser,
    threadIds,
    isOpen,
    user,
    activeThreadId,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("threadSidebarOpen");
    setIsOpen(stored === null ? true : stored === "true");
  }, [setIsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("threads");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<
          Id<"threads">,
          "owner" | "canSee" | "canSend"
        >;
        setThreadIds(parsed);
      } catch (e) {
        setThreadIds({});
      }
    }
  }, []);

  useEffect(() => {
    const func = async () => {
      if (!activeThreadId) return;

      if (convexUser) {
        if (
          convexUser.owner.includes(activeThreadId) ||
          convexUser.canSee.includes(activeThreadId) ||
          convexUser.canSend.includes(activeThreadId)
        ) {
          return;
        }
        if (perm === "owner") {
          await addThread({
            userId: convexUser._id,
            threadIds: {
              owner: [activeThreadId],
              canSee: [],
              canSend: [],
            },
          });
        } else if (perm === "canSee") {
          await addThread({
            userId: convexUser._id,
            threadIds: {
              owner: [],
              canSee: [activeThreadId],
              canSend: [],
            },
          });
        } else if (perm === "canSend") {
          await addThread({
            userId: convexUser._id,
            threadIds: {
              owner: [],
              canSee: [],
              canSend: [activeThreadId],
            },
          });
        }
      } else {
        const threads = JSON.parse(
          localStorage.getItem("threads") ?? "{}",
        ) as Record<Id<"threads">, "owner" | "canSee" | "canSend">;
        threads[activeThreadId] = perm;
        localStorage.setItem("threads", JSON.stringify(threads));
      }
    };
    func();
  }, [activeThreadId, convexUser, addThread, perm]);

  useEffect(() => {
    const func = async () => {
      if (!convexUser) return;
      const newOwnedThreads: Id<"threads">[] = [];
      const newSeeThreads: Id<"threads">[] = [];
      const newSendThreads: Id<"threads">[] = [];
      Object.entries(threadIds).forEach(([id, perm]) => {
        if (perm === "owner" && !convexUser.owner.includes(id)) {
          newOwnedThreads.push(id);
        } else if (perm === "canSee" && !convexUser.canSee.includes(id)) {
          newSeeThreads.push(id);
        } else if (perm === "canSend" && !convexUser.canSend.includes(id)) {
          newSendThreads.push(id);
        }
      });
      if (
        newOwnedThreads.length > 0 ||
        newSeeThreads.length > 0 ||
        newSendThreads.length > 0
      ) {
        await fetchMutation(api.thread.addUserToThreads, {
          userId: convexUser._id,
          threadIds: {
            owner: newOwnedThreads,
            canSee: newSeeThreads,
            canSend: newSendThreads,
          },
        });
      }
    };
    func();
  }, [convexUser, threadIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("threads", JSON.stringify(threadIds));
  }, [threadIds]);

  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("threadSidebarOpen", String(isOpen));
  }, [isOpen]);

  const localThreads = useQuery(api.thread.getLocalThreads, {
    threads: Object.keys(threadIds) as Id<"threads">[],
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

  if (isOpen) {
    return (
      <aside className="relative flex h-full w-[300px] flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800">
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
        </div>
        <div className="absolute inset-x-0 bottom-10 h-auto max-h-[5%] w-full px-5 py-5">
          {convexUser ? (
            <button
              className="h-10 w-[90%] cursor-pointer rounded-lg border-2 border-white"
              onClick={() => router.push("/auth/user/settings")}
            >
              Settings
            </button>
          ) : (
            <button
              className="h-10 w-[90%] cursor-pointer rounded-lg border-2 border-white"
              onClick={() => router.push("/auth/login")}
            >
              Login
            </button>
          )}
        </div>
      </aside>
    );
  } else {
    return (<></>
    );
  }
});
