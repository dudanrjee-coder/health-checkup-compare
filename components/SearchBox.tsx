"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import HangulKeyboard from "@/components/HangulKeyboard";
import { useHoverCapable } from "@/lib/useHoverCapable";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * 입력창 DOM 참조. 지역명 자동 매칭으로 검색창을 비울 때 부모가 이 참조로
   * blur를 걸어 한글 IME의 조합(composition)을 먼저 확정시킨다.
   */
  inputRef?: RefObject<HTMLInputElement>;
}

export default function SearchBox({
  value,
  onChange,
  inputRef,
}: SearchBoxProps) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // 화면 키보드는 마우스 환경에서만 쓴다. 모바일은 기기 자체 키보드를 쓴다.
  const hoverCapable = useHoverCapable();

  // 바깥을 클릭하면 접는다.
  useEffect(() => {
    if (!keyboardOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setKeyboardOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [keyboardOpen]);

  // 마우스 환경이 아니게 되면 열려 있던 키보드를 정리한다.
  useEffect(() => {
    if (!hoverCapable) setKeyboardOpen(false);
  }, [hoverCapable]);

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-72">
      <label htmlFor="hospital-search" className="sr-only">
        병원명 또는 지역 검색
      </label>
      <div className="relative">
        <input
          id="hospital-search"
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="병원명 또는 지역 검색"
          className={`w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            hoverCapable ? "pr-16" : "pr-9"
          }`}
        />

        <div className="absolute inset-y-0 right-0 flex items-center">
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="검색어 지우기"
              className="flex w-9 items-center justify-center text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
          {hoverCapable && (
            <button
              type="button"
              onClick={() => setKeyboardOpen((prev) => !prev)}
              aria-label="화면 키보드 열기"
              aria-expanded={keyboardOpen}
              title="화면 키보드"
              className={`flex w-9 items-center justify-center text-lg leading-none ${
                keyboardOpen
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              ⌨
            </button>
          )}
        </div>
      </div>

      {hoverCapable && keyboardOpen && (
        <HangulKeyboard
          value={value}
          onChange={onChange}
          onClose={() => setKeyboardOpen(false)}
        />
      )}
    </div>
  );
}
