"use client";

import React, { useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
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

export function CompactModelSelector({ selectedModel, onModelSelect, className }: CompactModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get current model info
  const currentModel = MODELS.find(model => model.id === selectedModel);
  
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
    const model = MODELS.find(m => m.id === modelId);
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-8 px-3 text-xs"
      >
        {currentModel && (
          <>
            {getProviderIcon(getProviderName(currentModel.id)) ?? (
              <div className="w-3 h-3 bg-gray-400 rounded" />
            )}
            <span className="truncate max-w-20">
              {getModelDisplayName(currentModel.id)}
            </span>
            {isFreeModel(currentModel.id) && (
              <span className="text-xs text-green-600 font-medium">Free</span>
            )}
          </>
        )}
        <ChevronDown className="w-3 h-3" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
              Quick Select
            </div>
            {QUICK_MODELS.map((modelId) => {
              const model = MODELS.find(m => m.id === modelId);
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
                  className={`w-full flex items-center gap-2 p-2 rounded text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  {getProviderIcon(getProviderName(modelId)) ?? (
                    <div className="w-3 h-3 bg-gray-400 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate font-medium">
                        {getModelDisplayName(modelId)}
                      </span>
                      {isFree && (
                        <span className="text-xs text-green-600 font-medium">Free</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {model.name}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </button>
              );
            })}
            
            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
              <button
                onClick={() => {
                  // Open full model selector modal or navigate to it
                  window.open("/model-selector-demo", "_blank");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2 rounded text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-3 h-3" />
                <span>All Models...</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 