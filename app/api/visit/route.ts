import { kv } from "@vercel/kv";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "hc_visited";
const TOTAL_KEY = "visitors:total";

/** 자정 기준을 KST로 고정한다(서버 리전과 무관하게 "오늘"이 같아야 함) */
function todayKST(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export async function GET() {
  const today = todayKST();
  const todayKey = `visitors:${today}`;
  const alreadyVisitedToday = cookies().get(COOKIE_NAME)?.value === today;

  let total: number | null = null;
  let todayCount: number | null = null;

  try {
    if (alreadyVisitedToday) {
      [total, todayCount] = await Promise.all([
        kv.get<number>(TOTAL_KEY),
        kv.get<number>(todayKey),
      ]);
    } else {
      [total, todayCount] = await Promise.all([
        kv.incr(TOTAL_KEY),
        kv.incr(todayKey),
      ]);
    }
  } catch {
    // KV 미설정(마켓플레이스 연동 전) 등 접속 실패 시 카운트 없이 조용히 넘어간다
    return NextResponse.json({ total: null, today: null });
  }

  const res = NextResponse.json({ total: total ?? 0, today: todayCount ?? 0 });
  if (!alreadyVisitedToday) {
    res.cookies.set(COOKIE_NAME, today, {
      path: "/",
      maxAge: 60 * 60 * 24 * 2,
      sameSite: "lax",
    });
  }
  return res;
}
