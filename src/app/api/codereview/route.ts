import { NextRequest, NextResponse } from "next/server";
import { reviewCode } from "@/graphs/codeGraph";

export async function POST(req: NextRequest) {
  try {
    const { code, language, threadId } = await req.json();
    if (!code?.trim()) return NextResponse.json({ error: "Code is required" }, { status: 400 });
    const report = await reviewCode(code, language ?? "typescript", threadId ?? `review-${Date.now()}`);
    return NextResponse.json({ report });
  } catch (e: any) {
    console.error("Code review error:", e);
    return NextResponse.json({ error: e.message ?? "Code review failed" }, { status: 500 });
  }
}
