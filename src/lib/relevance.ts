export interface DocLike {
  id: string;
  title: string;
  category: string;
  summary: string | null;
  tags: string[] | null;
  content: string;
  source_date: string | null;
  key_facts: unknown;
  created_at: string;
}

export interface Selection {
  full: DocLike[];
  brief: DocLike[];
}

/**
 * 質問を文字bigram（2文字単位）に分割する。
 * 日本語は空白で語が区切れないため、文字n-gramで部分一致できるようにする。
 * 例: 「給食」を含む質問は、ドキュメントの「給食」と一致する。
 */
export function tokenize(q: string): string[] {
  const cleaned = q.toLowerCase().replace(/[、。,.!?！？「」（）()\s]+/g, "");
  const grams = new Set<string>();
  for (let i = 0; i < cleaned.length - 1; i++) {
    grams.add(cleaned.slice(i, i + 2));
  }
  return [...grams];
}

function scoreDoc(tokens: string[], d: DocLike): number {
  const title = (d.title ?? "").toLowerCase();
  const tags = (d.tags ?? []).join(" ").toLowerCase();
  const summary = (d.summary ?? "").toLowerCase();
  const content = (d.content ?? "").toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (title.includes(t)) s += 3;
    if (tags.includes(t)) s += 3;
    if (summary.includes(t)) s += 2;
    if (content.includes(t)) s += 1;
  }
  return s;
}

function byDateDesc(a: DocLike, b: DocLike): number {
  return (b.source_date ?? b.created_at).localeCompare(a.source_date ?? a.created_at);
}

/**
 * 質問に関連するドキュメントを上位 k 件 full に、残りを brief に分ける。
 * 全件スコア0なら最新 k 件を full にフォールバックする。
 */
export function selectDocuments(question: string, docs: DocLike[], k = 3): Selection {
  const tokens = tokenize(question);
  const scored = docs.map((d) => ({ d, score: scoreDoc(tokens, d) }));
  const anyHit = scored.some((x) => x.score > 0);

  let fullSet: DocLike[];
  if (anyHit) {
    fullSet = scored
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || byDateDesc(a.d, b.d))
      .slice(0, k)
      .map((x) => x.d);
  } else {
    fullSet = [...docs].sort(byDateDesc).slice(0, k);
  }
  const fullIds = new Set(fullSet.map((d) => d.id));
  const brief = docs.filter((d) => !fullIds.has(d.id));
  return { full: fullSet, brief };
}
