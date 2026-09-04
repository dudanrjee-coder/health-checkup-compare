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
    <div className="w-full">
      {/* 검색창·검색 버튼과 한 줄에 나란히 놓이므로, 라벨은 화면에는 숨기고
          접근성 트리를 위해서만 남긴다(검색창의 sr-only 라벨과 같은 방식). */}
      <label htmlFor="sido-select" className="sr-only">
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
