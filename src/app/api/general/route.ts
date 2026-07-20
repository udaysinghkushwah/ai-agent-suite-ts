import { NextRequest, NextResponse } from "next/server";
import { runGeneralAgent } from "@/graphs/generalGraph";

export async function POST(req: NextRequest) {
  try {
    const { query, threadId } = await req.json();
    if (!query?.trim()) return NextResponse.json({ error: "Query is required" }, { status: 400 });
    const response = await runGeneralAgent(query, threadId ?? "general-1");
    return NextResponse.json({ response });
  } catch (e: any) {
    console.error("General agent error:", e);
    return NextResponse.json({ error: e.message ?? "Agent failed" }, { status: 500 });
  }
}
