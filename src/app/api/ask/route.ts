import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    if (!question?.trim()) {
      return NextResponse.json({ error: "質問が空です" }, { status: 400 });
    }

    const isEmergency = (question as string).includes("緊急");
    const context = await buildContext();
    let prompt = `## 子供の情報\n${context}\n\n## 質問\n${question}`;
    if (isEmergency) prompt = EMERGENCY_PREFIX + prompt;

    const model = genai.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    await supabase.from("conversations").insert({
      user_message: question,
      ai_response: answer,
      mode: isEmergency ? "emergency" : "normal",
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("ask error:", error);
    return NextResponse.json({ error: "AIの応答に失敗しました" }, { status: 500 });
  }
}
