"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface GrowthDataPoint {
  date: string;
  height?: number;
  weight?: number;
}

export default function GrowthChart({ data }: { data: GrowthDataPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        成長グラフは2件以上の身長・体重記録が必要です
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis
          yAxisId="h"
          orientation="left"
          tick={{ fontSize: 9 }}
          unit="cm"
          domain={["auto", "auto"]}
          width={40}
        />
        <YAxis
          yAxisId="w"
          orientation="right"
          tick={{ fontSize: 9 }}
          unit="kg"
          domain={["auto", "auto"]}
          width={36}
        />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === "身長" ? `${value}cm` : `${value}kg`
          }
          labelFormatter={(label: string) => `日付: ${label}`}
        />
        <Legend />
        <Line
          yAxisId="h"
          type="monotone"
          dataKey="height"
          name="身長"
          stroke="#16a34a"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          yAxisId="w"
          type="monotone"
          dataKey="weight"
          name="体重"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
