"use client";

import { useState } from "react";
import { CompactModelSelector } from "~/components/ui/compact-model-selector";
import type { MODEL_IDS } from "~/server/chat/types";
import { DEFAULT_MODEL } from "~/server/workos/defaults";

export default function ModelSelectorTestPage() {
  const [selectedModel, setSelectedModel] = useState<MODEL_IDS>(DEFAULT_MODEL);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Model Selector Test
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Compact Model Selector
          </h2>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">Current Model:</span>
            <CompactModelSelector
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
            />
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Selected Model ID:</strong> {selectedModel}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Features
          </h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-300">
            <li>• Quick selection of popular models</li>
            <li>• Provider icons for easy identification</li>
            <li>• Free model indicators</li>
            <li>• Compact design that fits in chat interfaces</li>
            <li>• Link to full model selector for advanced options</li>
            <li>• Dark mode support</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 