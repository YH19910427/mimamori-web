import {
  GoogleGenerativeAI,
  GenerationConfig,
  Part,
} from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * フォールバック順のモデル一覧。各モデルは無料枠が独立しているため、
 * 1つが日次クォータ（429）に達しても次のモデルで継続できる。
 * 環境変数 GEMINI_MODELS（カンマ区切り）で上書き可能。
 */
const DEFAULT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
];

function modelList(): string[] {
  const env = process.env.GEMINI_MODELS;
  if (env) {
    const list = env.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length) return list;
  }
  return DEFAULT_MODELS;
}

/** クォータ超過・モデル未提供など「次のモデルを試すべき」エラーか判定する。 */
function shouldFallback(err: unknown): boolean {
  const s = String(err);
  return (
    s.includes("429") ||
    s.includes("quota") ||
    s.includes("Quota") ||
    s.includes("404") ||
    s.includes("not found") ||
    s.includes("503") ||
    s.includes("overloaded") ||
    s.includes("empty stream")
  );
}

export interface GenerateOptions {
  parts: string | Part[];
  systemInstruction?: string;
  generationConfig?: GenerationConfig;
}

/**
 * モデルのフォールバックを伴ってテキストを生成する。
 * 全モデルが失敗した場合は最後のエラーを投げる。
 */
export async function generateText(opts: GenerateOptions): Promise<string> {
  let lastErr: unknown;
  for (const name of modelList()) {
    try {
      const model = genai.getGenerativeModel({
        model: name,
        systemInstruction: opts.systemInstruction,
        generationConfig: opts.generationConfig,
      });
      const result = await model.generateContent(opts.parts);
      return result.response.text();
    } catch (e) {
      lastErr = e;
      if (!shouldFallback(e)) throw e;
      console.warn(`gemini model ${name} failed, trying next:`, String(e));
    }
  }
  throw lastErr;
}

/**
 * モデルのフォールバックを伴ってテキストを「逐次」生成する。
 * 最初のチャンク取得前の失敗のみ次モデルへフォールバックする。
 */
export async function* generateTextStream(
  opts: GenerateOptions
): AsyncGenerator<string> {
  let lastErr: unknown;
  for (const name of modelList()) {
    try {
      const model = genai.getGenerativeModel({
        model: name,
        systemInstruction: opts.systemInstruction,
        generationConfig: opts.generationConfig,
      });
      const result = await model.generateContentStream(opts.parts);
      let started = false;
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          started = true;
          yield text;
        }
      }
      if (started) return;
      throw new Error("empty stream");
    } catch (e) {
      lastErr = e;
      if (!shouldFallback(e)) throw e;
      console.warn(`gemini stream model ${name} failed, trying next:`, String(e));
    }
  }
  throw lastErr;
}
