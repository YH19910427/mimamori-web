"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const TYPE_OPTIONS = [
  { value: "meal", label: "🍚 食事" },
  { value: "sleep", label: "😴 睡眠" },
  { value: "temperature", label: "🌡️ 体温" },
  { value: "weight", label: "⚖️ 体重" },
  { value: "note", label: "📝 メモ" },
];

const PLACEHOLDER: Record<string, string> = {
  meal: "例：朝 パン・卵、昼 給食、夜 うどん",
  sleep: "例：21:00〜06:30",
  temperature: "例：36.8",
  weight: "例：11.5",
  note: "メモを入力",
};

export default function RecordForm() {
  const router = useRouter();
  const [type, setType] = useState("meal");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (!value.trim() || saving) return;
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("daily_records").insert({
      date: today,
      type,
      value: value.trim(),
      notes: notes.trim(),
    });
    setValue("");
    setNotes("");
    setSaving(false);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setType(opt.value); setValue(""); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              type === opt.value
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <input
        type={type === "temperature" || type === "weight" ? "number" : "text"}
        step={type === "temperature" || type === "weight" ? "0.1" : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={PLACEHOLDER[type] ?? "内容を入力"}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
      />
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="メモ（任意）"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
      />
      <button
        onClick={save}
        disabled={!value.trim() || saving}
        className="w-full bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 active:opacity-70"
      >
        {saving ? "保存中..." : done ? "✅ 記録しました！" : "記録する"}
      </button>
    </div>
  );
}
