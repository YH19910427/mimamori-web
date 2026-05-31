import { NextRequest, NextResponse } from "next/server";
import { answerQuestion, answerQuestionStream } from "@/lib/answer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { question?: string; stream?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }
  const question = body.question;
  if (!question?.trim()) {
    return NextResponse.json({ error: "質問が空です" }, { status: 400 });
  }

  // 非ストリーム（Webチャット）: 従来どおりJSON
  if (!body.stream) {
    try {
      const answer = await answerQuestion(question, "chat");
      return NextResponse.json({ answer });
    } catch (error) {
      const msg = String(error).includes("429")
        ? "AIの利用上限に達しました。少し時間をおいてからお試しください。"
        : "AIの応答に失敗しました";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ストリーム（音声アプリ）: SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        for await (const delta of answerQuestionStream(question, "voice")) {
          send({ delta });
        }
        send({ done: true });
      } catch (error) {
        const msg = String(error).includes("429")
          ? "AIの利用上限に達しました。"
          : "AIの応答に失敗しました";
        send({ error: msg });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
