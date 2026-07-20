import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/graphs/chatbotGraph";

export async function POST(req: NextRequest) {
  try {
    const { message, threadId } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });
    const response = await chat(message, threadId ?? "chat-1");
    return NextResponse.json({ response });
  } catch (e: any) {
    console.error("Chatbot error:", e);
    return NextResponse.json({ error: e.message ?? "Chat failed" }, { status: 500 });
  }
}
