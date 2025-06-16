"use client";

import { useState } from "react";
import { Highlighter } from "~/server/chat/highlighter";
import { useTheme } from "~/server/utils";

export default function Msg(props: {
  prompt: string;
  reasoning: string;
  response: string;
  id: string;
  hasReasoning: boolean;
  showSender: boolean;
  sender: string;
}) {
  const { prompt, reasoning, response, showSender, hasReasoning, id, sender } =
    props;
  const [editing, setEditing] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [theme] = useTheme("dark");
  console.log("END MSG");
  return (
    <section id={id} className="group mb-6">
      {/* User Message */}
      <div className="mb-4 flex flex-col items-end">
        <div className="max-w-[90%] rounded-lg bg-blue-600 px-4 py-3 text-white shadow-sm">
          <Highlighter markdown={prompt} theme={theme} />
        </div>
        {showSender && (
          <div className="mt-1 text-xs text-gray-500 opacity-0 transition-opacity group-hover:opacity-100">
            {sender}
          </div>
        )}
      </div>

      {/* AI Response */}
      <div className="flex flex-col items-start">
        <div className="max-w-[90%] space-y-3">
          {/* Reasoning Section */}
          {hasReasoning && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-2 flex items-center justify-between">
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  <span>Reasoning</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    Wait Index:{" "}
                    <span
                      className={
                        (new RegExp("wait", "g").exec(reasoning) ?? [])
                          .length === 0
                          ? "text-green-600 dark:text-green-400"
                          : (new RegExp("wait", "g").exec(reasoning) ?? [])
                                .length < 5
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-red-600 dark:text-red-400"
                      }
                    >
                      {(new RegExp("wait", "g").exec(reasoning) ?? []).length}
                    </span>
                  </span>
                </button>
              </div>
              {showReasoning && (
                <Highlighter markdown={reasoning} theme={theme} />
              )}
            </div>
          )}
          {/* Response */}
          <div className="rounded-lg px-4 py-3 shadow-sm dark:bg-gray-800">
            {response ? (
              <Highlighter markdown={response} theme={theme} />
            ) : (
              <div className="prose dark:prose-invert max-w-none"></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
