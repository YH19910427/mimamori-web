import { supabase, ChildProfile, DailyRecord, KnowledgeDocument } from "./supabase";
import { selectDocuments, rankHybrid, type DocLike, type VectorDoc } from "./relevance";
import { generateEmbedding } from "./embeddings";

async function selectDocumentsWithFallback(question: string, allDocs: DocLike[]) {
  if (question.trim()) {
    try {
      const queryEmbedding = await generateEmbedding(question, "RETRIEVAL_QUERY");
      const { data: vectorResults, error } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_count: 20,
        match_threshold: 0.3,
      });
      if (!error && vectorResults && (vectorResults as VectorDoc[]).length > 0) {
        const vectorDocs = vectorResults as VectorDoc[];
        const { full, brief: vectorBrief } = rankHybrid(question, vectorDocs);
        // brief = vector candidates not in full + all docs not returned by vector search
        const fullIds = new Set(full.map((d) => d.id));
        const vectorIds = new Set(vectorDocs.map((d) => d.id));
        const brief = [
          ...vectorBrief,
          ...allDocs.filter((d) => !vectorIds.has(d.id)),
        ];
        return { full, brief };
      }
    } catch {
      // fall through to bigram
    }
  }
  return selectDocuments(question, allDocs);
}

export async function buildContext(question: string): Promise<string> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [profileRes, docsRes, recordsRes] = await Promise.all([
    supabase.from("child_profile").select("*").limit(1),
    supabase
      .from("documents")
      .select("id, title, category, summary, content, source_date, tags, key_facts, created_at")
      .order("source_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("daily_records")
      .select("*")
      .gte("date", since)
      .order("date", { ascending: false })
      .limit(30),
  ]);

  const profile = profileRes.data?.[0] as ChildProfile | undefined;
  const documents = (docsRes.data ?? []) as KnowledgeDocument[];
  const records = (recordsRes.data ?? []) as DailyRecord[];

  const parts: string[] = [];

  if (profile) {
    const allergies = profile.allergies?.join("、") ?? "なし";
    parts.push(
      `## 子供の基本情報
名前: ${profile.name ?? "未登録"}
呼び方: ${profile.nickname ?? "未登録"}
生年月日: ${profile.birth_date ?? "未登録"}
血液型: ${profile.blood_type ?? "未登録"}
身長: ${profile.height_cm ?? "未登録"}cm
体重: ${profile.weight_kg ?? "未登録"}kg
アレルギー: ${allergies}

## 緊急・医療情報
かかりつけ病院: ${profile.hospital_name ?? "未登録"}
病院電話番号: ${profile.hospital_phone ?? "未登録"}
病院住所: ${profile.hospital_address ?? "未登録"}`
    );
  }

  if (documents.length > 0) {
    const allDocs = documents as unknown as DocLike[];
    const { full, brief } = await selectDocumentsWithFallback(question, allDocs);
    const docParts = ["## 登録ドキュメント"];
    for (const doc of full) {
      const dateLabel = doc.source_date ? `（対象: ${doc.source_date}）` : "";
      const summaryLine = doc.summary ? `要約: ${doc.summary}\n` : "";
      docParts.push(
        `### [${doc.category}] ${doc.title}${dateLabel}\n${summaryLine}${doc.content}`
      );
    }
    if (brief.length > 0) {
      docParts.push("### その他（要約のみ）");
      for (const doc of brief) {
        const facts = doc.key_facts ? ` 要点:${JSON.stringify(doc.key_facts)}` : "";
        docParts.push(
          `- [${doc.category}] ${doc.title}（${doc.source_date ?? ""}）: ${doc.summary ?? ""}${facts}`
        );
      }
    }
    parts.push(docParts.join("\n\n"));
  }

  if (records.length > 0) {
    const lines = ["## 直近の記録"];
    for (const r of records) {
      const note = r.notes ? ` (${r.notes})` : "";
      lines.push(`- ${r.date} [${r.type}] ${r.value}${note}`);
    }
    parts.push(lines.join("\n"));
  }

  return parts.length > 0
    ? parts.join("\n\n")
    : "（まだ子供の情報が登録されていません）";
}
