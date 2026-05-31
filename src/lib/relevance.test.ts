import { describe, it, expect } from "vitest";
import { selectDocuments, type DocLike } from "./relevance";

const docs: DocLike[] = [
  { id: "1", title: "5月献立表", category: "nursery", summary: "5月の給食", tags: ["献立", "給食"], content: "5日 ちらし寿司 すまし汁", source_date: "2026-05-01", key_facts: null, created_at: "2026-05-01" },
  { id: "2", title: "健康診断", category: "medical", summary: "身体測定の結果", tags: ["健康"], content: "身長 体重 記録", source_date: "2026-04-20", key_facts: null, created_at: "2026-04-20" },
  { id: "3", title: "5月行事予定", category: "nursery", summary: "5月の行事", tags: ["行事"], content: "16日 親子交流会", source_date: "2026-05-02", key_facts: null, created_at: "2026-05-02" },
];

describe("selectDocuments", () => {
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
