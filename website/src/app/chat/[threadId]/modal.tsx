import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export const Modal = ({ thread, setShowModal, userId }: { thread: (Doc<"threads">), setShowModal: React.Dispatch<React.SetStateAction<boolean>>, userId: Id<"users"> | "local" }) => {
  const [inviteUserEmail, setInviteUserEmail] = useState("");
  const [description, setDescription] = useState(
    (thread && !(thread instanceof Error) ? thread.description?.text : "") ??
      "",
  );
  const [note, setNote] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const inviteUser = useMutation(api.thread.inviteUserByEmail);
  const addOrUpdateNote = useMutation(api.utils.createOrEditNote);
  const [perm, setPerm] = useState<"canSee" | "canSend">("canSee");

  // Convex hooks
  const updateDescription = useMutation(api.thread.updateDescription);
  const userNotes = useQuery(
    api.utils.getUserThreadNotes,
      thread.owner !== "local"
        ? { userId: thread.owner, threadId: thread._id }
        : "skip"
  );

  const isOwner =
    thread && !(thread instanceof Error) ? thread.owner === userId : false;

  // Load user's note if available
  useEffect(() => {
    if (!userNotes) {
      setNote("");
      setNoteId("");
      return
    }
    if (userNotes && userNotes.length > 0) {
      setNote(userNotes[0].message);
      setNoteId(userNotes[0]._id);
    }
  }, [userNotes]);

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
              {thread && !(thread instanceof Error) ? (
                thread.description?.text
              ) : (
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
            <div className="font-semibold">Invite User (by Email):</div>
            <input
              className="mt-1 w-full rounded border p-2"
              value={inviteUserEmail}
              type="email"
              onChange={(e) => setInviteUserEmail(e.target.value)}
              placeholder="User Email"
            />
            <select
              value={perm}
              onChange={(e) => setPerm(e.target.value as "canSee" | "canSend")}
            >
              <option value="canSee">Can See</option>
              <option value="canSend">Can Send</option>
            </select>
            <button
              className="mt-2 rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
              onClick={async () => {
                await inviteUser({
                  threadId: thread._id,
                  userId,
                  perm,
                  email: inviteUserEmail,
                });
                setInviteUserEmail("");
                setShowModal(false);
              }}
            >
              Invite
            </button>
          </div>
        )}
        { userId !== "local" ? (
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
              await addOrUpdateNote({ threadId: thread._id, userId, message: note, noteId });
              setShowModal(false);
            }}
          >
            Save Note
          </button>
        </div>
          ): <></>}
      </div>
      </div>
  );
};
