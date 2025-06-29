import { tool, type Tool } from "ai";
import { z } from "zod";

const TOOL_RESPONSE_SCHEMA = z.object({
  position: z.number(),
  title: z.string(),
  link: z.string().url(),
  snippet: z.string(),
});

function SerpAPI(key: string) {
  return async function Tool({ query }: { query: string }) {
    const res = fetch(`https://serpapi.com/search?q=${query}&api_key=${key}`);
    const json = await res.json();
    const organic = (
      json.organic_results as z.infer<typeof TOOL_RESPONSE_SCHEMA>[]
    )
      .map((res) => {
        const parsed = TOOL_RESPONSE_SCHEMA.safeParse(res);
        if (parsed.success) {
          return parsed.data;
        }
        return null;
      })
      .filter((res) => res !== null);

    return organic;
  };
}

function ExaAPI(key: string) {
  return async function Tool({ query }: { query: string }) {
    const res = fetch(`https://api.exa.ai/search?query=${query}`, {
      headers: {
        "x-api-key": key,
      },
    });
    const json = await res.json();
    const results = (json.results as Record<string, any>[])
      .map((res, index) => {
        const parsed = TOOL_RESPONSE_SCHEMA.safeParse({
          title: res.title,
          link: res.link,
          snippet: res.text,
          position: index,
        });

        if (parsed.success) {
          return parsed.data;
        }
        return null;
      })
      .filter((res) => res !== null);

    return results;
  };
}

function GoogleSearch(key: string) {
  return async function Tool({ query }: { query: string }) {
    const res = fetch(
      `https://www.googleapis.com/customsearch/v1?key=${key}&q=${query}`,
    );
    const json = await res.json();
    const results = (json.items as z.infer<typeof TOOL_RESPONSE_SCHEMA>[])
      .map((res, index) => {
        const parsed = TOOL_RESPONSE_SCHEMA.safeParse({
          title: res.title,
          link: res.link,
          snippet: res.snippet,
          position: index,
        });

        if (parsed.success) {
          return parsed.data;
        }
        return null;
      })
      .filter((res) => res !== null);

    return results;
  };
}

async function DuckDuckGo({ query }: { query: string }) {
  const res = fetch(
    `https://api.duckduckgo.com/?q=${query}&format=json&no_redirect=1`,
  );
  const json = await res.json();
  const results = (json.RelatedTopics as z.infer<typeof TOOL_RESPONSE_SCHEMA>[])
    .map((res, index) => {
      const parsed = TOOL_RESPONSE_SCHEMA.safeParse({
        title: res.FirstURL.split("https://duckduckgo.com/")[1],
        link: res.FirstURL,
        snippet: res.Text,
        position: index,
      });

      if (parsed.success) {
        return parsed.data;
      }
      return null;
    })
    .filter((res) => res !== null);

  return results;
}

function Tool<T extends "google" | "duckduckgo" | "serpapi" | "exa">({
  method,
  key,
}: T extends "duckduckgo"
  ? {
      method: T;
      key?: string;
    }
  : {
      method: T;
      key: string;
    }) {
  if (method === "google") {
    return GoogleSearch(key);
  } else if (method === "duckduckgo") {
    return DuckDuckGo;
  } else if (method === "serpapi") {
    return SerpAPI(key);
  } else if (method === "exa") {
    return ExaAPI(key);
  } else if (!method) {
    return DuckDuckGo;
  } else {
    throw new Error("Invalid method");
  }
}

export const TOOL = <T extends "google" | "duckduckgo" | "serpapi" | "exa">({
  method,
  key,
}: T extends "duckduckgo"
  ? {
      method: T;
      key?: string;
    }
  : {
      method: T;
      key: string;
    }):Tool =>
  tool({
    description: "Search the web",
    parameters: z.object({
      query: z.string(),
    }),
    execute: Tool({
      method,
      key,
    }),
  });
