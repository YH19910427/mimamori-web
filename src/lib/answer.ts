import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildContext } from "@/lib/context-builder";
import { supabase } from "@/lib/supabase";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `あなたはMimamori（見守り）です。この家族の子供専属AIアシスタントです。
ルール：
1. 提供された子供の情報を「絶対的な情報源」として必ず優先して回答する
2. 登録情報にない内容のみ、一般的な育児知識で補完する（その場合「一般的には」と明示）
3. 回答は簡潔・実用的・温かみのある日本語で
4. 子供の名前や呼び方が登録されていれば積極的に使う`;

const EMERGENCY_PREFIX = `【緊急モード起動】
以下の情報を優先して、すぐに使える形で提供してください：
- かかりつけ病院の電話番号と住所
- 子供のアレルギーと血液型
- 関連する既往歴・対応記録

---
`;

/**
 * 質問に対してGeminiで回答を生成し、会話履歴を保存する。
 * /api/ask（チャット）と /api/alexa（音声）の共通ロジック。
 * @param question ユーザーの質問
 * @param mode 保存する会話モード（既定は質問内容から自動判定）。"voice" 等のソース情報も渡せる。
 */
export async function answerQuestion(
  question: string,
  source: "chat" | "voice" = "chat"
): Promise<string> {
  const isEmergency = question.includes("緊急");
  const context = await buildContext();
  let prompt = `## 子供の情報\n${context}\n\n## 質問\n${question}`;
  if (isEmergency) prompt = EMERGENCY_PREFIX + prompt;

  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(prompt);
  const answer = result.response.text();

  await supabase.from("conversations").insert({
    user_message: source === "voice" ? `🎤 ${question}` : question,
    ai_response: answer,
    mode: isEmergency ? "emergency" : "normal",
  });

  return answer;
}
