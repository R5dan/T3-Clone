"use client";

import { memo, useEffect, useState } from "react";
import { Highlighter } from "~/server/chat/highlighter";
import { useTheme } from "~/server/utils";
import { FilePreview, ImagePreview } from "~/server/chat/files";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "~/components/ui/button";
import { CompactModelSelector } from "~/components/ui/compact-model-selector";
import { MODELS } from "~/server/chat/models";
import type { MODEL_IDS } from "~/server/chat/types";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { SquarePen, RefreshCw, Trash } from "lucide-react";

type Props = {
  prompt: Doc<"messages">["prompt"];
  reasoning: Doc<"messages">["reasoning"];
  response: Doc<"messages">["response"] | null;
  id: Id<"messages"> | "latest";
  hasReasoning: boolean;
  showSender: boolean;
  sender: string;
  setEmbed: React.Dispatch<React.SetStateAction<Id<"embeddedThreads"> | null>>;
  editId: Id<"edits"> | null;
  regenId: Id<"edits"> | null;
};

type RegenStateTrue = {
  hasRegens: true;
  canGoBackRegen: boolean;
  canGoForwardRegen: boolean;
  increaseRegen: () => void;
  decreaseRegen: () => void;
};

type RegenStateFalse = {
  hasRegens: false;
};

type RegenState = RegenStateTrue | RegenStateFalse;

type EditStateTrue = {
  hasEdits: true;
  canGoBackEdit: boolean;
  canGoForwardEdit: boolean;
  increaseEdit: () => void;
  decreaseEdit: () => void;
};

type EditStateFalse = {
  hasEdits: false;
};

type EditState = EditStateTrue | EditStateFalse;

type State = RegenState & EditState;

export const Msg = memo(function Msg(props: Props) {
  const {
    prompt,
    reasoning,
    response,
    showSender,
    hasReasoning,
    id,
    sender,
    setEmbed,
    editId,
    regenId,
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
  const [editIndex, setEditIndex] = useState(0);
  const [regenIndex, setRegenIndex] = useState(0);
  const edit = useQuery(api.messages.getEdit, {
    editId,
  });
  const regen = useQuery(api.messages.getEdit, {
    editId: regenId,
  });

  const deleteMessage = useMutation(api.messages.deleteMessage);
  console.log("Msg render", {
    editId,
    regenId,
    prompt,
    response,
    reasoning,
    id,
  });

  // Navigation logic
  const handleEditNav = (dir: number) => {
    if (!edit) return;
    const newIndex = Math.min(
      Math.max(editIndex + dir, 0),
      edit.msgs.length - 1,
    );
    setEditIndex(newIndex);
    if (edit.msgs[newIndex]?.thread) {
      setEmbed(edit.msgs[newIndex].thread);
    }
  };

  const handleRegenNav = (dir: number) => {
    if (!regen) return;
    const newIndex = Math.min(
      Math.max(regenIndex + dir, 0),
      regen.msgs.length - 1,
    );
    setRegenIndex(newIndex);
    if (regen.msgs[newIndex]?.thread) {
      setEmbed(regen.msgs[newIndex].thread);
    }
  };

  // Create state object based on conditions
  let state: State;

  if (id === "latest") {
    state = {
      hasEdits: false,
      hasRegens: false,
    };
  } else if (!edit || !regen) {
    return <div className="h-full w-full">ERROR</div>;
  } else {
    const hasEdits = edit.msgs.length > 1;
    const hasRegens = regen.msgs.length > 1;

    if (hasEdits && hasRegens) {
      state = {
        hasEdits: true,
        hasRegens: true,
        increaseEdit: () => handleEditNav(1),
        decreaseEdit: () => handleEditNav(-1),
        canGoBackEdit: editIndex > 0,
        canGoForwardEdit: editIndex < edit.msgs.length - 1,
        increaseRegen: () => handleRegenNav(1),
        decreaseRegen: () => handleRegenNav(-1),
        canGoBackRegen: regenIndex > 0,
        canGoForwardRegen: regenIndex < regen.msgs.length - 1,
      };
    } else if (hasEdits) {
      state = {
        hasEdits: true,
        hasRegens: false,
        increaseEdit: () => handleEditNav(1),
        decreaseEdit: () => handleEditNav(-1),
        canGoBackEdit: editIndex > 0,
        canGoForwardEdit: editIndex < edit.msgs.length - 1,
      };
    } else if (hasRegens) {
      state = {
        hasEdits: false,
        hasRegens: true,
        increaseRegen: () => handleRegenNav(1),
        decreaseRegen: () => handleRegenNav(-1),
        canGoBackRegen: regenIndex > 0,
        canGoForwardRegen: regenIndex < regen.msgs.length - 1,
      };
    } else {
      state = {
        hasEdits: false,
        hasRegens: false,
      };
    }
  }

  return (
    <section id={id} className="group mb-6">
      {/* User Message */}
      <div className="mb-4 flex flex-col items-end">
        <div className="max-w-[70%] rounded-lg bg-blue-600 px-4 py-3 text-white shadow-sm">
          {editing ? (
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
                      const data = (await res.json()) as {
                        success: boolean;
                        error?: string;
                      };
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
              {error && (
                <div className="mt-1 text-xs text-red-500">{error}</div>
              )}
            </div>
          ) : (
            prompt.map((part, index) => {
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
            })
          )}
        </div>

        {/* Message Controls */}
        <div className="mt-2 flex w-full items-center justify-between text-xs text-gray-500 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-4">
            {/* Edit Navigation */}
            {state.hasEdits && edit && (
              <div className="flex items-center gap-1">
                <button
                  onClick={state.decreaseEdit}
                  disabled={!state.canGoBackEdit}
                  className="rounded px-2 py-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700"
                >
                  ‹
                </button>
                <span className="text-xs">
                  {editIndex + 1}/{edit.msgs.length}
                </span>
                <button
                  onClick={state.increaseEdit}
                  disabled={!state.canGoForwardEdit}
                  className="rounded px-2 py-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700"
                >
                  ›
                </button>
              </div>
            )}

            {/* Regen Navigation */}
            {state.hasRegens && regen && (
              <div className="flex items-center gap-1">
                <button
                  onClick={state.decreaseRegen}
                  disabled={!state.canGoBackRegen}
                  className="rounded px-2 py-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700"
                >
                  ‹
                </button>
                <span className="text-xs">
                  {regenIndex + 1}/{regen.msgs.length}
                </span>
                <button
                  onClick={state.increaseRegen}
                  disabled={!state.canGoForwardRegen}
                  className="rounded px-2 py-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700"
                >
                  ›
                </button>
              </div>
            )}

            {showSender && <div className="text-xs">{sender}</div>}

            <button
              onClick={() => setEditing(true)}
              disabled={editing || editLoading || regenLoading}
              className="rounded p-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700"
            >
              <SquarePen className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Response */}
      <div className="flex max-w-[70%] flex-col items-start">
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
                  <div className="min-w-0 p-3 break-words">
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
          <div className="rounded-lg bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
            {response ? (
              <Highlighter
                markdown={response.map((r) => r.content).join("")}
                theme={theme}
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none animate-pulse"></div>
            )}
          </div>

          {/* Regenerate Button */}
          <div className="mt-2 flex w-full items-center justify-between text-xs text-gray-500 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="rounded p-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700"
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
                  const data = (await res.json()) as {
                    success: boolean;
                    error?: string;
                  };
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
                <RefreshCw className="h-3 w-3" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </button>
            {/* Delete Button */}
            {id === "latest" ? (
              <button></button>
            ) : (
              <button
                className="rounded p-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-700"
                onClick={async () => {
                  await deleteMessage({
                    messageId: id,
                  });
                }}
              >
                <Trash className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
