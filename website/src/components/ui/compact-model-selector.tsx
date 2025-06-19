"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { MODELS, FREE_MODELS } from "~/server/chat/models";
import type { MODEL_IDS } from "~/server/chat/types";
import { Button } from "~/components/ui/button";
import { getProviderIcon } from "~/components/ui/provider-icons";

interface CompactModelSelectorProps {
  selectedModel: MODEL_IDS;
  onModelSelect: (model: MODEL_IDS) => void;
  className?: string;
}

// Popular models for quick selection
const QUICK_MODELS = [
  "openrouter/auto",
  "openai/gpt-4o-2024-08-06",
  "openai/gpt-4o-mini-2024-07-18",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.0-flash-exp",
  "deepseek/deepseek-r1-0528:free",
] as MODEL_IDS[];

function Favourites({
  setTab,
  selectedModel,
  isFreeModel,
  onModelSelect,
  setIsOpen,
  getProviderName,
  getModelDisplayName,
}: {
  setTab: React.Dispatch<React.SetStateAction<"favourites" | "more">>;
  selectedModel: MODEL_IDS;
  isFreeModel: (modelId: MODEL_IDS) => boolean;
  onModelSelect: (modelId: MODEL_IDS) => void;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  getProviderName: (modelId: MODEL_IDS) => string;
  getModelDisplayName: (modelId: MODEL_IDS) => string;
}) {
  return (
    <div className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="p-2">
        <div className="mb-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          Quick Select
        </div>
        {QUICK_MODELS.map((modelId) => {
          const model = MODELS.find((m) => m.id === modelId);
          if (!model) return null;

          const isSelected = selectedModel === modelId;
          const isFree = isFreeModel(modelId);

          return (
            <button
              key={modelId}
              onClick={() => {
                onModelSelect(modelId);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded p-2 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""
              }`}
            >
              {getProviderIcon(getProviderName(modelId)) ?? (
                <div className="h-3 w-3 rounded bg-gray-400" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate font-medium">
                    {getModelDisplayName(modelId)}
                  </span>
                  {isFree && (
                    <span className="text-xs font-medium text-green-600">
                      Free
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {model.name}
                </div>
              </div>
              {isSelected && (
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}

        <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
          <button
            onClick={() => {
              setTab("more");
            }}
            className="flex w-full items-center gap-2 rounded p-2 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Settings className="h-3 w-3" />
            <span>More Models...</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function CompactModelSelector({
  selectedModel,
  onModelSelect,
  className,
}: CompactModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"favourites" | "more">("favourites");

  // Get current model info
  const currentModel = MODELS.find((model) => model.id === selectedModel);

  // Get provider name from model ID
  const getProviderName = (modelId: string) => {
    return modelId.split("/")[0];
  };

  // Check if model is free
  const isFreeModel = (modelId: MODEL_IDS) => {
    return FREE_MODELS.includes(modelId);
  };

  // Get display name for model
  const getModelDisplayName = (modelId: string) => {
    const model = MODELS.find((m) => m.id === modelId);
    if (model) {
      // Extract a shorter name from the full name
      const name = model.name;
      if (name.includes("GPT-4")) return "GPT-4";
      if (name.includes("Claude")) return "Claude";
      if (name.includes("Gemini")) return "Gemini";
      if (name.includes("DeepSeek")) return "DeepSeek";
      return name.split(" ")[0]; // Take first word
    }
    return modelId.split("/")[1] ?? modelId;
  };

  return (
    <div className={`relative ${className}`}>
      {isOpen && (
        <Favourites
          setTab={setTab}
          selectedModel={selectedModel}
          isFreeModel={isFreeModel}
          onModelSelect={onModelSelect}
          setIsOpen={setIsOpen}
          //@ts-expect-error types are fine
          getProviderName={getProviderName}
          //@ts-expect-error types are fine
          getModelDisplayName={getModelDisplayName}
        />
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 items-center gap-2 px-3 text-xs"
      >
        {currentModel && (
          <>
            {getProviderIcon(getProviderName(currentModel.id)) ?? (
              <div className="h-3 w-3 rounded bg-gray-400" />
            )}
            <span className="max-w-20 truncate">
              {getModelDisplayName(currentModel.id)}
            </span>
            {isFreeModel(currentModel.id) && (
              <span className="text-xs font-medium text-green-600">Free</span>
            )}
          </>
        )}
        {
          isOpen ?
            <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
        }
      </Button>

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
