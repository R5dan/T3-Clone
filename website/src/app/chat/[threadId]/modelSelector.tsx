"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@workos-inc/authkit-nextjs";
import { 
  Star, 
  StarOff, 
  ChevronDown, 
  ChevronRight,
  Image as ImageIcon,
  FileText,
  Brain,
  Code,
  Eye,
  Plus,
  Lock,
  Search,
  Sparkles
} from "lucide-react";
import { MODELS, FREE_MODELS } from "~/server/chat/models";
import type { MODEL_IDS } from "~/server/chat/types";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getProviderIcon } from "~/components/ui/provider-icons";

interface ModelSelectorProps {
  selectedModel: MODEL_IDS;
  onModelSelect: (model: MODEL_IDS) => void;
  className?: string;
}

// Popular models for the "More" section
const POPULAR_MODELS = [
  "openrouter/auto",
  "openai/gpt-4o-2024-08-06",
  "openai/gpt-4o-mini-2024-07-18",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.5-pro-preview",
  "google/gemini-2.0-flash-exp",
  "mistralai/mistral-large-2407",
  "deepseek/deepseek-r1",
  "meta-llama/llama-3.1-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
  "cohere/command-r-plus",
];

// Capability icons mapping
const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon className="w-3 h-3" />,
  file: <FileText className="w-3 h-3" />,
  text: <FileText className="w-3 h-3" />,
  reasoning: <Brain className="w-3 h-3" />,
  code: <Code className="w-3 h-3" />,
  vision: <Eye className="w-3 h-3" />,
};

export function ModelSelector({ selectedModel, onModelSelect, className }: ModelSelectorProps) {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"favourites" | "more" | "all">("favourites");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["favourites"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [customModelId, setCustomModelId] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Get user's favourite models (stored in localStorage for now)
  const [favourites, setFavourites] = useState<MODEL_IDS[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("model-favourites");
      return stored ? JSON.parse(stored) : ["openrouter/auto", "deepseek/deepseek-r1-0528:free"];
    }
    return ["openrouter/auto", "deepseek/deepseek-r1-0528:free"];
  });

  // Save favourites to localStorage
  const saveFavourites = (newFavourites: MODEL_IDS[]) => {
    setFavourites(newFavourites);
    if (typeof window !== "undefined") {
      localStorage.setItem("model-favourites", JSON.stringify(newFavourites));
    }
  };

  // Toggle favourite
  const toggleFavourite = (modelId: MODEL_IDS) => {
    const newFavourites = favourites.includes(modelId)
      ? favourites.filter((id: MODEL_IDS) => id !== modelId)
      : [...favourites.slice(0, 9), modelId]; // Keep max 10
    saveFavourites(newFavourites);
  };

  // Check if model is free
  const isFreeModel = (modelId: string) => {
    return FREE_MODELS.includes(modelId as any) || modelId.endsWith(":free");
  };

  // Check if user can use non-free model
  const canUseModel = (modelId: string) => {
    if (isFreeModel(modelId)) return true;
    return user && user.metadata?.openRouterKey;
  };

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery) return MODELS;
    return MODELS.filter(model => 
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (model as any).company?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Get models for each section
  const favouriteModels = useMemo(() => 
    MODELS.filter(model => favourites.includes(model.id as MODEL_IDS)), 
    [favourites]
  );

  const popularModels = useMemo(() => 
    MODELS.filter(model => POPULAR_MODELS.includes(model.id)), 
    []
  );

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Handle custom model selection
  const handleCustomModelSelect = () => {
    if (customModelId.trim()) {
      onModelSelect(customModelId.trim() as MODEL_IDS);
      setCustomModelId("");
      setShowCustomInput(false);
    }
  };

  // Get provider name from model ID
  const getProviderName = (modelId: string) => {
    return modelId.split("/")[0];
  };

  // Get capability badges
  const getCapabilityBadges = (model: any) => {
    const badges = [];
    
    if (model.architecture.input_modalities.includes("image")) {
      badges.push({ icon: CAPABILITY_ICONS.image, label: "Image", variant: "info" as const });
    }
    if (model.architecture.input_modalities.includes("file")) {
      badges.push({ icon: CAPABILITY_ICONS.file, label: "File", variant: "secondary" as const });
    }
    if (model.pricing.internal_reasoning !== "0" && model.pricing.internal_reasoning !== "-1") {
      badges.push({ icon: CAPABILITY_ICONS.reasoning, label: "Reasoning", variant: "success" as const });
    }
    if (model.name.toLowerCase().includes("code") || model.name.toLowerCase().includes("coder")) {
      badges.push({ icon: CAPABILITY_ICONS.code, label: "Code", variant: "warning" as const });
    }
    
    return badges;
  };

  // Model card component
  const ModelCard = ({ model, showFavourite = true }: { model: any; showFavourite?: boolean }) => {
    const isFavourite = favourites.includes(model.id as MODEL_IDS);
    const canUse = canUseModel(model.id);
    const providerName = getProviderName(model.id);
    const capabilityBadges = getCapabilityBadges(model);

    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${
          selectedModel === model.id ? "ring-2 ring-blue-500" : ""
        } ${!canUse ? "opacity-50" : ""}`}
        onClick={() => canUse && onModelSelect(model.id as MODEL_IDS)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {getProviderIcon(providerName) || <div className="w-4 h-4 bg-gray-400 rounded" />}
                <h4 className="font-medium text-sm truncate">{model.name}</h4>
                {!canUse && <Lock className="w-3 h-3 text-gray-500" />}
                {isFreeModel(model.id) && (
                  <Badge variant="success" className="text-xs">Free</Badge>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 mb-2">
                {capabilityBadges.map((badge, index) => (
                  <Badge key={index} variant={badge.variant} className="text-xs flex items-center gap-1">
                    {badge.icon}
                    {badge.label}
                  </Badge>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 overflow-hidden max-h-8">
                {model.description.substring(0, 100)}...
              </p>
            </div>
            
            {showFavourite && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-2"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  toggleFavourite(model.id as MODEL_IDS);
                }}
              >
                {isFavourite ? <Star className="w-4 h-4 fill-yellow-400" /> : <StarOff className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="animate-pulse">Loading models...</div>;
  }

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        {[
          { id: "favourites", label: "Favourites", count: favouriteModels.length },
          { id: "more", label: "More", count: popularModels.length },
          { id: "all", label: "All", count: filteredModels.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[600px]">
        {activeTab === "favourites" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favouriteModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
            {favouriteModels.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No favourite models yet. Add some from the "More" or "All" tabs!
              </div>
            )}
          </div>
        )}

        {activeTab === "more" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "all" && (
          <div className="space-y-4">
            {/* Custom Model Input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Custom Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showCustomInput ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter model ID (e.g., openai/gpt-4)"
                      value={customModelId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomModelId(e.target.value)}
                      onKeyPress={(e: React.KeyboardEvent) => e.key === "Enter" && handleCustomModelSelect()}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleCustomModelSelect} size="sm">
                        Add Model
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setShowCustomInput(false);
                          setCustomModelId("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCustomInput(true)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Model
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* All Models */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
            
            {filteredModels.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No models found matching your search.
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Authentication Notice */}
      {!user && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <Lock className="w-4 h-4" />
            <span className="text-sm">
              Sign in to use premium models. Free models are available without authentication.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
