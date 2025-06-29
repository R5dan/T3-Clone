import { tool } from "ai"
import { z } from "zod"

async function Search({ query }: { query: string }) {
  const params = new URLSearchParams({
    action: "opensearch",
    search: query
  })
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`)
  const json = await res.json() as [
    string,
    string[],
    string[],
    string[]
  ]
  const parsed = json[1].map((item, index) => [item, !json[2][index], !json[3][index]] as const).map(([title, description, url]) => ({
    title,
    description,
    url
  }))

  return parsed
}

export const TOOL = tool({
  description: "Search Wikipedia",
  parameters: z.object({
    query: z.string().describe("The query to search wikipedia for")
  }),
  execute: Search
})