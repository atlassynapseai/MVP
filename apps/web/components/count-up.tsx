"use client";
import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export function CountUp({ end, duration = 1100, suffix = "", className }: CountUpProps) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (end === 0) { setValue(0); return; }

    function step(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const pct = Math.min((ts - startRef.current) / duration, 1);
      // easeOutExpo
      const eased = pct === 1 ? 1 : 1 - Math.pow(2, -10 * pct);
      setValue(Math.round(eased * end));
      if (pct < 1) rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [end, duration]);

  return (
    <span className={className}>
      {value.toLocaleString()}{suffix}
    </span>
  );
}
