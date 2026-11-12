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
  /CSV|명단|순번|정확 일치|공식 확인|확인 필요|건에서|\d+건|조회|기준|파일|전수|엇갈|플래그|화면|근거|표시|검진항목|[—[\]]/;

/**
 * 범위 뒤에 덧붙은 말을 끊는 자리. note의 문장은 "지정 검진 종류는 **A·B·C이며
 * 공휴일검진기관이다**"처럼 범위 뒤에 다른 이야기가 이어진다. 앞의 규칙은 `이다/다.`
 * 앞까지를 통째로 집어서 어미가 잘린 채 화면에 나갔다 —
 * "일반·위암·대장암·간암 4종이고 일반검진 우수기관으로 표기돼 있". (2026-11-12, 독립 점검 ②)
 */
const SCOPE_TAIL = /(?:이고|이며|으로|로)(?=\s|,|$)/;

/** 세는 말 — "일반 한 가지", "… 6종"에서 숫자 부분만 떼어 낸다 (독립 점검 ①) */
const COUNT_WORD = /\s*(?:한 가지|두 가지|세 가지|둘뿐|셋뿐|\d+\s*(?:종|가지))$/;

/**
 * 범위 말고도 note가 적어 둔 **다른 지정**. 버리지 않고 상자 아래 한 줄로 보여 준다.
 * (독립 점검 ③)
 *
 * 꼬리의 **맨 앞에 바로 붙어 있을 때만** 집는다 — "공단 화면 [검진항목]에는
 * 학교밖청소년검진도 있다"처럼 **화면 표시**를 적어 둔 문장을 지정으로 바꿔 읽지 않기 위해서다.
 */
const EXTRA_LABELS: { pattern: RegExp; label: string }[] = [
  { pattern: /^공휴일검진기관/, label: "공휴일 검진기관" },
  { pattern: /^학교밖청소년검진 기관/, label: "학교 밖 청소년 검진기관" },
];

/** 꼬리 맨 앞에 이어 붙은 다른 지정들을 차례로 집는다 */
function extrasFromTail(tail: string): string[] {
  const found: string[] = [];
  let rest = tail.trim();
  for (;;) {
    const hit = EXTRA_LABELS.find((x) => x.pattern.test(rest));
    if (!hit) break;
    if (!found.includes(hit.label)) found.push(hit.label);
    rest = rest.replace(hit.pattern, "").replace(/^(?:이자|이며|이고|,|와|과)\s*/, "");
  }
  return found;
}

/** note에서 "지정 검진 종류는 …이다"를 찾는다 */
function parseScope(note?: string): { scope?: string; extras: string[] } {
  if (!note) return { extras: [] };
  const m = note.match(/지정 검진 종류는\s*([^.\n]{2,120}?)\s*(?:이다|다)\./);
  if (!m) return { extras: [] };
  // 괄호 설명은 떼어 낸다 — "(기관 지정 플래그 기준…)" 같은 말이 붙어 온다
  const raw = m[1].replace(/\s*[(（][^)）]*[)）]/g, "").trim();

  // 범위와 그 뒤에 이어 붙은 말을 가른다
  const cut = raw.search(SCOPE_TAIL);
  const head = cut === -1 ? raw : raw.slice(0, cut);
  const tail =
    cut === -1 ? "" : raw.slice(cut).replace(/^(?:이고|이며|으로|로)\s*,?\s*/, "");

  const scope = head.replace(COUNT_WORD, "").trim();
  const extras = extrasFromTail(tail);

  if (!scope || FORBIDDEN_IN_SCOPE.test(scope) || scope.length > 40) {
    return { extras };
  }
  return { scope, extras };
}

function scopeFromNote(note?: string): string | undefined {
  return parseScope(note).scope;
}

/**
 * 상자 아래 한 줄. 지정이 확인된 병원에만 쓴다.
 * 범위에 들어가지 않는 다른 지정(공휴일·학교 밖 청소년)을 버리지 않기 위한 자리다.
 */
export function nationalExtras(hospital: Hospital): string | undefined {
  if (hospital.nationalScreeningDesignated !== true) return undefined;
  const { extras } = parseScope(hospital.note);
  if (extras.length === 0) return undefined;
  return `${extras.join("·")}으로도 지정돼 있습니다.`;
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
