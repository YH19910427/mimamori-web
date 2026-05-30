import { supabase, DailyRecord } from "@/lib/supabase";
import GrowthChart, { GrowthDataPoint } from "@/components/GrowthChart";
import RecordForm from "@/components/RecordForm";

export const dynamic = "force-dynamic";

const TYPE_EMOJI: Record<string, string> = {
  meal: "🍚",
  sleep: "😴",
  temperature: "🌡️",
  weight: "⚖️",
  note: "📝",
};

export default async function RecordsPage() {
  const [growthRes, recentRes] = await Promise.all([
    supabase
      .from("daily_records")
      .select("date,type,value")
      .in("type", ["height", "weight"])
      .order("date", { ascending: true }),
    supabase
      .from("daily_records")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const growthMap: Record<string, GrowthDataPoint> = {};
  for (const r of growthRes.data ?? []) {
    if (!growthMap[r.date]) growthMap[r.date] = { date: r.date };
    if (r.type === "height") growthMap[r.date].height = parseFloat(r.value);
    if (r.type === "weight") growthMap[r.date].weight = parseFloat(r.value);
  }
  const chartData = Object.values(growthMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const records = (recentRes.data ?? []) as DailyRecord[];

  return (
    <div>
      <div className="bg-green-600 text-white p-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold">📊 成長・記録</h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800">📈 成長グラフ</h2>
          <GrowthChart data={chartData} />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800">➕ 記録を追加</h2>
          <RecordForm />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800">📋 最近の記録</h2>
          {records.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              記録がありません
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {records.map((r) => (
                <div key={r.id} className="flex gap-3 py-2.5 text-sm">
                  <span className="text-gray-400 w-12 shrink-0 text-xs pt-0.5">
                    {r.date.slice(5)}
                  </span>
                  <span className="text-lg shrink-0 leading-none">
                    {TYPE_EMOJI[r.type] ?? "•"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 truncate">{r.value}</p>
                    {r.notes && (
                      <p className="text-gray-400 text-xs truncate">{r.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
