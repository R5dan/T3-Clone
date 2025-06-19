"use client";

import { api } from "../../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import type { State } from "./chat";
import React, { useState, useEffect } from "react";
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
  userId: Id<"users">;
}) {
  const { threadId, state, selectedModel, onModelSelect, userId } = props;
  console.log("THREAD ID:" + threadId);
  const thread = useQuery(api.thread.getThread, { threadId } as {
    threadId: Id<"threads">;
  });
  const [showModal, setShowModal] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [description, setDescription] = useState(
    ((thread && !(thread instanceof Error)) ? thread.description?.text : "") ?? "",
  );
  const [note, setNote] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const inviteUser = useMutation(api.thread.inviteUser);
  const [perm, setPerm] = useState<"canSee" | "canSend">("canSee");

  // Convex hooks
  const updateDescription = useMutation(api.thread.updateDescription);
  // You should have implemented this mutation:
  // const inviteUser = useMutation(api.thread.inviteUser);
  // const addOrUpdateNote = useMutation(api.utils.addOrUpdateNote);
  const userNotes = useQuery(
    api.utils.getUserThreadNotes,
    thread && !(thread instanceof Error) ? thread.owner !== "local" && thread._id && thread.owner
      ? { userId: thread.owner, threadId: thread._id }
      : "skip"
      : "skip",
  );

  const isOwner = thread && !(thread instanceof Error) ? thread.owner === userId : false;

  // Load user's note if available
  useEffect(() => {
    if (!userNotes) {
      return;
    }
    if (userNotes && userNotes.length > 0) {
      setNote(userNotes[0].message);
      setNoteId(userNotes[0]._id);
    }
  }, [userNotes]);

  // Modal UI
  const Modal = () => {
    if (thread instanceof Error) {
      return <div>Error: No thread</div>;
    }
    if (!thread) {
      return <div>Loading...</div>;
    }
    return (
      <div className="bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowModal(false)}
          >
            &times;
          </button>
          <h2 className="mb-2 text-lg font-bold">Thread Settings</h2>
          <div className="mb-4">
            <div className="font-semibold">Name:</div>
            <div>{thread?.name ?? "No name"}</div>
          </div>
          <div className="mb-4">
            <div className="font-semibold">Description:</div>
            {isOwner ? (
              <textarea
                className="mt-1 w-full rounded border p-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            ) : (
              <div className="mt-1">
                {thread && !(thread instanceof Error) ? thread.description?.text : (
                  <span className="text-gray-400 italic">No description</span>
                )}
              </div>
            )}
            {isOwner && (
              <button
                className="mt-2 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                onClick={async () => {
                  await updateDescription({
                    threadId: thread._id,
                    description,
                    userId,
                  });
                  setShowModal(false);
                }}
              >
                Update Description
              </button>
            )}
          </div>
          {isOwner && (
            <div className="mb-4">
              <div className="font-semibold">Invite User (by ID):</div>
              <input
                className="mt-1 w-full rounded border p-2"
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                placeholder="User ID"
              />
              <select value={perm} onChange={(e) => setPerm(e.target.value as "canSee" | "canSend")}>
                <option value="canSee">Can See</option>
                <option value="canSend">Can Send</option>
              </select>
              <button
                className="mt-2 rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                onClick={async () => {
                  await inviteUser({ threadId: thread._id, userId: inviteUserId, perm:  });
                  setInviteUserId("");
                  setShowModal(false);
                }}
              >
                Invite
              </button>
            </div>
          )}
          <div className="mb-2">
            <div className="font-semibold">Your Notes:</div>
            <textarea
              className="mt-1 w-full rounded border p-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write your private notes here..."
            />
            <button
              className="mt-2 rounded bg-purple-600 px-3 py-1 text-white hover:bg-purple-700"
              onClick={async () => {
                // await addOrUpdateNote({ threadId: thread._id, userId: currentUserId, message: note, noteId });
                setShowModal(false);
              }}
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
  )};

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
          <div>
            <h1
              className="cursor-pointer text-xl font-semibold text-gray-900 hover:underline dark:text-gray-100"
              onClick={() => setShowModal(true)}
            >
              {thread.name}
            </h1>
            <div
              className="mt-1 flex cursor-pointer items-center text-sm text-gray-500 hover:underline dark:text-gray-400"
              onClick={() => setShowModal(true)}
            >
              {thread.description?.text || (
                <span className="text-gray-400 italic">No description</span>
              )}
            </div>
          </div>
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
      {showModal && <Modal />}
      {/* Thread Content */}
      <div className="flex-1 overflow-hidden">
        <EmbeddedThread id={thread.defaultThread} state={state} />
      </div>
    </div>
  );
}
