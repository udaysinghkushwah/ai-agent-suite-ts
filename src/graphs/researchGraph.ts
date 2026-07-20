/**
 * src/graphs/researchGraph.ts
 * LangGraph research agent: Plan → Search → Summarize → Report
 */
import { StateGraph, START, END, MemorySaver, Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getLLM, RESEARCH_SYSTEM } from "@/config/settings";
import { webSearch, searchWikipedia } from "@/tools/searchTools";

// ── State ────────────────────────────────────────────────────────────────────

const ResearchStateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  queries: Annotation<string[]>,
  searchResults: Annotation<string[]>({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  summary: Annotation<string>,
  report: Annotation<string>,
  messages: Annotation<(HumanMessage | AIMessage)[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

type ResearchState = typeof ResearchStateAnnotation.State;

// ── Nodes ────────────────────────────────────────────────────────────────────

async function plannerNode(state: ResearchState): Promise<Partial<ResearchState>> {
  const llm = getLLM(0.3);
  const response = await llm.invoke([
    { role: "system", content: RESEARCH_SYSTEM },
    new HumanMessage(
      `Generate 4 specific search queries to research this topic thoroughly: "${state.topic}"\n` +
      "Return ONLY the queries, one per line, no numbering or extra text."
    ),
  ]);
  const queries = String(response.content)
    .trim()
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, 4);
  return {
    queries,
    messages: [new AIMessage(`📋 Generated ${queries.length} search queries`)],
  };
}

async function searcherNode(state: ResearchState): Promise<Partial<ResearchState>> {
  const results: string[] = [];
  for (const query of state.queries) {
    try {
      const result = await webSearch.invoke({ query });
      results.push(`**Query:** ${query}\n\n${result}`);
    } catch {
      results.push(`**Query:** ${query}\n\nSearch failed.`);
    }
  }
  try {
    const wikiResult = await searchWikipedia.invoke({ query: state.topic });
    results.push(`**Wikipedia:** ${state.topic}\n\n${wikiResult}`);
  } catch {}
  return {
    searchResults: results,
    messages: [new AIMessage(`🔍 Completed ${results.length} searches.`)],
  };
}

async function summarizerNode(state: ResearchState): Promise<Partial<ResearchState>> {
  const llm = getLLM(0.3);
  const allResults = state.searchResults.join("\n\n" + "=".repeat(60) + "\n\n");
  const response = await llm.invoke([
    { role: "system", content: RESEARCH_SYSTEM },
    new HumanMessage(
      `Topic: ${state.topic}\n\nSearch Results:\n${allResults.slice(0, 8000)}\n\n` +
      "Synthesize these results into a concise, factual summary (400-600 words). " +
      "Focus on key facts, trends, and insights."
    ),
  ]);
  return {
    summary: String(response.content),
    messages: [new AIMessage("📝 Research synthesized.")],
  };
}

async function reportWriterNode(state: ResearchState): Promise<Partial<ResearchState>> {
  const llm = getLLM(0.5);
  const response = await llm.invoke([
    { role: "system", content: RESEARCH_SYSTEM },
    new HumanMessage(
      `Write a comprehensive research report on: **${state.topic}**\n\n` +
      `Based on this research summary:\n${state.summary}\n\n` +
      "Format with:\n# [Title]\n## Executive Summary\n## Key Findings\n## Detailed Analysis\n## Conclusions\n## Further Reading"
    ),
  ]);
  return {
    report: String(response.content),
    messages: [new AIMessage("✅ Research report complete!")],
  };
}

// ── Graph Builder ────────────────────────────────────────────────────────────

let _researchGraph: ReturnType<typeof buildResearchGraph> | null = null;

export function buildResearchGraph() {
  const builder = new StateGraph(ResearchStateAnnotation);
  builder.addNode("planner", plannerNode);
  builder.addNode("searcher", searcherNode);
  builder.addNode("summarizer", summarizerNode);
  builder.addNode("reportWriter", reportWriterNode);

  builder.addEdge(START, "planner");
  builder.addEdge("planner", "searcher");
  builder.addEdge("searcher", "summarizer");
  builder.addEdge("summarizer", "reportWriter");
  builder.addEdge("reportWriter", END);

  const memory = new MemorySaver();
  return builder.compile({ checkpointer: memory });
}

export async function runResearch(topic: string, threadId = "research-1"): Promise<string> {
  if (!_researchGraph) _researchGraph = buildResearchGraph();
  const config = { configurable: { thread_id: threadId } };
  const result = await _researchGraph.invoke(
    { topic, queries: [], searchResults: [], summary: "", report: "", messages: [] },
    config
  );
  return result.report;
}
