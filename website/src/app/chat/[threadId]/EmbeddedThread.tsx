"use client";

import type { State } from "./chat";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Message from "./msg";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { Id } from "../../../../convex/_generated/dataModel";

export function EmbeddedThread(props: { id: Id<"embeddedThreads">; state: State | null, setEmbed: React.Dispatch<React.SetStateAction<Id<"embeddedThreads"> | null>> }) {
  const { id, state } = props;
  const msgs = useQuery(api.messages.getMessages, {
    embeddedThreadId: id,
  });

  if (!msgs) {
    return <div></div>;
  }
  console.log("MESSAGES", msgs);
  console.log("END EMBEDDED");
  return (
    <div className="h-[90%]">
      <ScrollArea className="h-full">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-4">
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
              embedThreadId={id}
              setEmbed={props.setEmbed}
            />
          ))}
          {state ? (
            <Message
              prompt={[{ role: "text" as const, content: state.prompt }]}
              response={
                state.response
                  ? [{ role: "text", content: state.response }]
                  : null
              }
              reasoning={state.reasoning ?? undefined}
              hasReasoning={state.reasoning ? true : false}
              id="latest"
              showSender={true}
              sender={state.sender}
              setEmbed={props.setEmbed}
            />
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              No current message
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
