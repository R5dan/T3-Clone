"use client";

import React, { useState } from "react";
import {CompactModelSelector} from "~/components/ui/compact-model-selector";
import { DEFAULT_MODEL } from "~/server/workos/defaults";
import type { MODEL_IDS } from "~/server/chat/types";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function ModelSelectorDemo() {
  const [selectedModel, setSelectedModel] = useState<MODEL_IDS>(DEFAULT_MODEL);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Model Selector Demo
          </h1>
          <p className="text-gray-600">
            A comprehensive model selector with favourites, popular models, and
            full model list.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Model Selector */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Select a Model</CardTitle>
              </CardHeader>
              <CardContent>
                <CompactModelSelector
                  selectedModel={selectedModel}
                  onModelSelect={setSelectedModel}
                />
              </CardContent>
            </Card>
          </div>

          {/* Current Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Current Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Selected Model ID:
                    </label>
                    <p className="mt-1 rounded bg-gray-100 p-2 font-mono text-sm text-gray-900">
                      {selectedModel}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Model Type:
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedModel.endsWith(":free") ||
                      selectedModel.includes("free")
                        ? "Free Model"
                        : "Premium Model"}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Provider:
                    </label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">
                      {selectedModel.split("/")[0]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 