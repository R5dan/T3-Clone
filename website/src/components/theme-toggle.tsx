"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setTheme("light")}
        className={`rounded-md p-2 transition-colors ${
          theme === "light"
            ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        }`}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`rounded-md p-2 transition-colors ${
          theme === "dark"
            ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        }`}
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`rounded-md p-2 transition-colors ${
          theme === "system"
            ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        }`}
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
}
