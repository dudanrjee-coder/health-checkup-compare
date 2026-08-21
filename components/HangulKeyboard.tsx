"use client";

import { useState } from "react";
import Hangul from "hangul-js";

/**
 * 두벌식 자판 배열. shift를 누르면 쌍자음·ㅒㅖ가 나오는 자리는 별도로 둔다.
 * (표준 두벌식에서 shift가 바뀌는 자리는 첫 줄뿐이다)
 */
const ROWS = [
  ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"],
  ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"],
  ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"],
];

const SHIFTED: Record<string, string> = {
  ㅂ: "ㅃ",
  ㅈ: "ㅉ",
  ㄷ: "ㄸ",
  ㄱ: "ㄲ",
  ㅅ: "ㅆ",
  ㅐ: "ㅒ",
  ㅔ: "ㅖ",
};

/** 현재 글자에 자모 하나를 이어 붙여 다시 조합한다. */
function appendJamo(value: string, jamo: string): string {
  return Hangul.assemble([...Hangul.disassemble(value), jamo]);
}

/** 자모 하나만 지운다. "충남" → "충나" → "충ㄴ" 처럼 조합 단위로 지워진다. */
function removeLastJamo(value: string): string {
  const jamo = Hangul.disassemble(value);
  jamo.pop();
  return Hangul.assemble(jamo);
}

interface HangulKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export default function HangulKeyboard({
  value,
  onChange,
  onClose,
}: HangulKeyboardProps) {
  const [shift, setShift] = useState(false);

  function handleJamo(key: string) {
    const jamo = shift ? (SHIFTED[key] ?? key) : key;
    onChange(appendJamo(value, jamo));
    // 한 글자만 적용하고 풀리는 편이 실제 자판과 가깝다.
    if (shift) setShift(false);
  }

  const keyClass =
    "min-w-[2.25rem] rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 shadow-sm transition-colors hover:bg-slate-100 active:bg-slate-200";
  const utilClass =
    "rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-100 active:bg-slate-200";

  return (
    <div
      className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-lg"
      // 키를 눌러도 입력창의 포커스가 풀리지 않게 한다.
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="flex flex-col items-center gap-1.5">
        {ROWS.map((row, index) => (
          <div key={index} className="flex gap-1.5">
            {index === 2 && (
              <button
                type="button"
                onClick={() => setShift((prev) => !prev)}
                aria-pressed={shift}
                className={`${utilClass} ${
                  shift ? "border-blue-500 bg-blue-50 text-blue-700" : ""
                }`}
              >
                Shift
              </button>
            )}
            {row.map((key) => {
              const label = shift ? (SHIFTED[key] ?? key) : key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleJamo(key)}
                  className={keyClass}
                >
                  {label}
                </button>
              );
            })}
            {index === 2 && (
              <button
                type="button"
                onClick={() => onChange(removeLastJamo(value))}
                className={utilClass}
              >
                ← 지움
              </button>
            )}
          </div>
        ))}

        <div className="mt-1 flex gap-1.5">
          <button
            type="button"
            onClick={() => onChange(`${value} `)}
            className={`${utilClass} w-40`}
          >
            스페이스
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            className={utilClass}
          >
            전체 지우기
          </button>
          <button type="button" onClick={onClose} className={utilClass}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
