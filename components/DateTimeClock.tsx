"use client";

import { useEffect, useState } from "react";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

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
    <p className="flex items-center gap-3 text-xs text-slate-500">
      <span className="flex items-center gap-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="h-3.5 w-3.5 shrink-0"
        >
          <rect
            x="3"
            y="4"
            width="14"
            height="13"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M3 8H17"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M6.5 2.5V5.5M13.5 2.5V5.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {dateFormatter.format(now)}
      </span>
      <span aria-hidden="true">·</span>
      <span className="flex items-center gap-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="h-3.5 w-3.5 shrink-0"
        >
          <circle
            cx="10"
            cy="10"
            r="7"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M10 6V10L12.5 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {timeFormatter.format(now)}
      </span>
    </p>
  );
}
