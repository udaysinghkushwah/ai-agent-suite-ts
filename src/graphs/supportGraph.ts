/**
 * src/graphs/supportGraph.ts
 * LangGraph customer support agent: Intent → RAG → Answer → Escalate
 */
import { StateGraph, START, END, MemorySaver, Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getLLM, SUPPORT_SYSTEM } from "@/config/settings";
import { searchKnowledgeBase } from "@/tools/ragTools";

// ── State ────────────────────────────────────────────────────────────────────

const SupportStateAnnotation = Annotation.Root({
  userQuery: Annotation<string>,
  intent: Annotation<string>,
  retrievedDocs: Annotation<string>,
  answer: Annotation<string>,
  confidence: Annotation<"high" | "medium" | "low">,
  escalate: Annotation<boolean>,
  messages: Annotation<(HumanMessage | AIMessage)[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

type SupportState = typeof SupportStateAnnotation.State;

// ── Nodes ────────────────────────────────────────────────────────────────────

async function intentClassifierNode(state: SupportState): Promise<Partial<SupportState>> {
  const llm = getLLM(0.1);
  const response = await llm.invoke([
    new HumanMessage(
      `Classify this customer support query into ONE category: [billing, account, technical, security, general]\n\nQuery: ${state.userQuery}\n\nReturn ONLY the category word.`
    ),
  ]);
  const validIntents = new Set(["billing", "account", "technical", "security", "general"]);
  const intent = String(response.content).trim().toLowerCase();
  return {
    intent: validIntents.has(intent) ? intent : "general",
    messages: [new AIMessage(`🏷️ Intent: ${intent}`)],
  };
}

async function retrieverNode(state: SupportState): Promise<Partial<SupportState>> {
  const query = `${state.userQuery} ${state.intent}`;
  const docs = await searchKnowledgeBase.invoke({ query, k: 3 });
  return {
    retrievedDocs: docs,
    messages: [new AIMessage("📚 Knowledge base searched.")],
  };
}

async function answerGeneratorNode(state: SupportState): Promise<Partial<SupportState>> {
  const llm = getLLM(0.3);
  const response = await llm.invoke([
    { role: "system", content: SUPPORT_SYSTEM },
    new HumanMessage(
      `Customer Query: ${state.userQuery}\nIntent: ${state.intent}\n\nKnowledge Base:\n${state.retrievedDocs}\n\n` +
      "Provide a helpful, empathetic support response. At the end add exactly one of: " +
      "[CONFIDENCE: HIGH], [CONFIDENCE: MEDIUM], or [CONFIDENCE: LOW]"
    ),
  ]);

  let content = String(response.content);
  let confidence: "high" | "medium" | "low" = "medium";

  if (content.includes("[CONFIDENCE: HIGH]")) {
    confidence = "high";
    content = content.replace("[CONFIDENCE: HIGH]", "").trim();
  } else if (content.includes("[CONFIDENCE: LOW]")) {
    confidence = "low";
    content = content.replace("[CONFIDENCE: LOW]", "").trim();
  } else {
    content = content.replace("[CONFIDENCE: MEDIUM]", "").trim();
  }

  return {
    answer: content,
    confidence,
    messages: [new AIMessage(content)],
  };
}

async function escalationCheckNode(state: SupportState): Promise<Partial<SupportState>> {
  if (state.confidence === "low") {
    const ticketId = `TICKET-${(Math.abs(state.userQuery.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 100000).toString().padStart(5, "0")}`;
    return {
      escalate: true,
      messages: [
        new AIMessage(
          `\n\n---\n⚠️ **Escalated to human agent.** A specialist will follow up within 4 hours. Reference: ${ticketId}`
        ),
      ],
    };
  }
  return { escalate: false };
}

// ── Graph Builder ────────────────────────────────────────────────────────────

let _supportGraph: ReturnType<typeof buildSupportGraph> | null = null;

export function buildSupportGraph() {
  const builder = new StateGraph(SupportStateAnnotation) as any;

  builder.addNode("intentClassifier", intentClassifierNode);
  builder.addNode("retriever", retrieverNode);
  builder.addNode("answerGenerator", answerGeneratorNode);
  builder.addNode("escalationCheck", escalationCheckNode);

  builder.addEdge(START, "intentClassifier");
  builder.addEdge("intentClassifier", "retriever");
  builder.addEdge("retriever", "answerGenerator");
  builder.addEdge("answerGenerator", "escalationCheck");
  builder.addEdge("escalationCheck", END);

  const memory = new MemorySaver();
  return builder.compile({ checkpointer: memory });
}

export async function answerSupportQuery(
  query: string,
  threadId = "support-1"
): Promise<{ answer: string; intent: string; confidence: string; escalated: boolean }> {
  if (!_supportGraph) _supportGraph = buildSupportGraph();
  const config = { configurable: { thread_id: threadId } };
  const result = await _supportGraph.invoke(
    {
      userQuery: query,
      intent: "",
      retrievedDocs: "",
      answer: "",
      confidence: "medium",
      escalate: false,
      messages: [new HumanMessage(query)],
    },
    config
  );
  return {
    answer: result.answer,
    intent: result.intent,
    confidence: result.confidence,
    escalated: result.escalate,
  };
}
