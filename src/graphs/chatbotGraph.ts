/**
 * src/graphs/chatbotGraph.ts
 * LangGraph conversational chatbot with persistent memory and tool use.
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
import { getLLM, CHATBOT_SYSTEM } from "@/config/settings";
import { webSearch, searchWikipedia } from "@/tools/searchTools";

// ── Extra tools ───────────────────────────────────────────────────────────────

const calculator = tool(
  ({ expression }: { expression: string }): string => {
    try {
      // Safe math evaluation
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
      const result = Function(`"use strict"; return (${sanitized})`)(); // eslint-disable-line
      return `${expression} = ${result}`;
    } catch (e) {
      return `Calculation error: ${e}`;
    }
  },
  {
    name: "calculator",
    description: "Evaluate a math expression. Example: '15 * 8.5 / 100'",
    schema: z.object({ expression: z.string() }),
  }
);

const getCurrentDatetime = tool(
  (): string => {
    const now = new Date();
    return (
      `Date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n` +
      `Time: ${now.toLocaleTimeString("en-US")}`
    );
  },
  {
    name: "get_current_datetime",
    description: "Get the current date and time.",
    schema: z.object({}),
  }
);

const CHATBOT_TOOLS = [webSearch, searchWikipedia, calculator, getCurrentDatetime];

// ── Graph Nodes ───────────────────────────────────────────────────────────────

async function chatNode(state: { messages: BaseMessage[] }): Promise<{ messages: BaseMessage[] }> {
  const llm = getLLM(0.7);
  const llmWithTools = llm.bindTools(CHATBOT_TOOLS);
  const messages = [{ role: "system", content: CHATBOT_SYSTEM }, ...state.messages];
  const response = await llmWithTools.invoke(messages);
  return { messages: [response] };
}

function shouldContinue(state: { messages: BaseMessage[] }): "tools" | typeof END {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  if (last.tool_calls && last.tool_calls.length > 0) return "tools";
  return END;
}

// ── Graph Builder ─────────────────────────────────────────────────────────────

const chatbotGraphs = new Map<string, ReturnType<typeof buildChatbotGraph>>();

export function buildChatbotGraph() {
  const builder = new StateGraph(MessagesAnnotation) as any;
  const toolNode = new ToolNode(CHATBOT_TOOLS);

  builder.addNode("chat", chatNode);
  builder.addNode("tools", toolNode);

  builder.addEdge(START, "chat");
  builder.addConditionalEdges("chat", shouldContinue, { tools: "tools", [END]: END });
  builder.addEdge("tools", "chat");

  const memory = new MemorySaver();
  return builder.compile({ checkpointer: memory });
}

export async function chat(
  message: string,
  threadId = "chat-1"
): Promise<string> {
  if (!chatbotGraphs.has(threadId)) {
    chatbotGraphs.set(threadId, buildChatbotGraph());
  }
  const graph = chatbotGraphs.get(threadId)!;
  const config = { configurable: { thread_id: threadId } };
  const result = await graph.invoke(
    { messages: [new HumanMessage(message)] },
    config
  );
  const last = result.messages[result.messages.length - 1];
  return String(last.content);
}
