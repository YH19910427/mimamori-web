import {
  supabase,
  ChildProfile,
  DailyRecord,
  Conversation,
  KnowledgeDocument,
} from "@/lib/supabase";
import Link from "next/link";

type UpcomingEvent = { date: string; name: string; source: string };

function collectUpcomingEvents(
  documents: KnowledgeDocument[],
  today: string,
  limit = 5
): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];
  for (const doc of documents) {
    for (const ev of doc.key_facts?.events ?? []) {
      if (ev?.date && /^\d{4}-\d{2}-\d{2}$/.test(ev.date) && ev.date >= today) {
        events.push({ date: ev.date, name: ev.name, source: doc.title });
      }
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events.slice(0, limit);
}

function formatEventDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export const dynamic = "force-dynamic";

function calcAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years -= 1;
    months += 12;
  }
  if (months < 0) months += 12;
  return `${years}歳${months}ヶ月`;
}

const TYPE_LABEL: Record<string, string> = {
  meal: "🍚 食事",
  sleep: "😴 睡眠",
  temperature: "🌡️ 体温",
  weight: "⚖️ 体重",
  note: "📝 メモ",
};

export default async function Dashboard() {
  const today = new Date().toISOString().split("T")[0];
  const todayJP = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const [profileRes, recordsRes, convsRes, docsRes] = await Promise.all([
    supabase.from("child_profile").select("*").limit(1),
    supabase
      .from("daily_records")
      .select("*")
      .eq("date", today)
      .order("created_at", { ascending: false }),
    supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("documents").select("title, key_facts"),
  ]);

  const profile = profileRes.data?.[0] as ChildProfile | undefined;
  const records = (recordsRes.data ?? []) as DailyRecord[];
  const conversations = (convsRes.data ?? []) as Conversation[];
  const documents = (docsRes.data ?? []) as KnowledgeDocument[];
  const upcomingEvents = collectUpcomingEvents(documents, today);

  return (
    <div className="p-4 space-y-4">
      {/* ヘッダー */}
      <div className="bg-green-600 text-white rounded-2xl p-4 shadow-sm">
        <p className="text-sm opacity-80">{todayJP}</p>
        <h1 className="text-2xl font-bold mt-1">
          {profile
            ? `こんにちは、${profile.nickname ?? profile.name}！`
            : "Mimamori 見守り 🌱"}
        </h1>
        {profile?.birth_date && (
          <p className="text-sm opacity-90 mt-1">{calcAge(profile.birth_date)}</p>
        )}
      </div>

      {/* AIチャットへのリンク */}
      <Link href="/chat">
        <div className="bg-white border-2 border-green-400 rounded-2xl p-4 flex items-center gap-3 shadow-sm active:opacity-70">
          <span className="text-3xl">🎤</span>
          <div className="flex-1">
            <p className="font-semibold text-green-700">AIに話しかける</p>
            <p className="text-xs text-gray-500">育児の疑問・緊急時はこちら</p>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </div>
      </Link>

      {/* 近づく予定 */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-800">📅 近づく予定</h2>
            <Link href="/knowledge" className="text-xs text-green-600 font-medium">
              資料 ›
            </Link>
          </div>
          <div className="space-y-2.5">
            {upcomingEvents.map((ev, i) => (
              <div key={i} className="flex gap-3 items-start text-sm">
                <span className="shrink-0 w-24 text-green-700 font-medium">
                  {formatEventDate(ev.date)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800">{ev.name}</p>
                  <p className="text-xs text-gray-400 truncate">{ev.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 基本情報カード */}
      {profile && (
        <div className="grid grid-cols-2 gap-3">
          <Link href="/records">
            <div className="bg-white rounded-2xl p-3 shadow-sm h-full">
              <p className="text-xs text-gray-400 mb-2">📏 身長・体重</p>
              <p className="font-bold text-lg text-green-700">
                {profile.height_cm ?? "—"}
                <span className="text-xs font-normal text-gray-500">cm</span>
              </p>
              <p className="font-bold text-lg text-blue-600">
                {profile.weight_kg ?? "—"}
                <span className="text-xs font-normal text-gray-500">kg</span>
              </p>
            </div>
          </Link>
          <Link href="/settings">
            <div className="bg-white rounded-2xl p-3 shadow-sm h-full">
              <p className="text-xs text-gray-400 mb-2">🏥 医療情報</p>
              <p className="text-sm">
                血液型:{" "}
                <span className="font-semibold">{profile.blood_type ?? "—"}</span>
              </p>
              {profile.allergies && profile.allergies.length > 0 ? (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ {profile.allergies.join("・")}
                </p>
              ) : (
                <p className="text-xs text-green-600 mt-1">アレルギーなし</p>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* 今日の記録 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-800">📝 今日の記録</h2>
          <Link href="/records" className="text-xs text-green-600 font-medium">
            追加 ›
          </Link>
        </div>
        {records.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">
            今日はまだ記録がありません
          </p>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 4).map((r) => (
              <div key={r.id} className="flex gap-3 text-sm">
                <span className="text-gray-400 shrink-0 w-20">
                  {TYPE_LABEL[r.type] ?? r.type}
                </span>
                <span className="text-gray-700 truncate">{r.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 最近の会話 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-800">💬 最近の会話</h2>
          <Link href="/chat" className="text-xs text-green-600 font-medium">
            チャット ›
          </Link>
        </div>
        {conversations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">
            会話履歴がありません
          </p>
        ) : (
          <div className="space-y-3">
            {conversations.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="text-sm border-l-2 border-green-300 pl-3"
              >
                <p className="text-gray-500 truncate">Q: {c.user_message}</p>
                <p className="text-gray-800 truncate text-xs mt-0.5">
                  {c.ai_response}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
