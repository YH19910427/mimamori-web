"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { value: "nursery", label: "🏫 保育園" },
  { value: "medical", label: "🏥 医療" },
  { value: "preference", label: "❤️ 好み" },
  { value: "other", label: "📄 その他" },
];

export default function DocumentUpload() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("nursery");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), category, content: content.trim() }),
    });
    setTitle("");
    setContent("");
    setSaving(false);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル（例：保育園の持ち物リスト）"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
      />
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === c.value
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="内容を貼り付け（保育園プリントのテキスト、メモなど）"
        rows={5}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
      />
      <button
        onClick={save}
        disabled={!title.trim() || !content.trim() || saving}
        className="w-full bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 active:opacity-70"
      >
        {saving ? "保存中..." : done ? "✅ 追加しました！" : "知識庫に追加"}
      </button>
    </div>
  );
}
