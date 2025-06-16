"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React, { useState, useEffect } from "react";
import HLJS from "react-syntax-highlighter";
import dark from "./dark";
import light from "./light";
import { Clipboard, ClipboardCheck, WrapText, AlignLeft } from "lucide-react";

function Copy({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copying">("idle");

  useEffect(() => {
    async function handleCopy() {
      if (state === "copying") {
        await navigator.clipboard.writeText(text);
        setTimeout(() => setState("idle"), 1000);
      }
    }
    handleCopy();
  }, [state, text]);

  if (state === "idle") {
    return (
      <button
        onClick={() => {
          setState("copying");
        }}
        className="hover:scale-110"
      >
        <Clipboard />
      </button>
    );
  } else if (state === "copying") {
    return (
      <button className="hover:scale-110">
        <ClipboardCheck />
      </button>
    );
  }
}

function WrapLines({
  setWrap,
  wrap,
}: {
  setWrap: React.Dispatch<React.SetStateAction<boolean>>;
  wrap: boolean;
}) {
  if (wrap) {
    return (
      <button onClick={() => setWrap(false)} className="hover:scale-110">
        <AlignLeft />
      </button>
    );
  } else {
    return (
      <button onClick={() => setWrap(true)} className="hover:scale-110">
        <WrapText />
      </button>
    );
  }
}

export function Highlighter({
  markdown,
  theme,
}: {
  markdown: string;
  theme: "dark" | "light";
}) {
  const [wrap, setWrap] = useState(false);

  return (
    <ReactMarkdown
      children={markdown}
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }) {
          const themeObj = theme === "dark" ? dark : light;
          const match = /language-(\w+)/.exec(className ?? "");
          return !inline && match ? (
            <div className="rounded-lg border-8 border-gray-900">
              <div className="text-s center flex justify-between text-gray-500">
                <span className="font-mono">{match[1]}</span>
                <div className="">
                  <WrapLines setWrap={setWrap} wrap={wrap} />
                  <Copy text={String(children).replace(/\n$/, "")} />
                </div>
              </div>
              <div
              // className="border-8"
              // style={{ borderColor: themeObj.hljs.background }}
              >
                <HLJS
                  children={String(children).replace(/\n$/, "")}
                  style={themeObj}
                  language={match[1]}
                  PreTag="div"
                  className="overflow-x-auto"
                  showLineNumbers
                  {...{ wrapLines: wrap }}
                  lineNumberContainerStyle={{
                    "padding-right": "10px",
                    "padding-color": "#030712",
                  }}
                  {...props}
                />
              </div>
            </div>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    />
  );
}
