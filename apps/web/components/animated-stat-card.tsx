"use client";
import { CountUp } from "./count-up";

interface AnimatedStatCardProps {
  label: string;
  numericValue?: number;
  suffix?: string;
  displayValue?: string;
  valueClass?: string;
  delay?: number;
  sub?: string;
}

export function AnimatedStatCard({
  label,
  numericValue,
  suffix = "",
  displayValue,
  valueClass = "text-gray-100",
  delay = 0,
  sub,
}: AnimatedStatCardProps) {
  return (
    <div
      className="rounded-xl border border-gray-800 bg-gray-900 p-5 card-hover stat-shimmer animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-medium">{label}</p>
      {numericValue !== undefined ? (
        <CountUp
          end={numericValue}
          suffix={suffix}
          className={`text-3xl font-bold tabular-nums ${valueClass}`}
          duration={1000}
        />
      ) : (
        <p className={`text-3xl font-bold ${valueClass}`}>{displayValue ?? "—"}</p>
      )}
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}
