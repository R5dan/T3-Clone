"use client";

import React, { useState } from "react";
import { Hammer, Check, X } from "lucide-react";
import { ALL_TOOLS, LOCAL_TOOLS } from "~/server/chat/tools";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";

export function ToolsSelector({
  signedIn,
  tools,
  setTools,
}: {
  signedIn: boolean;
  tools: string[];
  setTools: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const availableTools = signedIn ? ALL_TOOLS : LOCAL_TOOLS;

  const toggleTool = (toolName: string) => {
    setTools((prevTools) => {
      if (prevTools.includes(toolName)) {
        return prevTools.filter((tool) => tool !== toolName);
      } else {
        return [...prevTools, toolName];
      }
    });
  };

  const isToolEnabled = (toolName: string) => tools.includes(toolName);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-gray-700"
      >
        <Hammer className="h-5 w-5" />
        {tools.length > 0 && (
          <Badge
            variant="secondary"
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
          >
            {tools.length}
          </Badge>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown - positioned above the button */}
          <Card className="absolute right-0 bottom-12 z-50 w-80 border-0 bg-white shadow-lg dark:bg-gray-900">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hammer className="h-5 w-5" />
                Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(availableTools as Record<string, any>).map(
                ([toolName, toolObj]) => (
                  <div
                    key={toolName}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      isToolEnabled(toolName)
                        ? "border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                    onClick={() => toggleTool(toolName)}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={`flex-shrink-0 rounded-md p-2 ${
                          isToolEnabled(toolName)
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {toolObj.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium capitalize">
                          {toolName}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                          {toolObj.description}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`ml-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                        isToolEnabled(toolName)
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isToolEnabled(toolName) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>
                ),
              )}

              {Object.keys(availableTools as Record<string, any>).length ===
                0 && (
                <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                  <Hammer className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">No tools available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
