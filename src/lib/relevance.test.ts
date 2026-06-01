import { describe, it, expect, beforeEach } from "vitest";
import { selectDocuments, rankHybrid, type DocLike, type VectorDoc } from "./relevance";

const makeDocs = (): DocLike[] => [
  { id: "1", title: "5月献立表", category: "nursery", summary: "5月の給食", tags: ["献立", "給食"], content: "5日 ちらし寿司 すまし汁", source_date: "2026-05-01", key_facts: null, created_at: "2026-05-01" },
  { id: "2", title: "健康診断", category: "medical", summary: "身体測定の結果", tags: ["健康"], content: "身長 体重 記録", source_date: "2026-04-20", key_facts: null, created_at: "2026-04-20" },
  { id: "3", title: "5月行事予定", category: "nursery", summary: "5月の行事", tags: ["行事"], content: "16日 親子交流会", source_date: "2026-05-02", key_facts: null, created_at: "2026-05-02" },
];

const makeVectorDocs = (): VectorDoc[] => [
  { id: "1", title: "5月献立表", category: "nursery", summary: "5月の給食", tags: ["給食"], content: "ちらし寿司", source_date: "2026-05-01", key_facts: null, created_at: "2026-05-01", similarity: 0.9 },
  { id: "2", title: "健康診断", category: "medical", summary: "身体測定", tags: [], content: "身長 体重", source_date: "2026-04-20", key_facts: null, created_at: "2026-04-20", similarity: 0.6 },
  { id: "3", title: "5月行事予定", category: "nursery", summary: "5月の行事", tags: ["行事"], content: "親子交流会", source_date: "2026-05-02", key_facts: null, created_at: "2026-05-02", similarity: 0.5 },
];

describe("rankHybrid", () => {
  it("類似度が高いドキュメントを full に選ぶ", () => {
    const r = rankHybrid("xyz", makeVectorDocs(), 1);
    expect(r.full.map((d) => d.id)).toEqual(["1"]);
    expect(r.brief.map((d) => d.id).sort()).toEqual(["2", "3"]);
  });

  it("bigram一致がスコアを押し上げる（同類似度の場合）", () => {
    const vdocs: VectorDoc[] = [
      { ...makeVectorDocs()[1], id: "A", similarity: 0.8, title: "給食の記録" },
      { ...makeVectorDocs()[0], id: "B", similarity: 0.8, title: "無関係な書類" },
    ];
    const r = rankHybrid("給食", vdocs, 1);
    expect(r.full[0].id).toBe("A");
  });

  it("k=2 で上位2件が full、残りが brief", () => {
    const r = rankHybrid("xyz", makeVectorDocs(), 2);
    expect(r.full.length).toBe(2);
    expect(r.brief.length).toBe(1);
  });

  it("full と brief に重複はない", () => {
    const r = rankHybrid("行事", makeVectorDocs(), 2);
    const fullIds = new Set(r.full.map((d) => d.id));
    r.brief.forEach((d) => expect(fullIds.has(d.id)).toBe(false));
  });
});

describe("selectDocuments", () => {
  let docs: DocLike[];
  beforeEach(() => { docs = makeDocs(); });

  it("関連語ヒットのドキュメントを上位に全文選択する", () => {
    const r = selectDocuments("こどもの日の給食は", docs, 1);
    expect(r.full.map((d) => d.id)).toEqual(["1"]);
    expect(r.brief.map((d) => d.id).sort()).toEqual(["2", "3"]);
  });

  it("ヒット0件なら最新K件を全文にフォールバックする", () => {
    const r = selectDocuments("xyzなし", docs, 2);
    expect(r.full.map((d) => d.id)).toEqual(["3", "1"]);
    expect(r.brief.map((d) => d.id)).toEqual(["2"]);
  });

  it("K件を超える関連はbriefに回る", () => {
    const r = selectDocuments("5月 行事 献立", docs, 1);
    expect(r.full.length).toBe(1);
    expect(r.brief.length).toBe(2);
  });
});
