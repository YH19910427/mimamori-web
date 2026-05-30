import { NextRequest, NextResponse } from "next/server";
import { answerQuestion } from "@/lib/answer";

/**
 * Alexaカスタムスキルのエンドポイント。
 * Echo端末で「アレクサ、みまもりで〇〇を教えて」と話しかけると、
 * AlexaがこのエンドポイントにJSONをPOSTし、ここで回答音声を返す。
 *
 * セキュリティ: 個人利用の開発ステージスキル想定。ALEXA_SKILL_ID を
 * 環境変数に設定すると、その skill のリクエストのみ受け付ける。
 */

const INVOCATION = "みまもり";

function speak(
  text: string,
  endSession: boolean,
  reprompt?: string
): NextResponse {
  const response: Record<string, unknown> = {
    outputSpeech: { type: "PlainText", text },
    shouldEndSession: endSession,
  };
  if (reprompt) {
    response.reprompt = {
      outputSpeech: { type: "PlainText", text: reprompt },
    };
  }
  return NextResponse.json({ version: "1.0", response });
}

/** 音声読み上げ向けにMarkdown記号などを除去する。 */
function toSpeech(text: string): string {
  return text
    .replace(/[*_`#>]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\n{2,}/g, "。")
    .replace(/\n/g, "、")
    .trim()
    .slice(0, 6000);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // skill ID 検証（設定時のみ）
  const session = body.session as Record<string, unknown> | undefined;
  const context = body.context as Record<string, unknown> | undefined;
  const appId =
    (session?.application as Record<string, string> | undefined)
      ?.applicationId ??
    (
      (context?.System as Record<string, unknown> | undefined)
        ?.application as Record<string, string> | undefined
    )?.applicationId;
  if (process.env.ALEXA_SKILL_ID && appId !== process.env.ALEXA_SKILL_ID) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const req = (body.request ?? {}) as Record<string, unknown>;
  const type = req.type as string;

  try {
    if (type === "LaunchRequest") {
      return speak(
        `${INVOCATION}です。お子さんのことについて、何でも聞いてください。`,
        false,
        "例えば、今日の予定は、と聞いてみてください。"
      );
    }

    if (type === "IntentRequest") {
      const intent = (req.intent ?? {}) as Record<string, unknown>;
      const intentName = intent.name as string;

      if (intentName === "AMAZON.StopIntent" || intentName === "AMAZON.CancelIntent") {
        return speak("またいつでも聞いてくださいね。", true);
      }
      if (intentName === "AMAZON.HelpIntent") {
        return speak(
          "お子さんの保育園の予定、持ち物、献立、健康のことなどを聞けます。例えば、明日の持ち物は、と聞いてください。",
          false,
          "何を聞きますか？"
        );
      }

      // AskIntent（自由質問）／フォールバック
      const slots = (intent.slots ?? {}) as Record<
        string,
        { value?: string }
      >;
      const question =
        slots.query?.value ?? slots.question?.value ?? "";

      if (!question.trim()) {
        return speak(
          "すみません、もう一度質問をお願いします。",
          false,
          "お子さんのことについて、何でも聞いてください。"
        );
      }

      const answer = await answerQuestion(question, "voice");
      return speak(toSpeech(answer), true);
    }

    // SessionEndedRequest など
    return NextResponse.json({ version: "1.0", response: {} });
  } catch (e) {
    console.error("alexa error:", e);
    return speak(
      "すみません、うまく答えられませんでした。少し時間をおいて、もう一度お試しください。",
      true
    );
  }
}
