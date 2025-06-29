"use client";

import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import type { State } from "./chat";
import React, { memo, useMemo, useState } from "react";
import { EmbeddedThread } from "./EmbeddedThread";
import { ThemeToggle } from "~/components/theme-toggle";
import { Modal } from "./modal";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { PanelRightOpen } from "lucide-react";

export const Thread = memo(function Thread(props: {
  threadId: string;
  state: State | null;
  user: Doc<"users"> | "local";
  perm: "owner" | "canSend" | "canSee";
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isOpen: boolean;
}) {
  const { threadId, state, user, setIsOpen, isOpen } = props;
  console.log("THREAD ID:" + threadId);
  const thread = useQuery(api.thread.getThread, { threadId } as {
    threadId: Id<"threads">;
  });
  const [showModal, setShowModal] = useState(false);
  const [embedId, setEmbedId] = useState<Id<"embeddedThreads"> | null>(
    thread && !(thread instanceof Error)
      ? (thread.defaultThread ?? null)
      : null,
  );

  useMemo(() => {
    if (thread && !(thread instanceof Error)) {
      console.log("THREAD", thread);
      setEmbedId(thread.defaultThread ?? null);
    }
  }, [thread]);

  if (!thread || !embedId) {
    return (
      <div>
        {thread ? (
          <ul>
            {Object.entries(thread).map(([k, v], index) => (
              <li key={index}>
                {k}: {v}
              </li>
            ))}{" "}
          </ul>
        ) : (
          <div></div>
        )}
      </div>
    );
  } else if (thread instanceof Error) {
    return <div>Error: No thread</div>;
  }
  console.log("END THREAD");
  return (
    <div className="flex h-full w-full flex-row">
      <div className="flex h-full max-w-[99%] flex-col bg-gray-50 dark:bg-gray-900">
        {/* Thread Header */}
        <div className="border-b bg-white pr-6 py-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="relative flex items-center">
            {!isOpen ? (
              <button
                aria-label="Open sidebar"
                onClick={() => setIsOpen(true)}
                className="rounded pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <PanelRightOpen />
              </button>
            ) : (
              <></>
            )}
            <button onClick={() => setShowModal(true)}>
              <h1 className="cursor-pointer text-xl font-semibold text-gray-900 hover:underline dark:text-gray-100">
                {thread.name}
              </h1>
              <div className="mt-1 flex cursor-pointer items-center text-sm text-gray-500 hover:underline dark:text-gray-400">
                {thread.description?.text ?? (
                  <span className="text-gray-400 italic">No description</span>
                )}
              </div>
            </button>
            <div className="absolute right-0 flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
        {showModal && (
          <Modal
            userId={user === "local" ? "local" : user._id}
            thread={thread}
            setShowModal={setShowModal}
          />
        )}
        {/* Thread Content */}
        <div className="h-full max-w-full flex-1">
          <EmbeddedThread id={embedId} state={state} setEmbed={setEmbedId} />
        </div>
      </div>
    </div>
  );
});
