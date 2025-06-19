"use client";

import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import type { State } from "./chat";
import React, { useState } from "react";
import { EmbeddedThread } from "./EmbeddedThread";
import { ThreadsContainer } from "./threadLink";
import { ThemeToggle } from "~/components/theme-toggle";
import { Modal } from "./modal";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export function Thread(props: {
  threadId: string;
  state: State | null;
  user: Doc<"users"> | "local";
}) {
  const { threadId, state, user } = props;
  console.log("THREAD ID:" + threadId);
  const thread = useQuery(api.thread.getThread, { threadId } as {
    threadId: Id<"threads">;
  });
  const [showModal, setShowModal] = useState(false);
  const [embedId, setEmbedId] = useState((thread && !(thread instanceof Error)) ? thread.defaultThread : null);

  if (!thread || !embedId) {
    return <div></div>;
  } else if (thread instanceof Error) {
    return <div>Error: No thread</div>;
  }
  console.log("END THREAD");
  return (
    <div className="flex flex-row">
      <ThreadsContainer user={user?.id ?? "local"} activeThreadId={threadId} />
      <div className="flex h-full max-w-full flex-col bg-gray-50 dark:bg-gray-900">
        {/* Thread Header */}
        <div className="border-b bg-white px-6 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
        {showModal && (
          <Modal
            userId={user?._id ?? "local"}
            thread={thread}
            setShowModal={setShowModal}
          />
        )}
        {/* Thread Content */}
        <div className="flex-1 overflow-hidden">
          <EmbeddedThread id={embedId} state={state} setEmbed={setEmbedId} />
        </div>
      </div>
    </div>
  );
}
