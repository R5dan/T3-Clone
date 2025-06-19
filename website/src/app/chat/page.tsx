"use client";

import { useState, useEffect, useReducer, Suspense } from "react";
import { Thread } from "./thread";
import { z } from "zod";
import { api } from "convex/_generated/api";
import { type MODEL_IDS } from "~/server/chat";
import { DEFAULT_MODEL } from "~/server/workos/defaults";
import { useQuery } from "convex/react";
import { useTheme } from "~/server/utils";
import { type FilePreview, UploadButton } from "~/server/uploadthing";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { CompactModelSelector } from "~/components/ui/compact-model-selector";

export type State = {
  prompt: string;
  response: string | null;
  reasoning: string | null;
  sender: string;
};

type Action =
  | {
      type: "prompt";
      prompt: string;
      sender: string;
    }
  | {
      type: "response";
      response: string;
    }
  | {
      type: "reasoning";
      reasoning: string;
    }
  | {
      type: "end";
    };

const chatSchema = z.object({
  threadId: z.string(),
  message: z.string(),
  tools: z.array(z.string()),
  model: z.string(),
});

export function Page() {
  const { user, loading } = useAuth();
  const convexUser = useQuery(api.utils.getUserFromWorkOS, {
    userId: user?.id ?? null,
  });
  const [inputMessage, setInputMessage] = useState("");
  const [newMessage, setNewMessage] = useReducer<State | null, [Action]>(
    (state, action) => {
      if (action.type === "prompt") {
        return {
          prompt: action.prompt,
          response: null,
          reasoning: null,
          sender: action.sender,
        };
      } else if (action.type === "response") {
        if (!state) {
          return {
            prompt: "",
            response: action.response,
            reasoning: null,
            sender: convexUser ? convexUser.id : "local",
          };
        } else if (state.response) {
          return {
            prompt: state.prompt,
            response: state.response + action.response,
            reasoning: state.reasoning,
            sender: state.sender,
          };
        }
        return {
          prompt: state.prompt,
          response: action.response,
          reasoning: state.reasoning,
          sender: state.sender,
        };
      } else if (action.type === "reasoning") {
        if (!state) {
          return {
            prompt: "",
            response: null,
            reasoning: action.reasoning,
            sender: convexUser ? convexUser.id : "local",
          };
        } else if (state.response) {
          return {
            prompt: state.prompt,
            response: state.response,
            reasoning: state.reasoning + action.reasoning,
            sender: state.sender,
          };
        }
        return {
          prompt: state.prompt,
          response: state.response,
          reasoning: action.reasoning,
          sender: state.sender,
        };
      } else if (action.type === "end") {
        console.log("END ACTION");
        return null;
      }
      return state;
    },
    null,
  );
  const [model, setModel] = useState<MODEL_IDS>(DEFAULT_MODEL);
  const [theme] = useTheme("dark");
  const [files, setFiles] = useState<FilePreview[]>([]);

  // This useEffect handles loading the correct Highlight.js theme
  useEffect(() => {
    // Clean up any existing theme link tags to prevent conflicts
    const existingLink = document.getElementById("hljs-theme-link");
    if (existingLink) {
      existingLink.remove();
    }

    const link = document.createElement("link");
    link.id = "hljs-theme-link";
    link.rel = "stylesheet";
    link.href =
      theme === "dark"
        ? "https://pwqjtjyxoz.ufs.sh/f/vmTmSmWLsSk0WlOnteQleV6wiE79ygLmOxZu1AKzv2tqG3ns"
        : "https://pwqjtjyxoz.ufs.sh/f/vmTmSmWLsSk0l9DelQHDr05c23fvdTiAeYFUXj8mZKEMWxw6";
    document.head.appendChild(link);

    // Clean up the link tag when the component unmounts or theme changes
    return () => {
      if (document.getElementById("hljs-theme-link")) {
        document.getElementById("hljs-theme-link").remove();
      }
    };
  }, [theme]); // Re-run when the theme changes

  if (loading) {
    return <div>Loading...</div>;
  }

  console.log("END STATES");
  // if (loading) {
  //   return <div>Loading...</div>;
  // }
  // if (!user) {
  //   router.push("/auth/login");
  //   return
  // }

  // const handleNewThread = async () => {
  //   if (inputMessage.trim()) {
  //     const res = await fetch("/api/chat/thread", {
  //       method: "POST",
  //       body: JSON.stringify({
  //         prompt: inputMessage,
  //         model: model,
  //       }),
  //     });
  //     const { threadId } = await res.json();
  //     setThread(threadId);
  //     router.push(`/chat/${threadId}`);
  //     return threadId;
  //   }
  // };

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      console.log("[SEND]:", inputMessage);
      setNewMessage({
        type: "prompt",
        prompt: inputMessage,
        sender: convexUser?.id ?? "local",
      });
      const messageToSend = inputMessage;
      setInputMessage("");
      console.log(`MSG THREAD ID: ${threadId}`);
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          threadId,
          embeddedThreadId: thread.defaultThread,
          message: messageToSend,
          tools: {},
          model: model,
          files: files.map((file) => file.id),
        }),
      });
      if (res.status !== 200) {
        console.log("ERROR RESPONSE");
        return;
      }
      if (res.body === null) {
        console.log("NO RESPONSE");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[SEND]: Message ended");
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        if (chunk.startsWith("0:")) {
          console.log(`[SEND][TEXT][CHUNK]: '${chunk.slice(2)}'`);
          setNewMessage({ type: "response", response: chunk.slice(2) });
        } else if (chunk.startsWith("g:")) {
          console.log(`[SEND][REASONING][CHUNK]: '${chunk.slice(2)}'`);
          setNewMessage({ type: "reasoning", reasoning: chunk.slice(2) });
        }
      }
      setNewMessage({ type: "end" });
    }
  };

  const handleKeyPress = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSendMessage();
      }
    }
  };

  console.log("END");
  return (
    <div className="dark:theme-atom-one theme-atom-one flex h-screen max-w-[99%] bg-gray-50 dark:bg-gray-900">
      {/* Main Chat Area */}
      <div className="flex w-full flex-1 flex-col">
        <div className="flex-1 overflow-hidden">
          {threadId ? (
            <Suspense>
              <Thread
                threadId={threadId}
                state={newMessage}
                user={user ?? "local"}
              />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
              No thread selected
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto max-w-3xl">
            {/* Model Selector in Input Area */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Model:
                </span>
                <CompactModelSelector
                  selectedModel={model}
                  onModelSelect={setModel}
                />
              </div>
            </div>
            {/*<UploadDropzone setFiles={setFiles} files={files} />*/}
            <div className="flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <UploadButton setFiles={setFiles} files={files} />
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="max-h-[200px] min-h-[40px] flex-1 resize-none border-none bg-transparent px-4 py-2 text-[15px] text-gray-900 placeholder-gray-500 outline-none dark:text-gray-100 dark:placeholder-gray-400"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
