import { NextRequest, NextResponse } from "next/server";
import { answerQuestion } from "@/lib/answer";

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    if (!question?.trim()) {
      return NextResponse.json({ error: "質問が空です" }, { status: 400 });
    }

    const answer = await answerQuestion(question as string, "chat");
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("ask error:", error);
    const msg = String(error).includes("429")
      ? "AIの利用上限に達しました。少し時間をおいてからお試しください。"
      : "AIの応答に失敗しました";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
