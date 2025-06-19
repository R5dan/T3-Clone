"use client";

import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import type { State } from "./chat";
import React, { useState } from "react";
import { EmbeddedThread } from "./EmbeddedThread";
import { ThemeToggle } from "~/components/theme-toggle";
import { CompactModelSelector } from "~/components/ui/compact-model-selector";
import type { MODEL_IDS } from "~/server/chat/types";
import { Modal } from "./modal";
import type { Id } from "../../../../convex/_generated/dataModel";

export function Thread(props: {
  threadId: string;
  state: State | null;
  selectedModel?: MODEL_IDS;
  onModelSelect?: (model: MODEL_IDS) => void;
  userId: Id<"users">;
}) {
  const { threadId, state, selectedModel, onModelSelect, userId } = props;
  console.log("THREAD ID:" + threadId);
  const thread = useQuery(api.thread.getThread, { threadId } as {
    threadId: Id<"threads">;
  });
  const [showModal, setShowModal] = useState(false);
  // You should have implemented this mutation:
  // const inviteUser = useMutation(api.thread.inviteUser);
  // const addOrUpdateNote = useMutation(api.utils.addOrUpdateNote);

  if (!thread) {
    return <div></div>;
  } else if (thread instanceof Error) {
    return <div>Error: No thread</div>;
  }
  console.log("END THREAD");
  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Thread Header */}
      <div className="border-b bg-white px-6 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowModal(true)}>
            <h1 className="cursor-pointer text-xl font-semibold text-gray-900 hover:underline dark:text-gray-100">
              {thread.name}
            </h1>
            <div className="mt-1 flex cursor-pointer items-center text-sm text-gray-500 hover:underline dark:text-gray-400">
              {thread.description?.text || (
                <span className="text-gray-400 italic">No description</span>
              )}
            </div>
          </button>
          <div className="flex items-center gap-4">
            {/* Model Selector */}
            {selectedModel && onModelSelect && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Model:
                </span>
                <CompactModelSelector
                  selectedModel={selectedModel}
                  onModelSelect={onModelSelect}
                />
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
      {showModal && (
        <Modal userId={userId} thread={thread} setShowModal={setShowModal} />
      )}
      {/* Thread Content */}
      <div className="flex-1 overflow-hidden">
        <EmbeddedThread id={thread.defaultThread} state={state} />
      </div>
    </div>
  );
}
