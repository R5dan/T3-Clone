import type { Tool as AI_TOOL } from "ai";
import type React from "react";

export type TOOLType = {
  icon: React.ReactNode;
  description: string;
  setup: (user: null) => Record<string, AI_TOOL>;
};

export type TOOL = TOOLType | MODULE;

export type MODULE = {
  name: string;
  description: string;
  icon: React.ReactNode;
  items: TOOL[]
}

