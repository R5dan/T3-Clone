import type { Metadata } from "./index";

export const DEFAULT_TITLE_MODEL = "google/gemini-2.5-pro-exp-03-25";
export const DEFAULT_MODEL = "deepseek/deepseek-r1-0528:free";

export const defaultMetadata: Metadata = {
  userId: "",
  openRouterKey: "",
  defaultModel: DEFAULT_MODEL,
  titleModel: DEFAULT_TITLE_MODEL,
};
