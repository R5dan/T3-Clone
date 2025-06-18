"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React, { useState, useEffect } from "react";
import HLJS from "react-syntax-highlighter";
import dark from "./dark";
import light from "./light";
import {
  Clipboard,
  ClipboardCheck,
  WrapText,
  AlignLeft,
  Download,
  createLucideIcon,
} from "lucide-react";
import mimes from "./mimes";

const Downloading = createLucideIcon("downloading", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }],
]);

function DownloadButton({
  text,
  filename,
  mimeType,
}: {
  text: string;
  filename: string;
  mimeType: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = (
    data: string[],
    filename: string,
    mimeType: string,
  ) => {
    setDownloading(true);
    const blob = new Blob(data, {
      type: mimeType,
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloading(false);
    setDownloaded(true);
  };

  if (downloading) {
  } else if (downloaded) {
  } else {
    return (
      <button
        onClick={() => handleDownload(text.split("\n"), filename, mimeType)}
      >
        <Download />
      </button>
    );
  }
}

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
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }) {
          const themeObj = theme === "dark" ? dark : light;
          const match = /language-(\w+)/.exec(className ?? "");
          const lang = match ? match[1]! : ("plaintext" as const);
          console.log("STRING CHILDREN" + String(children).replace(/\n$/, ""));
          return !inline && match ? (
            <div className="rounded-lg border-8 border-gray-900">
              <div className="text-s center flex justify-between text-gray-500">
                <span className="font-mono">{lang}</span>
                <div>
                  <DownloadButton
                    text={String(children).replace(/\n$/, "")}
                    filename={"abc"}
                    mimeType={mimes[lang]}
                  />
                  <WrapLines setWrap={setWrap} wrap={wrap} />
                  <Copy text={String(children).replace(/\n$/, "")} />
                </div>
              </div>
              <div
              // className="border-8"
              // style={{ borderColor: themeObj.hljs.background }}
              >
                <HLJS
                  style={themeObj}
                  language={lang}
                  PreTag="div"
                  className="overflow-x-auto"
                  showLineNumbers
                  {...{ wrapLines: wrap }}
                  lineNumberContainerStyle={{
                    "padding-right": "10px",
                    "padding-color": "#030712",
                  }}
                  {...props}
                >{String(children).replace(/\n$/, "")}</HLJS>
              </div>
            </div>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
