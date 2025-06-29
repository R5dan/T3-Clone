import type { Doc } from "convex/_generated/dataModel";

import { TOOL as SearchTool } from "./search";
import { TOOL as Wikipedia } from "./wikipedia";
import { TOOL as SearchPyPi } from "./pypi";


export function SearchSetup(user: Doc<"users"> | null) {
  if (!user) {
    return {
      searchWeb: SearchTool({ method: "duckduckgo" }),
      searchPyPi: SearchPyPi,
      searchWikipedia: Wikipedia,
    };
  }
  let method = user?.toolPreferences?.search?.[0] ?? "duckduckgo"
  if (method !== "duckduckgo" && !user?.toolCredentials?.[method]) {
    method = "duckduckgo";
  }

  if (method === "duckduckgo") {
    return {
      searchWeb: SearchTool({ method }),
      searchPyPi: SearchPyPi,
      searchWikipedia: Wikipedia,
    };
  }
  return {
    searchWeb: SearchTool({ method , key: user.toolCredentials[method]! }),
    searchPyPi: SearchPyPi,
    searchWikipedia: Wikipedia,
  };
}