import type { Hospital } from "@/types/hospital";

/**
 * 국가건강검진 지정 여부를 **정해진 문장**으로 만든다.
 *
 * note 원문을 그대로 내보내면 "CSV 명단 25,514건에서 정확 일치 0건", "순번
 * 1~5985 구간", "공식 확인 필요"처럼 **조사 과정이 화면에 드러난다.** 방문자가
 * 알아야 하는 것은 지정 여부와 지정 범위, 그리고 언제 확인한 값인지
 * 셋뿐이라, 그 셋만 뽑아 고정된 문장으로 쓴다.
 *
 * 범위와 확인일은 **note에 적힌 값을 그대로 인용**한다(새로 판단하지 않는다).
 * 날짜는 **우리가 공단 명단을 확인한 날**이다. 명단 자체의 기준일이 아니므로
 * "기준"이 아니라 "확인"으로 적는다.
 * 범위를 분명하게 읽어 내지 못하면 범위 없이 지정 여부와 확인일만 쓴다.
 *
 * 지정·미지정 두 문장은 **같은 꼴**로 쓴다 — 본문을 먼저 쓰고 확인일을 괄호로
 * 뒤에 붙인다. 한쪽만 괄호가 문장 가운데 들어가면 같은 상자에서 두 문장이
 * 다른 종류의 안내처럼 읽힌다.
 */

/** 범위에 섞이면 안 되는 말 — 조사 과정이 드러나는 표현 */
const FORBIDDEN_IN_SCOPE =
  /CSV|명단|순번|정확 일치|공식 확인|확인 필요|건에서|\d+건|조회|기준|파일|전수/;

/** note에서 "지정 검진 종류는 …이다"를 찾는다 */
function scopeFromNote(note?: string): string | undefined {
  if (!note) return undefined;
  const m = note.match(/지정 검진 종류는\s*([^.\n]{2,60}?)\s*(?:이다|다)\./);
  if (!m) return undefined;
  // 괄호 설명은 떼어 낸다 — "(기관 지정 플래그 기준…)" 같은 말이 붙어 온다
  const scope = m[1].replace(/\s*[(（][^)）]*[)）]/g, "").trim();
  if (!scope || FORBIDDEN_IN_SCOPE.test(scope)) return undefined;
  if (scope.length > 40) return undefined;
  return scope;
}

/** 국가검진 지정을 적은 문단 */
const NATIONAL_PARA_RE =
  /^(국가건강검진 지정|국가검진 지정|국가건강검진 미지정|국가검진 미지정|CSV 명단에 없어|2021년부터 공단)/;

/**
 * 확인 기준일. **국가검진 문단 안의 날짜만** 본다 — note에는 주차 확인일 같은
 * 다른 날짜가 섞여 있어서, note 전체에서 첫 날짜를 집으면 엉뚱한 날이 잡힌다.
 * 그 문단에 날짜가 없으면 `verifiedAt`을 쓴다.
 */
function basisDate(hospital: Hospital): string {
  const para = (hospital.note ?? "")
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .find((t) => NATIONAL_PARA_RE.test(t));
  const m = para?.match(/(\d{4}-\d{2}-\d{2})\s*(?:조회|기준|확인)/);
  return m?.[1] ?? hospital.verifiedAt;
}

/**
 * 상자에 넣을 문장. 지정 여부를 확인하지 못한 병원은 아무 말도 하지 않는다
 * (`undefined`를 주고 상자를 만들지 않는다).
 */
export function nationalStatement(hospital: Hospital): string | undefined {
  const date = basisDate(hospital);
  if (hospital.nationalScreeningDesignated === true) {
    const scope = scopeFromNote(hospital.note);
    return scope
      ? `국가건강검진 지정기관입니다: ${scope} (국민건강보험공단 명단 ${date} 확인)`
      : `국가건강검진 지정기관입니다 (국민건강보험공단 명단 ${date} 확인)`;
  }
  if (hospital.nationalScreeningDesignated === false) {
    return `국민건강보험공단 검진기관 명단에서 확인되지 않습니다 (${date} 확인)`;
  }
  return undefined;
}
