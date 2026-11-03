import type { Hospital } from "../types/hospital";

/**
 * note를 **상세 페이지 본문으로** 꺼내는 규칙.
 *
 * note에는 조사해서 확인한 내용(검진 프로그램·가격·예약 방법·위치·주차·결과
 * 통보·국가검진 지정 근거)과, 조사하면서 남긴 내부 메모(좌표 출처, 어떤 페이지를
 * 몇 개 열었는지, 어느 필드에 왜 넣지 않았는지)가 **한 note 안에 섞여** 있다.
 * 앞의 것은 방문자에게 쓸모가 있고, 뒤의 것은 화면에 나가면 어색하다.
 *
 * 그래서 이 파일은 **문단 단위로 표시/숨김만 정한다.**
 * - 문장을 고쳐 쓰거나 요약하지 않는다. 통과한 문단은 **원문 그대로** 내보낸다.
 * - 한 문단 안에 유용한 내용과 메모가 섞여 있으면 **문단 전체를 숨긴다**(HIDE 우선).
 *   문장을 잘라 내면 원문이 아니게 되고, 자른 자리에서 뜻이 바뀐다.
 * - 국가검진 지정 근거 문단은 **무조건 표시한다**(데이터 출처를 보여 주는 신뢰
 *   요소다). 이 문단에는 공단 명단 조회일·요양기관기호 같은 말이 들어 있어
 *   아래 HIDE 신호에 걸리므로, 판정 순서에서 가장 먼저 빠져나간다.
 *
 * 문단 구분은 41번 항목에서 note에 넣어 둔 `\n\n`을 그대로 쓴다(다시 계산하지 않는다).
 */

/** 국가검진 지정 근거 문단. 여기 걸리면 HIDE 신호를 보지 않고 바로 표시한다. */
const NATIONAL_RE =
  /^(국가건강검진 지정|국가검진 지정|국가건강검진 미지정|국가검진 미지정|CSV 명단에 없어|2021년부터 공단)/;

/**
 * 내부 메모 신호. 하나라도 걸리면 그 문단은 숨긴다.
 *
 * 1) 조사 메타 — 어떤 배치에서 어느 페이지를 몇 개 열었는지
 * 2) 필드·규칙 기입 설명 — 어느 필드에 왜 넣었는지/안 넣었는지
 * 3) 좌표·주소 판정 근거
 * 4) 판단 과정·선례, 기관 식별용 번호
 */
const HIDE_RES: RegExp[] = [
  // 1) 조사 메타
  /조사분|차 배치|배치\(|전수|GNB|사이트맵|하위 ?\d+개|\d+개 (?:페이지|URL|메뉴|탭)|\d+쪽|\d+개를 (?:모두|전부)|모두 열었|전부 확인|직접 열어|키워드|0건|검색 \d|도메인 \d/,
  // 2) 필드·규칙 기입 설명
  /priceRange|bookingUrl|bookingType|resultNotice|accessInfo|mealProvided|examDuration|waitingPeriod|verifiedAt|nationalScreeningDesignated|note에|\d+번 규칙|\d+번 항목|\d+번 기준|README|으로 남긴다|넣지 않았|쓰지 않았|비웠다|적지 않았|넣지 않고|생략했다|미게시로 (?:보고|봤|남)/,
  // 3) 좌표·주소 판정
  /OSM|Nominatim|좌표|lat\/lng|WGS84|지도 마커|자릿수|우편번호|법정동|행정동/,
  // 4) 판단 과정·기관 식별
  /선례|근거로 쓰지|판단했다|판단한다|주석|display: ?none|고아 페이지|사업자(?:등록)?번호|요양기관기호|푸터|퓨니코드|리다이렉트|HIRA|심사평가원 홈페이지 필드|심평원 홈페이지 필드|별개 기관|동명/,
  /**
   * 5) **1인칭 조사 과정 서술.** 옛 note(2026-08 무렵)는 "0번 원칙으로
   * 재조사했다", "이번에 처음 채웠다", "그대로 옮겼다"처럼 작업 일지로 쓰여 있다
   * (40번 항목에서 일부만 정리됐다). 내용 자체는 맞지만 방문자에게는 남의 작업
   * 기록이라 숨긴다. "홈페이지에 미게시(2026-10-23 확인)다"처럼 **확인 결과**를
   * 적은 문장은 걸리지 않도록 동사 형태를 좁혀 둔다.
   */
  /0번 원칙|재조사|처음 채웠|채웠다|그대로 옮겼|옮기지 않|옮겨 적|근거로 적었|정정했다|훑어|모두 확인|전부 확인|확인했다|확인했고|확인해 보|열어 확인|잡히지 않아/,
];

/**
 * 방문자에게 쓸모가 있는 내용 신호. 하나라도 걸려야 표시한다(기본값은 숨김).
 *
 * 기본값을 숨김으로 둔 이유: note는 조사 기록이라 어느 문단이 메모인지 다 열거할
 * 수 없다. "유용함이 확인된 것만 보여 준다"가 반대쪽보다 안전하다.
 */
const SHOW_RES: RegExp[] = [
  // 검진 프로그램·비용
  /프로그램|종합검진|종합건강검진|검진 항목|검사 항목|만원|원\)|비용|코스|패키지|\d대암|일반검진|암검진|내시경|초음파/,
  // 예약·접수
  /예약|접수|완전예약제|전화로 문의|상담/,
  // 위치·교통·주차
  /층에 있다|층에 위치|신관|별관|본관|후관|주차|도보|호선|출구|버스|셔틀|정류장/,
  // 결과 통보·준비사항·식사
  /결과|통보|우편|모바일|금식|준비물|신분증|유의사항|식사|소요/,
  // 운영 시간
  /평일|토요일|운영 ?시간|진료시간/,
];

export interface NoteBodyBlock {
  /** `national`은 "국가건강검진 지정 근거"로 따로 묶어 보여 준다 */
  kind: "prose" | "national";
  text: string;
}

/**
 * 문단 판정은 셋이다.
 * - `show` 방문자용 내용만 있다 → 본문에 원문 그대로
 * - `hide` 내부 메모만 있다 → 숨김
 * - `mixed` **한 문단에 둘이 섞여 있다** → 지금은 숨김. 문장을 잘라 내면 원문이
 *   아니게 되고, 그대로 내보내면 "resultNotice는 미게시다"처럼 내부 용어가
 *   화면에 나간다. 어느 쪽도 규칙만으로 정할 수 없어 사람이 판단해야 한다.
 */
export type NoteVerdict = "show" | "hide" | "mixed";

export interface NoteBodyResult {
  blocks: NoteBodyBlock[];
  /** 내부 메모만 있어 숨긴 문단 수(점검용. 화면에는 아무 표기도 하지 않는다) */
  hiddenCount: number;
  /** 섞여 있어 보류한 문단들(점검용) */
  mixed: string[];
}

/** 문단 하나의 판정 */
export function verdict(text: string): NoteVerdict {
  // 국가검진 근거는 공단 명단 조회·요양기관기호 같은 말을 품고 있어 HIDE에
  // 걸리지만, 데이터 출처를 보여 주는 문단이라 언제나 표시한다.
  if (NATIONAL_RE.test(text)) return "show";
  const memo = HIDE_RES.some((re) => re.test(text));
  const useful = SHOW_RES.some((re) => re.test(text));
  if (memo && useful) return "mixed";
  if (memo) return "hide";
  return useful ? "show" : "hide";
}

/**
 * note에서 본문으로 내보낼 문단을 고른다. 원문 순서를 유지하고, 국가검진 근거
 * 문단만 맨 뒤로 모은다(note에서도 보통 마지막 문단이다).
 */
export function noteBody(note?: string): NoteBodyResult {
  const paragraphs = (note ?? "")
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);

  const prose: NoteBodyBlock[] = [];
  const national: NoteBodyBlock[] = [];
  const mixed: string[] = [];
  let hiddenCount = 0;

  for (const text of paragraphs) {
    const v = verdict(text);
    if (v === "mixed") {
      mixed.push(text);
      continue;
    }
    if (v === "hide") {
      hiddenCount += 1;
      continue;
    }
    if (NATIONAL_RE.test(text)) national.push({ kind: "national", text });
    else prose.push({ kind: "prose", text });
  }

  return { blocks: [...prose, ...national], hiddenCount, mixed };
}

/**
 * **시범 적용 병원 10곳.**
 *
 * 표시 규칙을 전체 1036곳에 한꺼번에 적용하기 전에, 등급·지역·note 길이를 섞어
 * 고른 10곳에서만 본문을 렌더해 눈으로 확인한다. 이 목록에 없는 병원의 상세
 * 페이지는 지금까지와 똑같이 그려진다.
 */
export const NOTE_BODY_PILOT_IDS: readonly string[] = [
  // 상급종합 2 — 서울·지방
  "seoul-samsung-medical",
  "gwangju-jnu",
  // 종합병원 3 — 수도권·지방, note 긴 곳
  "incheon-onnuri",
  "busan-daedong",
  "jeju-jnu",
  // 병원급 5 — 서울 3(최근 배치) · 지방 2, note 긴 곳·짧은 곳 섞음
  "seoul-gangdong-chung-hospital",
  "seoul-joeunmadi-hospital",
  "seoul-songpa-hansol-hospital",
  "daegu-barobone-hospital",
  "busan-gupo-bumin-hospital",
];

export function isNoteBodyPilot(id: string): boolean {
  return NOTE_BODY_PILOT_IDS.includes(id);
}

/** 시범 대상 병원의 본문 블록. 대상이 아니면 빈 결과를 준다. */
export function pilotNoteBody(hospital: Hospital): NoteBodyResult {
  if (!isNoteBodyPilot(hospital.id))
    return { blocks: [], hiddenCount: 0, mixed: [] };
  return noteBody(hospital.note);
}
