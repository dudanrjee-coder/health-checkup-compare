import { hospitals } from "@/lib/hospitals";
import { countByTier, districtsOf, hospitalsInSido } from "@/lib/regionStats";
import { Sido, TIER_LIST } from "@/types/hospital";

/**
 * 시·도 페이지 머리 아래에 붙이는 **데이터 해설 3~5문장** (2026-11-09, 애드센스 3단계).
 *
 * 원칙
 * - 문장 속 숫자와 이름은 전부 `data/hospitals.json`에서 **매번 계산**한다. 병원이
 *   늘거나 지정이 바뀌면 다음 빌드에서 문장도 따라 바뀐다.
 * - 사실만 적는다. "많다/적다/좋다" 같은 평가나 이유 추측은 쓰지 않는다.
 *
 * 어느 필드로 세나
 * - 병원 수: `region.sido`가 그 시·도인 병원
 * - 시·군·구: `region.sigungu`(비면 "기타") — 시·도 페이지 목록과 같은 `districtsOf`
 * - 등급: `tier` — 상급종합병원은 4곳 이하이면 이름(`name`)까지 적는다
 * - 국가검진: `nationalScreeningDesignated` — true(공단 명단에서 지정 확인) /
 *   false(명단에서 확인되지 않음) / 값 없음(아직 확인하지 못함)을 따로 센다
 * - 가격 공개: `priceRange`에 **원 단위 금액**(숫자 뒤 "원"·"만원")이 있는 병원.
 *   "본인부담 없음"처럼 금액이 없는 값은 세지 않는다
 * - 온라인 예약: `bookingUrl`(검진 예약·신청 페이지 주소)이 있는 병원
 */

const PRICE_RE = /\d\s*(?:만|천)?\s*원/;

/** 백분율. 1% 미만은 "0%"로 보이지 않게 소수 한 자리(세종 3곳 → 0.3%) */
function pct(part: number, whole: number): string {
  const p = (part / whole) * 100;
  return p > 0 && p < 1 ? `${p.toFixed(1)}%` : `${Math.round(p)}%`;
}

/** "A·B·C" — 이름 나열 */
function joinNames(names: string[]): string {
  return names.join("·");
}

export function regionSummary(sido: Sido): string[] {
  const list = hospitalsInSido(sido);
  const n = list.length;
  if (n === 0) return [];
  const total = hospitals.length;
  const out: string[] = [];

  // ① 병원 수와 시·군·구
  const districts = districtsOf(sido);
  const top = districts[0];
  const tied = districts.filter((d) => d.hospitals.length === top.hospitals.length);
  let s1 = `이 사이트에 등록된 ${sido}의 검진 병원은 ${n}곳으로, 전국 ${total.toLocaleString("ko-KR")}곳의 ${pct(n, total)}입니다.`;
  if (top.hospitals.length === 1) {
    s1 += ` ${districts.length}개 지역에 1곳씩 있습니다.`;
  } else if (tied.length > 1) {
    s1 += ` ${districts.length}개 시·군·구에 걸쳐 있고, 가장 많은 곳은 ${joinNames(tied.map((d) => d.sigungu))}(각 ${top.hospitals.length}곳)입니다.`;
  } else {
    s1 += ` ${districts.length}개 시·군·구에 걸쳐 있고, 가장 많은 곳은 ${top.sigungu}(${top.hospitals.length}곳)입니다.`;
  }
  out.push(s1);

  // ② 등급 구성
  const tiers = countByTier(list);
  const others = TIER_LIST.filter((t) => t !== "상급종합병원" && tiers[t] > 0).map(
    (t) => `${t} ${tiers[t]}곳`
  );
  const topTier = list.filter((h) => h.tier === "상급종합병원").map((h) => h.name);
  if (topTier.length === 0) {
    out.push(`상급종합병원은 등록돼 있지 않고, ${others.join(", ")}입니다.`);
  } else if (topTier.length <= 4) {
    out.push(
      `상급종합병원은 ${joinNames(topTier)} ${topTier.length}곳이고, 그 밖에 ${others.join(", ")}이 있습니다.`
    );
  } else {
    out.push(`등급별로는 상급종합병원 ${topTier.length}곳, ${others.join(", ")}입니다.`);
  }

  // ③ 국가검진 지정
  const yes = list.filter((h) => h.nationalScreeningDesignated === true).length;
  const no = list.filter((h) => h.nationalScreeningDesignated === false).length;
  const unknown = n - yes - no;
  if (yes === n) {
    out.push(`${n}곳 모두 국민건강보험공단 검진기관 명단에서 국가건강검진 지정이 확인됐습니다.`);
  } else {
    const rest = [
      no > 0 ? `명단에서 확인되지 않은 곳 ${no}곳` : "",
      unknown > 0 ? `아직 확인하지 못한 곳 ${unknown}곳` : "",
    ].filter(Boolean);
    out.push(
      `국민건강보험공단 검진기관 명단에서 국가건강검진 지정이 확인된 곳은 ${yes}곳(${pct(yes, n)})이고, ${rest.join(", ")}입니다.`
    );
  }

  // ④ 가격 공개
  const priced = list.filter((h) => h.priceRange && PRICE_RE.test(h.priceRange)).length;
  out.push(
    priced > 0
      ? `병원 홈페이지에 검진 가격이 금액으로 게시돼 있어 검진비용을 적어 둔 병원은 ${priced}곳(${pct(priced, n)})입니다.`
      : `병원 홈페이지에서 검진 가격을 금액으로 확인한 병원은 아직 없습니다.`
  );

  // ⑤ 온라인 예약
  const online = list.filter((h) => h.bookingUrl).length;
  out.push(
    online > 0
      ? `온라인으로 검진을 예약하거나 신청할 수 있는 페이지가 확인된 병원은 ${online}곳입니다.`
      : `온라인 검진 예약·신청 페이지가 확인된 병원은 아직 없습니다.`
  );

  return out;
}
