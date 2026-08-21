"use client";

import { SIDO_LIST, Sido } from "@/types/hospital";

interface SidoSelectProps {
  value: Sido | null;
  onChange: (sido: Sido) => void;
  sidosWithData: Set<Sido>;
}

export default function SidoSelect({
  value,
  onChange,
  sidosWithData,
}: SidoSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="sido-select" className="text-sm font-medium text-slate-700">
        지역 선택
      </label>
      <select
        id="sido-select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value as Sido)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="" disabled>
          시/도를 선택하세요
        </option>
        {SIDO_LIST.map((sido) => (
          <option key={sido} value={sido}>
            {sido}
            {sidosWithData.has(sido) ? "" : " (준비 중)"}
          </option>
        ))}
      </select>
    </div>
  );
}
