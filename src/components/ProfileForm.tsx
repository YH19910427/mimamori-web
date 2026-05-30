"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChildProfile } from "@/lib/supabase";

const FIELDS: Array<{
  key: keyof ChildProfile;
  label: string;
  placeholder: string;
  type?: string;
}> = [
  { key: "name", label: "名前 *", placeholder: "田中 蓮" },
  { key: "nickname", label: "呼び方", placeholder: "れんくん" },
  { key: "birth_date", label: "生年月日", placeholder: "2023-04-15", type: "date" },
  { key: "blood_type", label: "血液型", placeholder: "A / B / O / AB" },
  { key: "height_cm", label: "身長 (cm)", placeholder: "82.5", type: "number" },
  { key: "weight_kg", label: "体重 (kg)", placeholder: "11.2", type: "number" },
  { key: "hospital_name", label: "かかりつけ病院名", placeholder: "田中小児クリニック" },
  { key: "hospital_phone", label: "病院電話番号", placeholder: "03-1234-5678", type: "tel" },
  { key: "hospital_address", label: "病院住所", placeholder: "東京都渋谷区..." },
];

export default function ProfileForm({ profile }: { profile: ChildProfile | null }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<ChildProfile>>(profile ?? {});
  const [allergiesText, setAllergiesText] = useState(
    (profile?.allergies ?? []).join("、")
  );
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      allergies: allergiesText
        ? allergiesText.split(/[,、,]/).map((s) => s.trim()).filter(Boolean)
        : [],
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
    };
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            {f.label}
          </label>
          <input
            type={f.type ?? "text"}
            step={f.type === "number" ? "0.1" : undefined}
            value={String(form[f.key] ?? "")}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, [f.key]: e.target.value || undefined }))
            }
            placeholder={f.placeholder}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
          />
        </div>
      ))}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">
          アレルギー（読点か「,」で区切る）
        </label>
        <input
          type="text"
          value={allergiesText}
          onChange={(e) => setAllergiesText(e.target.value)}
          placeholder="例：卵、小麦"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
        />
      </div>
      <button
        onClick={save}
        disabled={!form.name?.trim() || saving}
        className="w-full bg-green-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 active:opacity-70 mt-2"
      >
        {saving ? "保存中..." : done ? "✅ 保存しました！" : "プロフィールを保存"}
      </button>
    </div>
  );
}
