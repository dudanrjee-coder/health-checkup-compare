import Link from "next/link";
import { hospitals } from "@/lib/hospitals";
import { detailPath, sidoShort } from "@/lib/detailPages";
import { nationalStatement } from "@/lib/nationalStatement";
import { countDesignated, hospitalsInSido, sidosWithHospitals } from "@/lib/regionStats";
import { sidoPath } from "@/lib/sidoSlugs";
import { TIER_LIST } from "@/types/hospital";

/**
 * 검진 안내 글 속 "지역별로 찾아보기" 링크 묶음 (2026-11-09).
 *
 * 숫자는 시·도 페이지 머리의 "국가검진 지정" 알약과 **같은 함수**(countDesignated)로
 * 매번 계산한다. 글에 숫자를 적어 두면 병원이 늘 때마다 어긋나기 때문이다.
 */
export function ArticleRegionLinks() {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-1.5 p-0 text-[15px] sm:grid-cols-3">
      {sidosWithHospitals().map((sido) => {
        const list = hospitalsInSido(sido);
        return (
          <li key={sido}>
            <Link href={sidoPath(sido)} className="font-semibold text-[#2563eb] hover:underline">
              {sidoShort(sido)}
            </Link>
            <span className="ml-1.5 text-[13px] text-slate-500">
              {`${list.length}곳 · 지정 확인 ${countDesignated(list)}곳`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** 국가검진 상자 문장에서 지정 범위만 떼어 낸다 — "지정기관입니다: 일반·위암 (…)" */
function scopeOf(statement: string | undefined): string | undefined {
  const m = statement?.match(/지정기관입니다: (.+?) \(/);
  return m?.[1];
}

/**
 * 국가검진 상자에 **지정 범위가 표시된 병원 중** 범위에 `keyword`가 들어 있는 곳 몇 곳.
 *
 * 고르는 기준은 데이터뿐이다 — 등급 순(상급종합 → 종합 → 병원 → 의료원), 같은 등급은
 * 가나다순으로 앞에서부터. 추천이 아니라 "병원 페이지에서 이렇게 보인다"는 예시이고,
 * 범위를 읽어 낸 병원만 대상이라 지역별 전체 수를 뜻하지 않는다(글에도 그렇게 적는다).
 */
export function ScopeExampleLinks({ keyword, limit = 4 }: { keyword: string; limit?: number }) {
  const picks = hospitals
    .filter((h) => h.nationalScreeningDesignated === true)
    .map((h) => ({ h, scope: scopeOf(nationalStatement(h)) }))
    .filter((x) => x.scope?.split("·").some((s) => s.includes(keyword)))
    .sort(
      (a, b) =>
        TIER_LIST.indexOf(a.h.tier) - TIER_LIST.indexOf(b.h.tier) ||
        a.h.name.localeCompare(b.h.name, "ko")
    )
    .slice(0, limit);
  if (picks.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]">
      {picks.map(({ h, scope }) => (
        <li key={h.id}>
          <Link href={detailPath(h.id)} className="font-semibold text-[#2563eb] hover:underline">
            {h.name}
          </Link>
          <span className="ml-1.5 text-[13px] text-slate-500">
            {`${sidoShort(h.region.sido)} ${h.region.sigungu} · 지정 범위: ${scope}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
