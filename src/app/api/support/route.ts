import { NextRequest, NextResponse } from "next/server";
import { answerSupportQuery } from "@/graphs/supportGraph";

export async function POST(req: NextRequest) {
  try {
    const { query, threadId } = await req.json();
    if (!query?.trim()) return NextResponse.json({ error: "Query is required" }, { status: 400 });
    const result = await answerSupportQuery(query, threadId ?? `support-${Date.now()}`);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Support agent error:", e);
    return NextResponse.json({ error: e.message ?? "Support failed" }, { status: 500 });
  }
}
