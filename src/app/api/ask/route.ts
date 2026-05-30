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
    return NextResponse.json(
      { error: "AIの応答に失敗しました", detail: String(error) },
      { status: 500 }
    );
  }
}
