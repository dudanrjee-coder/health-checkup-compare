"use client";

import { useEffect, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** "2026.09.04 (금)" */
function formatDate(d: Date) {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${
    WEEKDAYS[d.getDay()]
  })`;
}

/** "20:15:20" (24시간제) */
function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 서버 렌더링 시점에는 시간을 알 수 없으므로, 마운트 전에는 아무것도
 * 그리지 않아 서버-클라이언트 hydration mismatch를 피한다.
 */
export default function DateTimeClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;

  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
      />
      <span className="whitespace-nowrap">{formatDate(now)}</span>
      <span className="whitespace-nowrap font-bold text-slate-900">
        {formatTime(now)}
      </span>
    </p>
  );
}
