/**
 * 표 칸(검진비용·결과통보·식사제공·주차·교통)을 **화면에 내보내기 전에** 다듬는다.
 *
 * `hospitals.json`에는 조사하면서 남긴 말이 값 안에 섞여 있다 — "요금 미확인",
 * "공식 페이지에서 확인하지 못함", "출처: 검색 스니펫" 같은 것들이다. 방문자에게는
 * **우리가 못 찾았다**는 뜻일 뿐이라 표 칸에서 가린다. `hospitals.json` 값은
 * 그대로 두므로 "기존 값 변경 금지" 원칙과 부딪히지 않고 근거는 데이터에 남는다.
 * (2026-11-12, 독립 점검 ④⑤⑥⑧⑨)
 *
 * **가리는 것은 좁게 잡는다.**
 * - `미확인`·`확인 불가`·`확인하지 못함`·`재확인 필요`처럼 **우리가 확인을 못 했다**는 말
 * - `확인함`, 홀로 선 `미게시`
 * - `이미지로만 제공돼`·`HTML 주석 처리돼`처럼 **왜 못 읽었는지** 적은 기술 메모
 * - `검색 스니펫`·`Wayback`처럼 **출처가 병원 자료가 아닌** 경우 → 그 문장을 통째로
 *
 * **가리지 않는 것.**
 * - `홈페이지에 미게시`처럼 **병원이 올리지 않았다**는 말. 방문자에게는 "홈페이지를
 *   뒤져도 없다"는 쓸모 있는 안내라 2026-11-09 점검 때도 남기기로 했다.
 * - `(영수증 확인 필요)`처럼 **방문자가 할 일**을 적은 괄호.
 *
 * **남는 글자는 원문 그대로다.** 조각을 지울 때 그 구간만 들어내고 나머지는 손대지
 * 않는다 — 다시 이어 붙이면 `1,000원`이 `1, 000원`이 되고 `A / B`의 구분선이 사라진다.
 *
 * 다듬고 나서 남는 글이 없으면 `undefined`를 주고, 화면은 평소처럼 "병원문의"를 쓴다.
 */

/** 우리가 확인을 못 했다는 말 — 이 조각만 떼어 낸다 */
const MEMO_CLAUSE =
  /미확인|확인 불가|확인하지 못|확인되지 않|확인 못|재확인 필요|확인함|찾지 못|주석 처리|이미지로만 제공|이미지 제공이라|이미지만 제공/;

/** 병원 자료가 아닌 출처 — 이런 말이 붙은 문장은 통째로 뺀다 */
const WEAK_SOURCE = /검색 스니펫|검색 요약 기반|Wayback|스냅샷|메타데이터 기준/;

/** 홀로 서면 뜻이 없는 조각 */
const BARE_NOISE = /^(미게시|미확인)$/;

/** 문장·항목 구분선. 표 칸은 ". "와 " / "를 둘 다 쓴다. */
const SEGMENT_SEP = /((?:[.。]\s+)|(?:\s+\/\s+))/;

/**
 * 문장 안의 조각 구분선 — 쉼표와 줄표. 쉼표는 **뒤에 공백이 있는 것만** 센다.
 * `1,000원`·`550,000원`의 자릿점은 공백이 없어 걸리지 않는다.
 */
const CLAUSE_SEP = /((?:,\s+)|(?:\s+—\s+))/;

function isMemo(clause: string): boolean {
  const t = clause.trim();
  if (!t) return false;
  return MEMO_CLAUSE.test(t) || BARE_NOISE.test(t);
}

/**
 * 구분선을 살린 채 나눠, 메모 조각만 **구분선과 함께** 들어낸다.
 * 남는 조각은 원문 글자 그대로다.
 */
function dropBySeparator(
  text: string,
  separator: RegExp,
  isDrop: (chunk: string) => boolean
): string {
  const tokens = text.split(separator);
  // tokens: [내용, 구분선, 내용, 구분선, …, 내용]
  const keep: boolean[] = [];
  for (let i = 0; i < tokens.length; i += 2) keep.push(!isDrop(tokens[i]));
  if (keep.every(Boolean)) return text;

  let out = "";
  let first = true;
  for (let i = 0; i < tokens.length; i += 2) {
    if (!keep[i / 2]) continue;
    if (!first) out += tokens[i - 1] ?? " ";
    out += tokens[i];
    first = false;
  }
  return out;
}

/** 괄호 안을 조각 단위로 거른다. 남는 게 없으면 괄호째 사라진다. */
function cleanParens(text: string): string {
  return text.replace(/\s*[(（]([^)）]*)[)）]/g, (whole, inner: string) => {
    const kept = dropBySeparator(inner, CLAUSE_SEP, isMemo);
    if (kept === inner) return whole;
    if (!kept.trim()) return "";
    return whole.replace(inner, kept);
  });
}

/** 조각을 들어낸 자리에 남은 쉼표·빈 괄호·겹공백만 치운다 */
function tidy(text: string): string {
  return text
    .replace(/\s*[(（]\s*[)）]/g, "")
    .replace(/\s*,\s*(?=[.。]|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,·—]+/, "")
    .replace(/[\s,·—]+$/, "")
    .trim();
}

/** 구분선은 그대로 두고 각 문장에만 `fn`을 적용한다 */
function mapSegments(text: string, fn: (segment: string) => string): string {
  return text
    .split(SEGMENT_SEP)
    .map((token, i) => (i % 2 === 1 ? token : fn(token)))
    .join("");
}

export function publicFieldText(value: string): string | undefined;
export function publicFieldText(value: string | undefined): string | undefined;
export function publicFieldText(value?: string): string | undefined {
  if (!value) return undefined;

  // ① 병원 자료가 아닌 출처가 붙은 문장은 통째로
  let out = dropBySeparator(value, SEGMENT_SEP, (seg) => WEAK_SOURCE.test(seg));
  // ② 괄호 안의 메모 조각
  out = mapSegments(out, cleanParens);
  // ③ 문장 안에서 쉼표·줄표로 이어 붙은 메모 조각
  //    (문장을 통째로 버리기 **전에** 한다 — 앞의 사실은 살려야 한다)
  out = mapSegments(out, (seg) => dropBySeparator(seg, CLAUSE_SEP, isMemo));
  // ④ 그러고도 남는 게 메모뿐인 문장은 통째로
  out = dropBySeparator(out, SEGMENT_SEP, (seg) => !seg.trim() || isMemo(seg));

  // 하나도 안 지웠으면 원문을 그대로 돌려준다(글자가 바뀌지 않도록).
  if (out === value) return value;

  const final = tidy(out);
  return final || undefined;
}
