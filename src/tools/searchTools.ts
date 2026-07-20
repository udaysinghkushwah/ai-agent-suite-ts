/**
 * src/tools/searchTools.ts
 * Web search tools: Tavily (preferred) with DuckDuckGo fallback + Wikipedia.
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ── Web search ───────────────────────────────────────────────────────────────

export const webSearch = tool(
  async ({ query }: { query: string }): Promise<string> => {
    const tavilyKey = process.env.TAVILY_API_KEY;

    // Try Tavily first
    if (tavilyKey && tavilyKey !== "your_tavily_api_key_here") {
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query,
            max_results: 5,
            search_depth: "basic",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          return (data.results as any[])
            .map(
              (r: any, i: number) =>
                `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`
            )
            .join("\n\n");
        }
      } catch {
        // fall through to DuckDuckGo
      }
    }

    // DuckDuckGo fallback via HTML scrape
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://html.duckduckgo.com/html/?q=${encoded}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; LangGraph-Agent/1.0)",
          },
        }
      );
      const html = await res.text();
      // Extract result snippets from DuckDuckGo HTML
      const snippets: string[] = [];
      const regex =
        /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      let match;
      while ((match = regex.exec(html)) !== null && snippets.length < 5) {
        snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
      }
      return snippets.length > 0
        ? snippets.map((s, i) => `[${i + 1}] ${s}`).join("\n\n")
        : `No results found for: ${query}`;
    } catch (e) {
      return `Search failed: ${e}`;
    }
  },
  {
    name: "web_search",
    description:
      "Search the web for current information about any topic. Returns relevant results.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);

// ── Wikipedia search ─────────────────────────────────────────────────────────

export const searchWikipedia = tool(
  async ({ query }: { query: string }): Promise<string> => {
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
      );
      if (res.ok) {
        const data = await res.json();
        return `**${data.title}**\n\n${data.extract}\n\nSource: ${data.content_urls?.desktop?.page ?? "Wikipedia"}`;
      }
      // Try search API
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&srlimit=3`
      );
      const searchData = await searchRes.json();
      const results = searchData?.query?.search ?? [];
      return results
        .map(
          (r: any) =>
            `**${r.title}**\n${r.snippet.replace(/<[^>]+>/g, "")}`
        )
        .join("\n\n");
    } catch (e) {
      return `Wikipedia search failed: ${e}`;
    }
  },
  {
    name: "search_wikipedia",
    description:
      "Search Wikipedia for encyclopedic information about a topic, person, place, or concept.",
    schema: z.object({
      query: z.string().describe("The Wikipedia search query"),
    }),
  }
);
