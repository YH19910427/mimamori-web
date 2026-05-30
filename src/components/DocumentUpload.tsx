"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { value: "nursery", label: "🏫 保育園" },
  { value: "medical", label: "🏥 医療" },
  { value: "preference", label: "❤️ 好み" },
  { value: "other", label: "📄 その他" },
];

type Status = { name: string; state: "uploading" | "done" | "error"; msg?: string };

export default function DocumentUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [showManual, setShowManual] = useState(false);

  // 手入力（補助）
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("nursery");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      setStatuses((prev) => [...prev, { name: file.name, state: "uploading" }]);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/ingest", { method: "POST", body: fd });
        const data = await res.json();
        setStatuses((prev) =>
          prev.map((s) =>
            s.name === file.name && s.state === "uploading"
              ? res.ok
                ? { name: file.name, state: "done", msg: `${data.title}（${data.category}）` }
                : { name: file.name, state: "error", msg: data.error ?? "失敗" }
              : s
          )
        );
      } catch {
        setStatuses((prev) =>
          prev.map((s) =>
            s.name === file.name && s.state === "uploading"
              ? { name: file.name, state: "error", msg: "通信エラー" }
              : s
          )
        );
      }
    }
    router.refresh();
    if (fileRef.current) fileRef.current.value = "";
  };

  const saveManual = async () => {
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
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={(e) => onFiles(e.target.files)}
        className="hidden"
        id="ingest-file"
      />
      <label
        htmlFor="ingest-file"
        className="block w-full text-center bg-green-600 text-white rounded-2xl py-6 text-base font-semibold active:opacity-70 cursor-pointer"
      >
        📁 ファイルを選ぶ
        <span className="block text-xs font-normal opacity-80 mt-1">
          写真・スキャンPDF（複数可）。AIが自動で読み取ります
        </span>
      </label>

      {statuses.length > 0 && (
        <div className="space-y-1.5">
          {statuses.map((s, i) => (
            <div key={i} className="text-sm flex gap-2 items-start">
              <span className="shrink-0">
                {s.state === "uploading" ? "⏳" : s.state === "done" ? "✅" : "⚠️"}
              </span>
              <span className="text-gray-600 truncate">
                {s.state === "uploading"
                  ? `読み取り中… ${s.name}`
                  : s.msg}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowManual((v) => !v)}
        className="text-xs text-gray-400 underline"
      >
        {showManual ? "手入力を閉じる" : "手で書いて追加する"}
      </button>

      {showManual && (
        <div className="space-y-2 pt-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトル"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  category === c.value
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="内容を貼り付け"
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
          />
          <button
            onClick={saveManual}
            disabled={!title.trim() || !content.trim() || saving}
            className="w-full bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 active:opacity-70"
          >
            {saving ? "保存中..." : "知識庫に追加"}
          </button>
        </div>
      )}
    </div>
  );
}
