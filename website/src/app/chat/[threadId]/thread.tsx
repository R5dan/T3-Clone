"use client";

import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import type { State } from "./chat";
import React from "react";
import { EmbeddedThread } from "./EmbeddedThread";
import { ThemeToggle } from "~/components/theme-toggle";
import { CompactModelSelector } from "~/components/ui/compact-model-selector";
import type { MODEL_IDS } from "~/server/chat/types";
import type { Id } from "../../../../convex/_generated/dataModel";

export function Thread(props: { 
  threadId: string; 
  state: State | null;
  selectedModel?: MODEL_IDS;
  onModelSelect?: (model: MODEL_IDS) => void;
}) {
  const { threadId, state, selectedModel, onModelSelect } = props;
  console.log("THREAD ID:" + threadId);
  const thread = useQuery(api.thread.getThread, { threadId } as { threadId: Id<"threads">});
  if (!thread) {
    return <div></div>
  } else if (thread instanceof Error) {
    return <div>Error: No thread</div>;
  }
  console.log("END THREAD");
  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Thread Header */}
      <div className="border-b bg-white px-6 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {thread.name}
            </h1>
            <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
              <button>{thread.owner}</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Model Selector */}
            {selectedModel && onModelSelect && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Model:</span>
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

      {/* Thread Content */}
      <div className="flex-1 overflow-hidden">
        <EmbeddedThread id={thread.defaultThread} state={state} />
      </div>
    </div>
  );
}
