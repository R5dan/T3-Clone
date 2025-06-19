"use client";

import { useState } from "react";
import { Highlighter } from "~/server/chat/highlighter";
import { useTheme } from "~/server/utils";
import { FilePreview, ImagePreview } from "~/server/chat/files";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { CompactModelSelector } from "~/components/ui/compact-model-selector";
import { MODELS } from "~/server/chat/models";
import type { MODEL_IDS } from "~/server/chat/types";

export default function Msg(props: {
  prompt: Doc<"messages">["prompt"];
  reasoning: Doc<"messages">["reasoning"];
  response: Doc<"messages">["response"] | null;
  id: string;
  hasReasoning: boolean;
  showSender: boolean;
  sender: string;
  embedThreadId: string;
  setEmbed: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const {
    prompt,
    reasoning,
    response,
    showSender,
    hasReasoning,
    id,
    sender,
    embedThreadId,
    setEmbed,
  } = props;
  const [editing, setEditing] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [theme] = useTheme("dark");
  const waitCount = (reasoning?.match(/wait/g) ?? []).length;
  const [editValue, setEditValue] = useState(() => {
    const text = prompt.find((p) => p.role === "text")?.content ?? "";
    return text;
  });
  const [editModel, setEditModel] = useState<MODEL_IDS>(MODELS[0].id);
  const [editLoading, setEditLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section id={id} className="group mb-6">
      {/* User Message */}
      <div className="mb-4 flex flex-col items-end">
        <div className="max-w-full rounded-lg bg-blue-600 px-4 py-3 text-white shadow-sm">
          {prompt.map((part, index) => {
            if (part.role === "text") {
              return (
                <Highlighter
                  markdown={part.content}
                  theme={theme}
                  key={index}
                />
              );
            } else if (part.role === "image") {
              return <ImagePreview id={part.image} key={index} />;
            } else if (part.role === "file") {
              return <FilePreview id={part.file} key={index} />;
            }
          })}
        </div>
        <div>
          {prompt
            .map((file, index) => {
              if (file.role === "text") {
                return null;
              }
              if (file.role === "image") {
                return <ImagePreview id={file.image} key={index} />;
              } else {
                return <FilePreview id={file.file} key={index} />;
              }
            })
            .filter((file) => file !== null)}
        </div>

        {showSender && (
          <div className="mt-1 text-xs text-gray-500 opacity-0 transition-opacity group-hover:opacity-100">
            {sender}
          </div>
        )}

        <div className="mb-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            disabled={editing || editLoading || regenLoading}
          >
            Edit
          </Button>
        </div>
        {editing && (
          <div className="mb-2 w-full">
            <textarea
              className="w-full rounded border p-2 text-black dark:text-white"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
              disabled={editLoading}
            />
            <div className="my-2">
              <CompactModelSelector
                selectedModel={editModel}
                onModelSelect={setEditModel}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={async () => {
                  setEditLoading(true);
                  setError(null);
                  try {
                    const res = await fetch("/api/chat/edit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        msgId: id,
                        message: editValue,
                        files: [], // TODO: support files if needed
                        response:
                          response?.map((r) => r.content).join("") ?? "",
                        reasoning: reasoning ?? "",
                        userId: sender,
                        model: editModel,
                      }),
                    });
                    const data: { success: boolean; error?: string } =
                      await res.json();
                    if (!data.success)
                      throw new Error(data.error ?? "Failed to edit");
                    setEditing(false);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setEditLoading(false);
                  }
                }}
                disabled={editLoading}
              >
                {editLoading ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
            </div>
            {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
          </div>
        )}
      </div>

      {/* AI Response */}
      <div className="flex flex-col items-start">
        <div className="max-w-full space-y-3">
          {/* Reasoning Section */}
          {hasReasoning && (
            <div className="max-w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 px-4 dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex w-full min-w-0 items-center justify-between py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <span className="truncate">Reasoning</span>
                <span className="ml-2 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  Wait Index:{" "}
                  <span
                    className={
                      waitCount === 0
                        ? "text-green-600 dark:text-green-400"
                        : waitCount < 5
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-red-600 dark:text-red-400"
                    }
                  >
                    {waitCount}
                  </span>
                </span>
              </button>
              {showReasoning && (
                <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-700">
                  <div className="min-w-0 break-words">
                    <Highlighter
                      markdown={reasoning ?? ""}
                      theme={theme}
                      highlight={{
                        wait:
                          waitCount === 0
                            ? "text-green-600 dark:text-green-400"
                            : waitCount < 5
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-red-600 dark:text-red-400",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Response */}
          <div className="rounded-lg px-4 py-3 shadow-sm dark:bg-gray-800">
            {response ? (
              <Highlighter
                markdown={response.map((r) => r.content).join("")}
                theme={theme}
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none"></div>
            )}
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setRegenLoading(true);
                setError(null);
                try {
                  const res = await fetch("/api/chat/regen", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      msgId: id,
                      userId: sender,
                      model: editModel,
                      files: [], // TODO: support files if needed
                    }),
                  });
                  const data: { success: boolean; error?: string } =
                    await res.json();
                  if (!data.success)
                    throw new Error(data?.error ?? "Failed to regenerate");
                  setEditing(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setRegenLoading(false);
                }
              }}
              disabled={editing || regenLoading || editLoading}
            >
              {regenLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="mr-1 h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Regenerating...
                </span>
              ) : (
                "Regenerate"
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
