import { buildContext } from "@/lib/context-builder";
import { supabase } from "@/lib/supabase";
import { generateText, generateTextStream } from "@/lib/gemini";

const SYSTEM_PROMPT = `あなたは家庭の育児アシスタントです。利用者は保護者（親）です。
ルール：
1. 登録情報だけを根拠に答える。無い情報は「登録がありません」と短く返し、推測しない。
2. 聞かれたことの答えだけを返す。前置き・質問の繰り返し・相づち・絵文字・余計な助言は禁止。
3. 自然な語尾（です/ます）は使ってよいが最短で。複数項目は短い列挙。
4. 子供への語りかけや感情表現はしない。事実を端的に。`;

const EMERGENCY_PREFIX = `【緊急モード起動】
以下の情報を優先して、すぐに使える形で提供してください：
- かかりつけ病院の電話番号と住所
- 子供のアレルギーと血液型
- 関連する既往歴・対応記録

---
`;

interface GenSettings {
  maxOutputTokens: number;
}
function settingsFor(source: "chat" | "voice"): GenSettings {
  return source === "voice" ? { maxOutputTokens: 200 } : { maxOutputTokens: 500 };
}

async function buildPrompt(question: string): Promise<string> {
  const isEmergency = question.includes("緊急");
  const context = await buildContext(question);
  let prompt = `## 子供の情報\n${context}\n\n## 質問\n${question}`;
  if (isEmergency) prompt = EMERGENCY_PREFIX + prompt;
  return prompt;
}

async function saveConversation(
  question: string,
  answer: string,
  source: "chat" | "voice"
) {
  await supabase.from("conversations").insert({
    user_message: source === "voice" ? `🎤 ${question}` : question,
    ai_response: answer,
    mode: question.includes("緊急") ? "emergency" : "normal",
  });
}

/**
 * 質問に対してGeminiで回答を生成し、会話履歴を保存する（非ストリーム）。
 */
export async function answerQuestion(
  question: string,
  source: "chat" | "voice" = "chat"
): Promise<string> {
  const prompt = await buildPrompt(question);
  const answer = await generateText({
    parts: prompt,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: settingsFor(source).maxOutputTokens,
    },
  });
  await saveConversation(question, answer, source);
  return answer;
}

/** 逐次生成。チャンクをyieldし、完了後に会話を保存する。 */
export async function* answerQuestionStream(
  question: string,
  source: "chat" | "voice" = "voice"
): AsyncGenerator<string> {
  const prompt = await buildPrompt(question);
  let full = "";
  for await (const delta of generateTextStream({
    parts: prompt,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: settingsFor(source).maxOutputTokens,
    },
  })) {
    full += delta;
    yield delta;
  }
  await saveConversation(question, full, source);
}
