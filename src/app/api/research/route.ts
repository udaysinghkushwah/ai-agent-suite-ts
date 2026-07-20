import { NextRequest, NextResponse } from "next/server";
import { runResearch } from "@/graphs/researchGraph";

export async function POST(req: NextRequest) {
  try {
    const { topic, threadId } = await req.json();
    if (!topic?.trim()) return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    const report = await runResearch(topic, threadId ?? `research-${Date.now()}`);
    return NextResponse.json({ report });
  } catch (e: any) {
    console.error("Research agent error:", e);
    return NextResponse.json({ error: e.message ?? "Research failed" }, { status: 500 });
  }
}
