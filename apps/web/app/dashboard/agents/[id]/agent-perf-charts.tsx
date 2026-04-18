"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface DayStats {
  date: string;
  traces: number;
  incidents: number;
  passRate: number | null;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface Props {
  dailyStats: DayStats[];
  categoryBreakdown: CategoryCount[];
}

const COLORS: Record<string, string> = {
  policy_violation: "#f87171",
  unexpected_behavior: "#fb923c",
  data_leak: "#ef4444",
  harmful_content: "#dc2626",
  performance_degradation: "#facc15",
  off_topic: "#a78bfa",
  other: "#94a3b8",
};

export function AgentPerfCharts({ dailyStats, categoryBreakdown }: Props) {
  if (dailyStats.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-500 text-sm">
        Not enough data for charts yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Traces + incidents over time */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Activity (last 14 days)</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={dailyStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Line type="monotone" dataKey="traces" stroke="#7c3aed" strokeWidth={2} dot={false} name="Traces" />
            <Line type="monotone" dataKey="incidents" stroke="#f59e0b" strokeWidth={2} dot={false} name="Incidents" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-500 inline-block" />Traces</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-yellow-500 inline-block" />Incidents</span>
        </div>
      </div>

      {/* Pass rate over time */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Pass Rate %</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={dailyStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
              formatter={(v: unknown) => typeof v === "number" ? [`${v}%`, "Pass rate"] : [String(v), "Pass rate"]}
            />
            <Line
              type="monotone"
              dataKey="passRate"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              connectNulls
              name="Pass rate"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Incident Categories</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={categoryBreakdown} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="category" tick={{ fontSize: 9, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Bar dataKey="count" name="Incidents" radius={[3, 3, 0, 0]}>
                {categoryBreakdown.map((entry) => (
                  <Cell key={entry.category} fill={COLORS[entry.category] ?? "#7c3aed"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
