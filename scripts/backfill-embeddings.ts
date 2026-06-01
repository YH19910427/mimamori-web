/**
 * 既存ドキュメントの embedding カラムを一括生成するスクリプト。
 * 一度だけ実行する。
 *
 * 実行方法:
 *   cd web
 *   npx tsx --env-file .env.local scripts/backfill-embeddings.ts
 */
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const RATE_LIMIT_MS = 200; // 5 req/s

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genai.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent({
    content: { parts: [{ text: text.slice(0, 8000) }], role: "user" },
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    outputDimensionality: 768,
  });
  return result.embedding.values;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, title, summary, content")
    .is("embedding", null);

  if (error) {
    console.error("fetch error:", error.message);
    process.exit(1);
  }

  console.log(`${docs?.length ?? 0} 件のドキュメントを埋め込みます...`);

  let ok = 0;
  let fail = 0;
  for (const doc of docs ?? []) {
    const text = [doc.title ?? "", doc.summary ?? "", (doc.content ?? "").slice(0, 7000)]
      .filter(Boolean)
      .join(" ");
    try {
      const embedding = await generateEmbedding(text);
      const { error: upErr } = await supabase
        .from("documents")
        .update({ embedding })
        .eq("id", doc.id);
      if (upErr) throw upErr;
      ok++;
      console.log(`[${ok}/${docs!.length}] ✓ ${doc.title}`);
    } catch (e) {
      fail++;
      console.error(`  ✗ ${doc.title}:`, String(e));
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n完了: ${ok} 件成功, ${fail} 件失敗`);
}

main();
