/**
 * src/graphs/generalGraph.ts
 * LangGraph ReAct agent: Think → Act (tools) → Observe → Repeat
 */
import {
  StateGraph,
  START,
  END,
  MemorySaver,
  MessagesAnnotation,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getLLM, GENERAL_SYSTEM } from "@/config/settings";
import { webSearch, searchWikipedia } from "@/tools/searchTools";

// ── General-purpose tools ────────────────────────────────────────────────────

const calculator = tool(
  ({ expression }: { expression: string }): string => {
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
      const result = Function(`"use strict"; return (${sanitized})`)(); // eslint-disable-line
      return `Result: ${result}`;
    } catch (e) {
      return `Calculation error: ${e}`;
    }
  },
  {
    name: "calculator",
    description: "Evaluate math expressions. Example: '15 * 8.5 / 100', '2 ** 10'",
    schema: z.object({ expression: z.string() }),
  }
);

const getCurrentDatetime = tool(
  (): string => {
    const now = new Date();
    return [
      `Date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      `Time: ${now.toLocaleTimeString("en-US")}`,
      `ISO: ${now.toISOString()}`,
    ].join("\n");
  },
  {
    name: "get_current_datetime",
    description: "Get the current date and time.",
    schema: z.object({}),
  }
);

const wordCount = tool(
  ({ text }: { text: string }): string => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const sentences = (text.match(/[.!?]+/g) ?? []).length;
    return `Words: ${words} | Characters: ${chars} | Sentences: ${sentences}`;
  },
  {
    name: "word_count",
    description: "Count words, characters, and sentences in text.",
    schema: z.object({ text: z.string().describe("Text to analyze") }),
  }
);

const GENERAL_TOOLS = [webSearch, searchWikipedia, calculator, getCurrentDatetime, wordCount];

// ── Graph Nodes ───────────────────────────────────────────────────────────────

async function agentNode(state: { messages: BaseMessage[] }): Promise<{ messages: BaseMessage[] }> {
  const llm = getLLM(0.5);
  const llmWithTools = llm.bindTools(GENERAL_TOOLS);
  const messages = [{ role: "system", content: GENERAL_SYSTEM }, ...state.messages];
  const response = await llmWithTools.invoke(messages);
  return { messages: [response] };
}

function shouldContinue(state: { messages: BaseMessage[] }): "tools" | typeof END {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  if (last.tool_calls && last.tool_calls.length > 0) return "tools";
  return END;
}

// ── Graph Builder ─────────────────────────────────────────────────────────────

const generalGraphs = new Map<string, ReturnType<typeof buildGeneralGraph>>();

export function buildGeneralGraph() {
  const builder = new StateGraph(MessagesAnnotation) as any;
  const toolNode = new ToolNode(GENERAL_TOOLS);

  builder.addNode("agent", agentNode);
  builder.addNode("tools", toolNode);

  builder.addEdge(START, "agent");
  builder.addConditionalEdges("agent", shouldContinue, { tools: "tools", [END]: END });
  builder.addEdge("tools", "agent");

  const memory = new MemorySaver();
  return builder.compile({ checkpointer: memory });
}

export async function runGeneralAgent(
  query: string,
  threadId = "general-1"
): Promise<string> {
  if (!generalGraphs.has(threadId)) {
    generalGraphs.set(threadId, buildGeneralGraph());
  }
  const graph = generalGraphs.get(threadId)!;
  const config = { configurable: { thread_id: threadId } };
  const result = await graph.invoke(
    { messages: [new HumanMessage(query)] },
    config
  );
  const last = result.messages[result.messages.length - 1];
  return String(last.content);
}
