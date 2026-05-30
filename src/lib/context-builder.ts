import { supabase, ChildProfile, DailyRecord, KnowledgeDocument } from "./supabase";

export async function buildContext(): Promise<string> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [profileRes, docsRes, recordsRes] = await Promise.all([
    supabase.from("child_profile").select("*").limit(1),
    supabase
      .from("documents")
      .select("*")
      .order("source_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("daily_records")
      .select("*")
      .gte("date", since)
      .order("date", { ascending: false }),
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
    const docParts = ["## 登録ドキュメント"];
    for (const doc of documents) {
      const dateLabel = doc.source_date ? `（対象: ${doc.source_date}）` : "";
      const summaryLine = doc.summary ? `要約: ${doc.summary}\n` : "";
      docParts.push(
        `### [${doc.category}] ${doc.title}${dateLabel}\n${summaryLine}${doc.content}`
      );
    }
    parts.push(docParts.join("\n\n"));
  }

  if (records.length > 0) {
    const lines = ["## 直近30日の記録"];
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
