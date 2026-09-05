"use client";

import { useEffect, useState } from "react";

export default function VisitorCounter() {
  const [counts, setCounts] = useState<{ total: number; today: number } | null>(
    null
  );

  useEffect(() => {
    fetch("/api/visit", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.total === "number" && typeof data.today === "number") {
          setCounts({ total: data.total, today: data.today });
        }
      })
      .catch(() => {});
  }, []);

  if (!counts) return null;

  return (
    <span className="text-xs text-slate-500">
      오늘 {counts.today.toLocaleString()}명 · 누적 {counts.total.toLocaleString()}명
      방문
    </span>
  );
}
