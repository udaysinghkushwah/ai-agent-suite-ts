/**
 * src/config/settings.ts
 * Shared LLM factory, system prompts, and LangSmith configuration.
 */
import { ChatAnthropic } from "@langchain/anthropic";

// LangSmith tracing is auto-configured via env vars:
//   LANGCHAIN_TRACING_V2=true
//   LANGCHAIN_API_KEY=...
//   LANGCHAIN_PROJECT=ai-agent-suite-ts

let _llm: ChatAnthropic | null = null;

export function getLLM(temperature = 0.7): ChatAnthropic {
  if (!_llm) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing ANTHROPIC_API_KEY. Copy .env.local.example to .env.local and add your key."
      );
    }
    _llm = new ChatAnthropic({
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
      maxTokens: 4096,
      temperature,
      apiKey,
    });
  }
  return _llm.bind({ temperature } as any) as unknown as ChatAnthropic;
}

// ── System prompts ──────────────────────────────────────────────

export const RESEARCH_SYSTEM = `You are an expert research assistant.
Your job is to gather information, synthesize findings, and produce clear,
well-structured research reports. Always cite your sources.`;

export const CHATBOT_SYSTEM = `You are a helpful, friendly AI assistant
with access to various tools. Be concise, accurate, and engaging. Remember the
conversation history and refer to it naturally.`;

export const SUPPORT_SYSTEM = `You are a professional customer support agent.
Use the knowledge base to answer questions accurately. If you cannot find a
confident answer, escalate politely. Be empathetic and solution-focused.`;

export const CODE_REVIEW_SYSTEM = `You are an expert software engineer
performing code reviews. Analyze code for correctness, style, performance, and
security issues. Provide actionable, constructive feedback with severity ratings.`;

export const GENERAL_SYSTEM = `You are a versatile AI assistant with access
to powerful tools. Use them thoughtfully to answer questions and complete tasks.
Think step-by-step before acting.`;
