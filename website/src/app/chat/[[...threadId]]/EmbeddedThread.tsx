"use client";

import type { State } from "./chat";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Msg as Message } from "./msg";
// import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState, useEffect } from "react";

export function EmbeddedThread(props: {
  id: Id<"embeddedThreads">;
  state: State | null;
  setEmbed: React.Dispatch<React.SetStateAction<Id<"embeddedThreads"> | null>>;
}) {
  const { id, state } = props;
  const msgs = useQuery(api.messages.getMessages, {
    embeddedThreadId: id,
  });
  const [prompt, setPrompt] = useState<
    | (
        | {
            role: "text";
            content: string;
          }
        | {
            role: "image";
            image: Id<"images">;
          }
        | {
            role: "file";
            file: Id<"files">;
          }
      )[]
    | null
  >(null);
  const [response, setResponse] = useState<
    | {
        role: "text";
        content: string;
      }[]
    | null
  >(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  console.log("EMBED RENDER", { state, id, msgs, prompt, response, reasoning });
  useEffect(() => {
    if (state) {
      setPrompt(state.prompt.map((part) => {
        if (part.type === "text") {
          return {
            role: "text",
            content: part.text,
          } as {
            role: "text";
            content: string;
          };
        } else if (part.type === "image") {
          return {
            role: "image",
            image: part.image,
          } as {
            role: "image";
            image: Id<"images">;
          };
        } else if (part.type === "file") {
          return {
            role: "file",
            file: part.data,
          } as {
            role: "file";
            file: Id<"files">;
          };
        }
        throw new Error("Invalid part type");
      }));
      setResponse(state.response ? [{ role: "text", content: state.response }] : null);
      setReasoning(state.reasoning)
    } else {
      setPrompt(null);
      setResponse(null);
      setReasoning(null);
    }
    console.log("RERENDERING EMBEDDED THREAD");
  }, [state]);

  if (!msgs) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[calc(100vh-176px)] max-w-full flex-col overflow-x-hidden overflow-y-scroll">
      {/* <ScrollArea className="min-h-0 w-full flex-1"> */}
      <div className="space-y-6 px-4 py-6 w-full">
        {msgs.map((msg, index) => (
          <Message
            key={index}
            prompt={msg.prompt}
            response={msg.response}
            sender={msg.sender}
            reasoning={msg.reasoning}
            hasReasoning={msg.hasReasoning}
            id={msg._id}
            showSender={true}
            setEmbed={props.setEmbed}
            regenId={msg.regens}
            editId={msg.edits}
          />
        ))}
        {state ? (
          <Message
            prompt={prompt ?? []}
            response={response ?? []}
            reasoning={reasoning ?? undefined}
            hasReasoning={state.reasoning ? true : false}
            id="latest"
            showSender={true}
            sender={state.sender}
            setEmbed={props.setEmbed}
            editId={null}
            regenId={null}
          />
        ) : (<></>)}
      </div>
      {/* <ScrollBar orientation="vertical" />
      </ScrollArea> */}
    </div>
  );
}
