/**
 * src/tools/ragTools.ts
 * RAG tools using an in-memory vector store with cosine similarity.
 * Pre-loaded with a sample customer support knowledge base.
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ── Sample Knowledge Base ────────────────────────────────────────────────────

interface KBDoc {
  content: string;
  metadata: { category: string; topic: string };
}

const KNOWLEDGE_BASE: KBDoc[] = [
  {
    content:
      "To reset your password: Go to login page → click 'Forgot Password' → enter your email → check inbox for reset link → follow the link and set a new password. The link expires in 24 hours.",
    metadata: { category: "account", topic: "password_reset" },
  },
  {
    content:
      "Subscription plans: Basic ($9/mo) - 5 users, 10GB storage. Pro ($29/mo) - 25 users, 100GB storage, priority support. Enterprise ($99/mo) - unlimited users, 1TB storage, dedicated support manager.",
    metadata: { category: "billing", topic: "pricing" },
  },
  {
    content:
      "Refund policy: We offer full refunds within 30 days of purchase. After 30 days, pro-rated refunds are available. To request a refund, contact support@example.com with your order ID.",
    metadata: { category: "billing", topic: "refunds" },
  },
  {
    content:
      "Our API rate limits: Free tier: 100 requests/hour. Basic: 1,000 requests/hour. Pro: 10,000 requests/hour. Enterprise: unlimited. Rate limits reset every hour on the hour.",
    metadata: { category: "technical", topic: "api_limits" },
  },
  {
    content:
      "Data export: Go to Settings → Data Management → Export Data. You can export in CSV or JSON format. Large exports are sent via email. Exports include all user data, transactions, and logs.",
    metadata: { category: "technical", topic: "data_export" },
  },
  {
    content:
      "Two-factor authentication (2FA): Enable in Security Settings. We support authenticator apps (Google Authenticator, Authy) and SMS. Backup codes are provided when you enable 2FA.",
    metadata: { category: "security", topic: "2fa" },
  },
  {
    content:
      "Integrations supported: Slack, Zapier, GitHub, Google Workspace, Microsoft 365, Salesforce, HubSpot, Stripe. Setup guides are available in our documentation at docs.example.com/integrations.",
    metadata: { category: "technical", topic: "integrations" },
  },
  {
    content:
      "Team management: Owners can add/remove members, assign roles (Admin, Member, Viewer), and set permissions per workspace. Go to Settings → Team to manage your team.",
    metadata: { category: "account", topic: "team_management" },
  },
  {
    content:
      "Support hours: Live chat is available Monday-Friday 9am-6pm EST. Email support is 24/7 with response within 4 hours for Pro/Enterprise. Check status.example.com for system status.",
    metadata: { category: "support", topic: "contact" },
  },
  {
    content:
      "Mobile app: Available on iOS (App Store) and Android (Google Play). The mobile app supports all core features. Offline mode is available for Pro and Enterprise plans.",
    metadata: { category: "technical", topic: "mobile_app" },
  },
];

// ── Simple TF-IDF similarity (no heavy embeddings needed) ────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function tfidfSimilarity(query: string, doc: string): number {
  const qTokens = new Set(tokenize(query));
  const dTokens = tokenize(doc);
  const dSet = new Set(dTokens);

  let overlap = 0;
  for (const token of qTokens) {
    if (dSet.has(token)) overlap++;
  }

  if (qTokens.size === 0 || dSet.size === 0) return 0;
  // Jaccard-like similarity
  return overlap / (qTokens.size + dSet.size - overlap);
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const searchKnowledgeBase = tool(
  async ({ query, k = 3 }: { query: string; k?: number }): Promise<string> => {
    const scored = KNOWLEDGE_BASE.map((doc) => ({
      doc,
      score: tfidfSimilarity(query, doc.content),
    }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    if (scored.every((s) => s.score === 0)) {
      return "No relevant information found in the knowledge base.";
    }

    return scored
      .map(({ doc, score }, i) => {
        const confidence =
          score > 0.15 ? "High" : score > 0.05 ? "Medium" : "Low";
        return `[Result ${i + 1} | Confidence: ${confidence} | Category: ${doc.metadata.category}]\n${doc.content}`;
      })
      .join("\n\n---\n\n");
  },
  {
    name: "search_knowledge_base",
    description:
      "Search the customer support knowledge base for relevant information about a user query.",
    schema: z.object({
      query: z.string().describe("The search query"),
      k: z.number().optional().describe("Number of results to return (default: 3)"),
    }),
  }
);
