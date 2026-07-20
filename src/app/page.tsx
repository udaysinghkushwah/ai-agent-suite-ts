"use client";

import { useState, useRef, useEffect } from "react";

// ── Simple markdown renderer (no external deps) ────────────────────────────
function MarkdownOutput({ content }: { content: string }) {
  const html = content
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul]|<li|<hr|<p)(.+)$/gm, '<p>$1</p>');

  return (
    <div
      className="output-panel fade-in"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}


// ── Types ──────────────────────────────────────────────────────────────────

type AgentId = "dashboard" | "research" | "chatbot" | "support" | "codereview" | "general";

interface NavItem {
  id: AgentId;
  emoji: string;
  label: string;
  description: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Nav config ─────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", emoji: "🏠", label: "Dashboard", description: "Overview" },
  { id: "research", emoji: "🔍", label: "Research Assistant", description: "Multi-step research reports" },
  { id: "chatbot", emoji: "💬", label: "Chatbot", description: "Multi-turn memory chat" },
  { id: "support", emoji: "🧑‍💼", label: "Customer Support", description: "RAG-powered Q&A" },
  { id: "codereview", emoji: "🛠️", label: "Code Review", description: "AI code analysis" },
  { id: "general", emoji: "⚡", label: "General ReAct", description: "Flexible tool agent" },
];



// ── Loading dots ───────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <div className="loading-dots">
      <span /><span /><span />
    </div>
  );
}

// ── API helper ─────────────────────────────────────────────────────────────
async function callApi<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(`/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

// ══════════════════════════════════════════════════════════════════════════════
// AGENT PANELS
// ══════════════════════════════════════════════════════════════════════════════

function DashboardPanel() {
  const cards = [
    { emoji: "🔍", title: "Research Assistant", tag: "Plan→Search→Report", desc: "Type a topic, get a structured research report.", color: "#6366f1" },
    { emoji: "💬", title: "Chatbot", tag: "Memory + Tool Use", desc: "Persistent multi-turn chat with web search and calculator.", color: "#8b5cf6" },
    { emoji: "🧑‍💼", title: "Customer Support", tag: "RAG + Escalation", desc: "Answers from a knowledge base, auto-escalates uncertain queries.", color: "#06b6d4" },
    { emoji: "🛠️", title: "Code Review", tag: "Static + AI Analysis", desc: "Paste code → full review with severity ratings.", color: "#f59e0b" },
    { emoji: "⚡", title: "General ReAct", tag: "6 Tools Available", desc: "Web search, math, Wikipedia, word count, and more.", color: "#22c55e" },
  ];

  return (
    <div className="fade-in">
      <div className="hero-banner">
        <div className="hero-title">🤖 AI Agent Suite</div>
        <div className="hero-sub">5 specialized AI agents · LangChain.js · LangGraph · LangSmith · Claude</div>
        <div className="hero-badges">
          <span className="badge">⚡ LangGraph Workflows</span>
          <span className="badge">🔗 LangChain.js Tools</span>
          <span className="badge">📊 LangSmith Tracing</span>
          <span className="badge">🧠 Claude claude-3-5-sonnet</span>
          <span className="badge">🟦 TypeScript</span>
        </div>
      </div>

      <p className="page-desc">Select an agent from the sidebar. Every run is traced in LangSmith automatically.</p>

      <div className="grid-2">
        {cards.map((c) => (
          <div className="card" key={c.title}>
            <div style={{ fontSize: "1.8rem" }}>{c.emoji}</div>
            <div style={{ fontWeight: 600, marginTop: "0.4rem" }}>{c.title}</div>
            <div style={{ fontSize: "0.72rem", color: c.color, marginTop: "0.2rem" }}>{c.tag}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>{c.desc}</div>
          </div>
        ))}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ fontSize: "1.5rem" }}>📊</div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>LangSmith Traces</div>
          <a href="https://smith.langchain.com" target="_blank" rel="noreferrer"
            style={{ fontSize: "0.78rem", color: "var(--primary-light)", textDecoration: "underline" }}>
            View at smith.langchain.com →
          </a>
        </div>
      </div>

      <hr className="divider" />
      <div className="section-label">Tech Stack</div>
      <div className="grid-3">
        {[
          { title: "LangChain.js", items: ["Tool definitions", "LLM integration", "Prompt management"] },
          { title: "LangGraph", items: ["Stateful workflows", "Memory persistence", "ReAct loops", "Conditional routing"] },
          { title: "LangSmith", items: ["Full run tracing", "Step-by-step logs", "Latency tracking", "Error debugging"] },
        ].map((s) => (
          <div className="card" key={s.title}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "var(--primary-light)" }}>{s.title}</div>
            {s.items.map((i) => <div key={i} style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.1rem 0" }}>• {i}</div>)}
          </div>
        ))}
      </div>

      <hr className="divider" />
      <div style={{ display: "flex", gap: "1.5rem", background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", alignItems: "center" }}>
        <div style={{ padding: "0.4rem", background: "white", borderRadius: "10px", flexShrink: 0, width: "130px" }}>
          <img src="/upi-qr.jpg" alt="UPI QR Code" style={{ width: "100%", height: "auto", display: "block", borderRadius: "6px" }} />
        </div>
        <div>
          <h3 style={{ margin: 0, color: "var(--primary-light)", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem" }}>☕ Buy Me a Coffee</h3>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            If you find this suite of AI agents useful, feel free to support my work by buying me a coffee. Scan the QR code using any UPI app. Thank you!
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Research Panel ─────────────────────────────────────────────────────────

function ResearchPanel() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const STEPS = ["📋 Planning queries…", "🔍 Searching the web…", "📝 Synthesizing results…", "✍️ Writing report…"];

  const examples = [
    "The impact of AI on software development in 2024",
    "Climate change mitigation technologies",
    "The history and future of space exploration",
  ];

  async function handleResearch() {
    if (!topic.trim()) return;
    setLoading(true);
    setReport("");
    setError("");
    setSteps([]);

    // Animate steps
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < STEPS.length) {
        setSteps((s) => [...s, STEPS[stepIdx]]);
        stepIdx++;
      } else {
        clearInterval(interval);
      }
    }, 1800);

    try {
      const data = await callApi<{ report: string }>("research", { topic, threadId: `research-${Date.now()}` });
      setReport(data.report);
    } catch (e: any) {
      setError(e.message);
    } finally {
      clearInterval(interval);
      setLoading(false);
      setSteps([]);
    }
  }

  return (
    <div className="fade-in">
      <div className="page-title">🔍 Research Assistant</div>
      <div className="page-desc">Enter a topic and get a comprehensive multi-source research report.</div>

      <label>Research Topic</label>
      <input
        className="input"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g., The future of quantum computing in cryptography"
        onKeyDown={(e) => e.key === "Enter" && !loading && handleResearch()}
      />

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={handleResearch} disabled={loading || !topic.trim()}>
          {loading ? <><span className="loading-spinner" /> Researching…</> : "🚀 Start Research"}
        </button>
        {examples.map((ex) => (
          <button key={ex} className="btn btn-secondary" onClick={() => setTopic(ex)} style={{ fontSize: "0.75rem" }}>
            {ex.slice(0, 30)}…
          </button>
        ))}
      </div>

      {loading && steps.length > 0 && (
        <div className="info-panel" style={{ marginTop: "1rem" }}>
          {steps.map((s, i) => (
            <div className="step-row" key={i}>
              <div className={`step-icon ${i < steps.length - 1 ? "done" : "active"}`}>{i < steps.length - 1 ? "✓" : "•"}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="info-panel alert-error" style={{ marginTop: "1rem" }}>❌ {error}</div>}
      {report && (
        <>
          <div className="info-panel alert-success" style={{ marginTop: "1rem" }}>✅ Research complete! Traces available in LangSmith.</div>
          <MarkdownOutput content={report} />
        </>
      )}
    </div>
  );
}

// ── Chatbot Panel ──────────────────────────────────────────────────────────

function ChatbotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId] = useState(`chat-${Date.now()}`);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const data = await callApi<{ response: string }>("chat", { message: userMsg, threadId });
      setMessages((m) => [...m, { role: "assistant", content: data.response }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `❌ Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <div className="page-title">💬 Conversational Chatbot</div>
          <div className="page-desc">Multi-turn AI chat with memory, web search, calculator & datetime tools.</div>
        </div>
        <button className="btn btn-secondary" onClick={() => { setMessages([]); window.location.reload(); }} style={{ fontSize: "0.75rem" }}>
          🗑️ Clear
        </button>
      </div>

      <div className="chat-window">
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💬</div>
            <div>Start a conversation! Try: "What&apos;s 15% of $127?" or "Search for latest AI news"</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className={`chat-avatar ${m.role === "user" ? "user" : "bot"}`}>
              {m.role === "user" ? "👤" : "🤖"}
            </div>
            <div className={`chat-bubble ${m.role === "user" ? "user" : "bot"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg">
            <div className="chat-avatar bot">🤖</div>
            <div className="chat-bubble bot"><LoadingDots /></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the chatbot…"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? <span className="loading-spinner" /> : "Send →"}
        </button>
      </div>
    </div>
  );
}

// ── Support Panel ──────────────────────────────────────────────────────────

function SupportPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ answer: string; intent: string; confidence: string; escalated: boolean } | null>(null);
  const [error, setError] = useState("");

  const examples = [
    "How do I reset my password?",
    "What's the refund policy?",
    "How do I enable two-factor authentication?",
    "What are the API rate limits?",
    "How do I export my data?",
  ];

  async function handleSupport() {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const data = await callApi<{ answer: string; intent: string; confidence: string; escalated: boolean }>(
        "support", { query, threadId: `support-${Date.now()}` }
      );
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const confColor = { high: "var(--green)", medium: "var(--yellow)", low: "var(--red)" }[result?.confidence ?? "medium"] ?? "var(--yellow)";

  return (
    <div className="fade-in">
      <div className="page-title">🧑‍💼 Customer Support Agent</div>
      <div className="page-desc">RAG-powered support agent. Answers from a knowledge base, auto-escalates uncertain queries.</div>

      <label>Your Query</label>
      <textarea className="textarea" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., How do I reset my password?" rows={3} />

      <div className="section-label">Example queries</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
        {examples.map((ex) => (
          <button key={ex} className="btn btn-secondary" onClick={() => setQuery(ex)} style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}>
            {ex}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" onClick={handleSupport} disabled={loading || !query.trim()}>
        {loading ? <><span className="loading-spinner" /> Searching KB…</> : "🎧 Get Answer"}
      </button>

      {error && <div className="info-panel alert-error" style={{ marginTop: "1rem" }}>❌ {error}</div>}

      {result && (
        <div className="fade-in">
          <div className="metrics-row" style={{ marginTop: "1rem" }}>
            <div className="metric-card">
              <div className="metric-value" style={{ fontSize: "1rem" }}>{result.intent.toUpperCase()}</div>
              <div className="metric-label">Intent</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ fontSize: "1rem", color: confColor }}>{result.confidence.toUpperCase()}</div>
              <div className="metric-label">Confidence</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ fontSize: "1rem", color: result.escalated ? "var(--red)" : "var(--green)" }}>
                {result.escalated ? "YES" : "NO"}
              </div>
              <div className="metric-label">Escalated</div>
            </div>
          </div>
          {result.escalated && <div className="info-panel alert-warning">⚠️ This query has been flagged for human agent follow-up.</div>}
          <MarkdownOutput content={result.answer} />
        </div>
      )}
    </div>
  );
}

// ── Code Review Panel ──────────────────────────────────────────────────────

const SAMPLE_CODE = `// Example TypeScript code with issues
function authenticateUser(username: string, password: string = "admin123") {
  const query = \`SELECT * FROM users WHERE username='\${username}'\`;
  
  if (username === "admin" && password === "admin123") {
    const token = eval(\`generateToken('\${username}')\`);
    return { token, role: "admin" };
  }

  const result = document.getElementById("output")!;
  result.innerHTML = \`Welcome, \${username}!\`;  // XSS risk
  
  return null;
}

function processItems(items: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (items[i] > items[j]) {
        result.push(items[i]);
      }
    }
  }
  return result;
}`;

function CodeReviewPanel() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [language, setLanguage] = useState("typescript");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  async function handleReview() {
    if (!code.trim()) return;
    setLoading(true);
    setReport("");
    setError("");
    setProgress(0);

    const interval = setInterval(() => setProgress((p) => Math.min(p + 18, 90)), 600);

    try {
      const data = await callApi<{ report: string }>("codereview", { code, language, threadId: `review-${Date.now()}` });
      setReport(data.report);
      setProgress(100);
    } catch (e: any) {
      setError(e.message);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div>
          <div className="page-title">🛠️ Code Review Agent</div>
          <div className="page-desc">Paste code for full AI-powered review: syntax, security, complexity, and AI feedback.</div>
        </div>
        <div>
          <label style={{ marginBottom: "0.25rem" }}>Language</label>
          <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: "150px" }}>
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="go">Go</option>
          </select>
        </div>
      </div>

      <label>Code</label>
      <textarea className="textarea" value={code} onChange={(e) => setCode(e.target.value)} rows={14} style={{ minHeight: "280px" }} />

      <button className="btn btn-primary" onClick={handleReview} disabled={loading || !code.trim()} style={{ marginTop: "0.75rem" }}>
        {loading ? (
          <><span className="loading-spinner" /> Analyzing… ({progress}%)</>
        ) : "🔍 Run Code Review"}
      </button>

      {error && <div className="info-panel alert-error" style={{ marginTop: "1rem" }}>❌ {error}</div>}
      {report && (
        <>
          <div className="info-panel alert-success" style={{ marginTop: "1rem" }}>✅ Review complete!</div>
          <MarkdownOutput content={report} />
        </>
      )}
    </div>
  );
}

// ── General Agent Panel ────────────────────────────────────────────────────

function GeneralPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [threadId] = useState(`general-${Date.now()}`);

  const examples = [
    "What is 15% tip on a $127.50 restaurant bill?",
    "Search for the latest news about artificial intelligence",
    "Count the words in: 'The quick brown fox jumps over the lazy dog'",
    "What day of the week is today?",
    "What is 2 to the power of 20?",
  ];

  async function handleRun() {
    if (!query.trim()) return;
    setLoading(true);
    setResponse("");
    setError("");
    try {
      const data = await callApi<{ response: string }>("general", { query, threadId });
      setResponse(data.response);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const tools = [
    { name: "🔍 web_search", desc: "Search the web" },
    { name: "📖 search_wikipedia", desc: "Search Wikipedia" },
    { name: "🔢 calculator", desc: "Math expressions" },
    { name: "🕐 get_current_datetime", desc: "Current date/time" },
    { name: "📝 word_count", desc: "Count words/chars" },
  ];

  return (
    <div className="fade-in">
      <div className="page-title">⚡ General Purpose ReAct Agent</div>
      <div className="page-desc">A flexible agent with 5 tools. Ask anything — it reasons, uses tools, and delivers results.</div>

      <div className="section-label">Available Tools</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
        {tools.map((t) => (
          <span key={t.name} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.3rem 0.65rem", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--primary-light)" }}>{t.name}</strong> — {t.desc}
          </span>
        ))}
      </div>

      <label>Your Query</label>
      <input
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask the agent anything…"
        onKeyDown={(e) => e.key === "Enter" && !loading && handleRun()}
      />

      <div className="section-label">Examples</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
        {examples.map((ex) => (
          <button key={ex} className="btn btn-secondary" onClick={() => setQuery(ex)} style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}>
            {ex.slice(0, 40)}{ex.length > 40 ? "…" : ""}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" onClick={handleRun} disabled={loading || !query.trim()}>
        {loading ? <><span className="loading-spinner" /> Running agent…</> : "⚡ Run Agent"}
      </button>

      {error && <div className="info-panel alert-error" style={{ marginTop: "1rem" }}>❌ {error}</div>}
      {response && (
        <>
          <div className="info-panel alert-success" style={{ marginTop: "1rem" }}>✅ Done! Traces in LangSmith.</div>
          <MarkdownOutput content={response} />
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function Home() {
  const [activeAgent, setActiveAgent] = useState<AgentId>("dashboard");

  const panels: Record<AgentId, React.ReactNode> = {
    dashboard: <DashboardPanel />,
    research: <ResearchPanel />,
    chatbot: <ChatbotPanel />,
    support: <SupportPanel />,
    codereview: <CodeReviewPanel />,
    general: <GeneralPanel />,
  };

  const envOk = typeof window !== "undefined";

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🤖</div>
          <div className="logo-title">AI Agent Suite</div>
          <div className="logo-sub">TypeScript Edition</div>
        </div>

        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeAgent === item.id ? "active" : ""}`}
            onClick={() => setActiveAgent(item.id)}
          >
            <span className="nav-emoji">{item.emoji}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <div className="sidebar-status">
          <div className="section-label" style={{ marginBottom: "0.5rem" }}>Status</div>
          <div className="status-item">
            <div className="status-dot online" />
            <span>Next.js Server</span>
          </div>
          <div className="status-item">
            <div className="status-dot online" />
            <span>LangGraph Ready</span>
          </div>
          <div className="status-item">
            <div className="status-dot warning" />
            <span>LangSmith Tracing</span>
          </div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.65rem", color: "var(--text-muted)" }}>
            <a href="https://smith.langchain.com" target="_blank" rel="noreferrer" style={{ color: "var(--primary-light)" }}>
              View LangSmith →
            </a>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "1rem 0" }} />

          <div style={{ textAlign: "center" }}>
            <div className="section-label" style={{ marginBottom: "0.5rem" }}>☕ Buy me a coffee</div>
            <div style={{ padding: "0.3rem", background: "white", borderRadius: "8px", display: "inline-block", width: "110px", margin: "0 auto" }}>
              <img src="/upi-qr.jpg" alt="Buy Me a Coffee QR Code" style={{ width: "100%", height: "auto", display: "block", borderRadius: "4px" }} />
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
              Scan via UPI
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <div className="page-container">
          {panels[activeAgent]}
        </div>
      </main>
    </div>
  );
}
