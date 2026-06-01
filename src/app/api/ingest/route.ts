import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateText } from "@/lib/gemini";
import { generateEmbedding } from "@/lib/embeddings";

const EXTRACT_PROMPT = `この資料（保育園のおたより・献立、医療・健康の書類、写真など。スキャン画像の場合あり）を読み取り、以下のJSONだけを出力してください。説明やコードフェンスは不要です。

{
  "title": "内容がわかる簡潔な日本語タイトル",
  "category": "nursery / medical / preference / other のいずれか",
  "summary": "保護者が要点を把握できる3〜5行の要約",
  "source_date": "資料の対象年月日 YYYY-MM-DD（不明ならnull）",
  "tags": ["行事や持ち物など関連キーワードの配列"],
  "key_facts": {
    "events": [{"date": "YYYY-MM-DD", "name": "行事名"}],
    "items": ["持ち物など"],
    "notes": ["その他の重要な注意事項"]
  },
  "full_text": "読み取った全文テキスト（改行保持）"
}`;

const CATEGORIES = ["nursery", "medical", "preference", "other"];

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
    }

    const mimeType = file.type;
    const isPdf = mimeType === "application/pdf";
    const isImage = mimeType.startsWith("image/");
    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: "対応形式は画像またはPDFのみです" },
        { status: 400 }
      );
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルが大きすぎます（20MBまで）" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // 1. 原本をStorageに保存
    const docId = crypto.randomUUID();
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const storagePath = `${docId}/${safeName}`;
    const uploadRes = await supabase.storage
      .from("sources")
      .upload(storagePath, bytes, { contentType: mimeType });
    if (uploadRes.error) {
      return NextResponse.json(
        { error: `保存に失敗しました: ${uploadRes.error.message}` },
        { status: 500 }
      );
    }

    // 2. Geminiで構造化抽出（モデルフォールバック＋1回リトライ）
    const parts = [
      { inlineData: { data: bytes.toString("base64"), mimeType } },
      { text: EXTRACT_PROMPT },
    ];

    let parsed: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      try {
        const text = await generateText({
          parts,
          generationConfig: { responseMimeType: "application/json" },
        });
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      return NextResponse.json(
        { error: "AIが内容を読み取れませんでした" },
        { status: 502 }
      );
    }

    // 3. 検証して documents に挿入
    const category = CATEGORIES.includes(parsed.category as string)
      ? (parsed.category as string)
      : "other";
    const sourceDate =
      typeof parsed.source_date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.source_date)
        ? parsed.source_date
        : null;

    const { data, error } = await supabase
      .from("documents")
      .insert({
        title: (parsed.title as string)?.trim() || file.name,
        category,
        content: ((parsed.full_text as string) ?? "").trim(),
        summary: (parsed.summary as string) ?? null,
        source_type: isPdf ? "pdf" : "image",
        original_file_path: storagePath,
        source_date: sourceDate,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        key_facts: parsed.key_facts ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 埋め込みベクトルを非同期で生成・保存（失敗しても ingest は成功扱い）
    const embedText = [
      (parsed.title as string) ?? "",
      (parsed.summary as string) ?? "",
      ((parsed.full_text as string) ?? "").slice(0, 7000),
    ]
      .filter(Boolean)
      .join(" ");
    generateEmbedding(embedText, "RETRIEVAL_DOCUMENT")
      .then((embedding) =>
        supabase.from("documents").update({ embedding }).eq("id", data.id)
      )
      .catch((e) => console.warn("embedding generation failed:", e));

    return NextResponse.json(
      { id: data.id, title: data.title, category: data.category },
      { status: 201 }
    );
  } catch (e) {
    console.error("ingest error:", e);
    return NextResponse.json({ error: "取り込みに失敗しました" }, { status: 500 });
  }
}
