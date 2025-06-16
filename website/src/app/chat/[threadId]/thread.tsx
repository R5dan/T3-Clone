"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import type { State } from "./chat";
import React from "react";
import { EmbeddedThread } from "./EmbeddedThread";
import { ThemeToggle } from "~/components/theme-toggle";

export function Thread(props: { threadId: string; state: State | null }) {
  const { threadId, state } = props;
  console.log("THREAD ID:" + threadId);
  const thread = useQuery(api.thread.getThread, { threadId });
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
          {/* <ThemeToggle /> */}
          <ThemeToggle />
        </div>
      </div>

      {/* Thread Content */}
      <div className="flex-1 overflow-hidden">
        <EmbeddedThread id={thread.defaultThread} state={state} />
      </div>
    </div>
  );
}
