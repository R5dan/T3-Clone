"use client";

import {
  useState,
  useEffect,
  useReducer,
  Suspense,
  useRef,
  useCallback,
} from "react";
import { Thread } from "./thread";
import { api } from "convex/_generated/api";
import { type MODEL_IDS } from "~/server/chat";
import { DEFAULT_MODEL } from "~/server/workos/defaults";
import { useQuery } from "convex/react";
import { useTheme } from "~/server/utils";
import { FileInput, type FilePreviewLocal } from "~/server/uploadthing";
import { CompactModelSelector } from "~/components/ui/compact-model-selector";
import { Hammer, Send } from "lucide-react";
import type { MessageSendBody } from "~/server/chat/types";
import type { Id, Doc } from "../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { ThreadsContainer } from "./threadLink";
import type { User } from "@workos-inc/node";
import { ToolsSelector } from "~/components/ui/toolsSelector";

export type State = {
  prompt: (
    | {
        type: "text";
        text: string;
      }
    | { type: "image"; image: string; mimeType: string; filename: string }
    | { type: "file"; data: string; mimeType: string; filename: string }
  )[];
  response: string | null;
  reasoning: string | null;
  sender: string;
};

type Action =
  | {
      type: "start";
      sender: string;
    }
  | {
      type: "file";
      data: string;
      mimeType: string;
      filename: string;
    }
  | {
      type: "image";
      image: string;
      mimeType: string;
      filename: string;
    }
  | {
      type: "text";
      text: string;
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

export function Page({
  threadId: initialThreadId,
  convexUser,
  perm,
}: {
  threadId?: string;
  convexUser: Doc<"users"> | null;
  perm: "owner" | "canSend" | "canSee";
}) {
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [embeddedThreadId, setEmbeddedThreadId] = useState<string | undefined>(
    undefined,
  );
  const [inputMessage, setInputMessage] = useState("");
  const [files, setFiles] = useState<FilePreviewLocal[]>([]);
  const [showLatest, setShowLatest] = useState(false);
  const [partMessage, setPartMessage] = useState("");
  const [newMessage, setNewMessage] = useReducer<State | null, [Action]>(
    (state, action) => {
      console.log("ACTION", action);
      if (action.type === "start") {
        return {
          prompt: [],
          response: null,
          reasoning: null,
          sender: action.sender,
        };
      } else if (!state) {
        return null;
      } else if (action.type === "file") {
        return {
          prompt: state.prompt?.concat([
            {
              type: "file" as const,
              data: action.data,
              mimeType: action.mimeType,
              filename: action.filename,
            },
          ]),
          response: null,
          reasoning: null,
          sender: state.sender,
        };
      } else if (action.type === "image") {
        return {
          prompt: state.prompt?.concat([
            {
              type: "image" as const,
              image: action.image,
              mimeType: action.mimeType,
              filename: action.filename,
            },
          ]),
          response: null,
          reasoning: null,
          sender: state.sender,
        };
      } else if (action.type === "text") {
        return {
          prompt: state.prompt?.concat([
            {
              type: "text" as const,
              text: action.text,
            },
          ]),
          response: null,
          reasoning: null,
          sender: state.sender,
        };
      } else if (action.type === "response") {
        if (state.response) {
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
        if (state.reasoning) {
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
  const [isOpen, setIsOpen] = useState(true);
  const thread = useQuery(api.thread.getOptionalThread, {
    threadId: threadId as Id<"threads"> | undefined,
  });
  const [theme] = useTheme("dark");
  const abortControllerRef = useRef<AbortController | null>(null);
  // Determine the current user's permission level for this thread
  const router = useRouter();

  useEffect(() => {
    if (threadId) {
      router.push(`/chat/${threadId}`);
    } else {
      router.push("/chat");
    }
  }, [threadId, router]);

  const [tools, setTools] = useState<string[]>([]);

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
        document.getElementById("hljs-theme-link")?.remove();
      }
    };
  }, [theme]); // Re-run when the theme changes

  const nullState = newMessage === null;

  const handleInput = useCallback(
    (text: string) => {
      if (nullState) {
        setNewMessage({
          type: "start",
          sender: convexUser?.id ?? "local",
        });
      }
      setInputMessage(text);
    },
    [nullState, convexUser],
  );

  if (thread instanceof Error) {
    return <div>Error: No thread</div>;
  }
  console.log("END STATES");

  const handleSendMessage = async () => {
    if (inputMessage.trim() || files.length > 0) {
      abortControllerRef.current = new AbortController();
      const prompt = [];
      if (inputMessage.trim()) {
        prompt.push({ type: "text", text: inputMessage.trim() } as {
          type: "text";
          text: string;
        });
        setNewMessage({type: "text", text: inputMessage.trim()})
      }
      files.forEach((file) => {
        if (file.type.startsWith("image")) {
          prompt.push({
            type: "image",
            image: file.url,
            mimeType: file.type,
          } as {
            type: "image";
            image: string;
            mimeType: string;
            });
          setNewMessage({type: "image", image: file.url, mimeType: file.type, filename: file.name})
        } else {
          prompt.push({
            type: "file",
            data: file.url,
            filename: file.name,
            mimeType: file.type,
          } as {
            type: "file";
            data: string;
            filename: string;
            mimeType: string;
            });
          setNewMessage({type: "file", data: file.url, mimeType: file.type, filename: file.name})
        }
      });
      setInputMessage("");
      setFiles([]);
      setShowLatest(true);
      // If no threadId, create a new thread
      let usedThreadId = threadId ?? "local";
      let usedEmbeddedThreadId = embeddedThreadId ?? "local";
      if (!threadId) {
        const res = await fetch("/api/chat/thread", {
          method: "POST",
          body: JSON.stringify({
            userId: convexUser?.id ?? undefined,
            prompt,
          }),
        });
        if (res.status !== 200) {
          console.log("ERROR CREATING THREAD");
          setShowLatest(false);
          return;
        }
        const data = (await res.json()) as {
          threadId: Id<"threads">;
          embeddedThreadId: Id<"embeddedThreads">;
        };
        usedThreadId = data.threadId;
        usedEmbeddedThreadId = data.embeddedThreadId;
        setThreadId(usedThreadId);
        setEmbeddedThreadId(usedEmbeddedThreadId);
      } else if (!embeddedThreadId && thread && !(thread instanceof Error)) {
        setEmbeddedThreadId(thread.defaultThread);
        usedEmbeddedThreadId = thread.defaultThread as Id<"embeddedThreads">;
      }
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          threadId: usedThreadId as Id<"threads">,
          embeddedThreadId: usedEmbeddedThreadId as Id<"embeddedThreads">,
          message: prompt,
          tools,
          model,
        } satisfies MessageSendBody),
      });
      if (chatRes.status !== 200) {
        console.log("ERROR RESPONSE");
        setShowLatest(false);
        return;
      }
      if (chatRes.body === null) {
        console.log("NO RESPONSE");
        setShowLatest(false);
        return;
      }
      const reader = chatRes.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[SEND]: Message ended");
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        if (chunk.startsWith("0:")) {
          setNewMessage({ type: "response", response: chunk.slice(3, -2) });
        } else if (chunk.startsWith("g:")) {
          setNewMessage({ type: "reasoning", reasoning: chunk.slice(3, -2) });
        }
      }
      setShowLatest(false);
      setNewMessage({ type: "end" });
    }
  };

  const handleKeyPress = async (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (threadId) {
        await handleSendMessage();
      } else {
        //const thread = await handleNewThread();
        await handleSendMessage();
      }
    }
  };

  // Remove a file from the files array
  const handleRemoveFile = (index: number) => {
    setFiles((files) => files.filter((_, i) => i !== index));
  };

  console.log("END");
  return (
    <div className="dark:theme-atom-one theme-atom-one flex h-screen w-[99%] max-w-[99%] bg-gray-50 dark:bg-gray-900">
      <ThreadsContainer
        user={convexUser?._id ?? "local"}
        activeThreadId={null}
        perm={perm}
        setIsOpen={setIsOpen}
        isOpen={isOpen}
      />
      {/* Main Chat Area */}
      <div className="flex max-h-full min-h-0 flex-auto flex-col">
        <div className="">
          {threadId ? (
            <Suspense>
              <Thread
                threadId={threadId}
                state={showLatest ? newMessage : null}
                user={convexUser ?? "local"}
                perm={perm}
                setIsOpen={setIsOpen}
                isOpen={isOpen}
              />
            </Suspense>
          ) : (
            <div className="flex h-full max-w-[99%] flex-col bg-gray-50 dark:bg-gray-900">
              No thread selected
            </div>
          )}
        </div>
        {/* Input Area */}
        <div className="h-max bg-gradient-to-b from-white/100 to-white/0 dark:from-gray-800/100 dark:to-transparent absolute bottom-0 w-full">
          <div className="relative bottom-0 h-auto max-h-[20%] w-[55%] min-w-[400px] self-center mx-auto border-t border-r border-l border-gray-200 px-6 py-2 dark:border-gray-700">
            <div className="mx-auto max-w-3xl">
              {/* Model Selector in Input Area */}
              <div className="flex items-center justify-between">
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
              {/* File chips */}
              {files.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {files.map((file, idx) => (
                    <div
                      key={file.url}
                      className="flex items-center rounded bg-gray-200 px-2 py-1 text-xs dark:bg-gray-700"
                    >
                      <span className="mr-2">{file.name}</span>
                      <button
                        type="button"
                        className="ml-1 text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveFile(idx)}
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-3 rounded-lg border border-gray-200 bg-white px-2 pt-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <textarea
                  value={inputMessage}
                  onChange={(e) => handleInput(e.target.value)}
                  onKeyDownCapture={handleKeyPress}
                  placeholder="Type your message..."
                  className="max-h-[200px] min-h-[40px] flex-1 resize-none border-none bg-transparent px-4 py-2 align-bottom text-[15px] text-gray-900 placeholder-gray-500 outline-none dark:text-gray-100 dark:placeholder-gray-400"
                  rows={1}
                  style={{ marginBottom: 0 }}
                />
                <div className="my-auto flex items-center gap-4">
                <ToolsSelector signedIn={convexUser !== null} tools={tools} setTools={setTools} />
                </div>
                <FileInput
                  handleFile={(file) => setFiles(files.concat(file))}
                  files={files}
                />
                <div className="my-auto flex items-center gap-4">
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() && files.length === 0}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-gray-700"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
