"use client";

import { useState } from "react";

/** 오류 제보·제휴 문의 이메일. 홈 화면과 이용 안내 페이지가 같이 쓴다. */
export const CONTACT_EMAIL = "youngmukjee@gmail.com";

/**
 * 문의 이메일 클립보드 복사. 원래 홈 화면(app/page.tsx) 안에 있던 로직을 그대로
 * 옮겨 이용 안내 페이지와 공유한다 — 복사 성공 시 2초 동안 copied가 true가 됐다가
 * 돌아온다.
 *
 * 클립보드 API를 못 쓰는 환경(권한 거부, 구형 브라우저 등)에서는 조용히 무시한다.
 * 이메일 주소가 화면에 그대로 보이므로 수동 복사가 가능하다.
 */
export function useCopyEmail() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 위 주석 참고 — 실패해도 화면의 주소로 수동 복사할 수 있다.
    }
  };
  return { copied, copy };
}
