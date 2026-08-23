import { Hospital } from "@/types/hospital";

/**
 * note를 주제별 문단으로 나누고, 거기서 카드 상단에 띄울 "칩"을 뽑는다.
 *
 * 41번 항목에서 note에 이미 주제별 문단 구분(\n\n)을 넣어 두었으므로
 * 문단을 다시 계산하지 않고 그대로 쓴다. 주제 판별에 쓰는 정규식도
 * scripts 쪽 문단 분리와 같은 기준(주소 → 연락처 → 예약 → 국가검진)이다.
 */

export type ChipTone = "default" | "national" | "warn";

export interface Chip {
  label: string;
  tone: ChipTone;
  /** 전화 칩만 tel: 링크로 만든다 */
  href?: string;
}

const NATIONAL_MARKERS = [
  "국가건강검진 지정기관(",
  "국가건강검진 미지정 —",
  "CSV 명단에 없어 국가검진 미지정",
  "2021년부터 공단(국가)건강검진 미시행",
];

const TOPIC_RE: [NoteTopic, RegExp][] = [
  [
    "addr",
    /OSM|Nominatim|좌표|지도 마커|우편번호|법정동|행정동|도로명|주소|번지|오시는|본원과 다른 건물|별관|후관|본관|신관|목동관|미래관|다정관|생명관|삼성본관|[0-9]+층|지하 ?[0-9]/,
  ],
  [
    "phone",
    /번호|대표전화|전화번호|팩스|내선|ARS|콜센터|국번|자릿수|직통|끊어 표기|\d{2,4}-\d{3,4}-\d{4}|\b\d{4}-\d{4}\b/,
  ],
  [
    "booking",
    /예약|온라인|인터넷|로그인|회원|달력|콜백|플랫폼|폼|신청|접수 중단|LifeR|카카오톡/,
  ],
];

export type NoteTopic = "addr" | "phone" | "booking" | "national" | "etc";

export interface NoteParagraph {
  topic: NoteTopic;
  text: string;
}

/** note를 문단 단위로 쪼개고 각 문단의 주제를 붙인다. */
export function splitNoteParagraphs(note?: string): NoteParagraph[] {
  if (!note) return [];
  return note
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text) => {
      if (NATIONAL_MARKERS.some((m) => text.startsWith(m)))
        return { topic: "national" as const, text };
      for (const [topic, re] of TOPIC_RE)
        if (re.test(text)) return { topic, text };
      return { topic: "etc" as const, text };
    });
}

/** "건강증진센터 대표번호(...)" 같은 문장 머리에서 창구 이름만 떼어낸다. */
function centerName(paragraphs: NoteParagraph[]): string | undefined {
  const p = paragraphs.find((x) => x.topic === "phone");
  if (!p) return undefined;
  const m = p.text.match(
    /^((?:종합|개인|일반)?(?:건강)?(?:증진|검진|건진|의학)?센터|[가-힣]*(?:센터|과|실))\s*(?:전용\s*)?(?:대표\s*)?(?:예약\s*)?(?:직통\s*)?번호/
  );
  return m?.[1];
}

/** 검진센터가 있는 건물·층 표기를 뽑는다. */
function centerPlace(paragraphs: NoteParagraph[]): string | undefined {
  const text = paragraphs
    .filter((x) => x.topic === "addr")
    .map((x) => x.text)
    .join(" ");
  if (!text) return undefined;
  const m = text.match(
    /((?:본관|별관|후관|신관|목동관|미래관|다정관|생명관|암병원|서관|동관|삼성본관)\s*(?:지하\s*)?B?\d*\s*층)/
  );
  return m?.[1]?.replace(/\s+/g, " ");
}

/** 검진센터가 본원과 다른 건물인지 */
function isSeparateBuilding(paragraphs: NoteParagraph[]): boolean {
  return paragraphs.some((x) => x.text.includes("본원과 다른 건물"));
}

/**
 * 카드 상단에 띄울 칩을 만든다.
 * 데이터 필드(phone·bookingType·nationalScreeningDesignated 등)를 1차 근거로 쓰고,
 * note 문단에서는 필드에 없는 것(검진센터 위치, 창구 이름)만 보충한다.
 */
export function deriveChips(hospital: Hospital): Chip[] {
  const paragraphs = splitNoteParagraphs(hospital.note);
  const chips: Chip[] = [];

  // 1) 전화번호 — 창구 이름을 알면 함께 보여준다
  if (hospital.phone) {
    const name = centerName(paragraphs);
    chips.push({
      label: name ? `${name} ${hospital.phone}` : hospital.phone,
      tone: "default",
      href: `tel:${hospital.phone}`,
    });
  } else {
    chips.push({ label: "전화번호 확인 필요", tone: "warn" });
  }

  // 2) 검진센터 위치 — 본원과 다른 건물이면 그 사실을 강조한다
  const place = centerPlace(paragraphs);
  const separate = isSeparateBuilding(paragraphs);
  if (place) {
    chips.push({
      label: separate ? `검진센터 ${place}(본원과 다른 건물)` : `검진센터 ${place}`,
      tone: separate ? "warn" : "default",
    });
  } else if (separate) {
    chips.push({ label: "검진센터가 본원과 다른 건물", tone: "warn" });
  }

  // 3) 온라인 예약 가능 여부
  if (hospital.bookingUrl) {
    chips.push({
      label:
        hospital.bookingType === "예약신청"
          ? "온라인 예약(상담원 콜백)"
          : "온라인 예약",
      tone: "default",
    });
  } else {
    chips.push({ label: "전화·방문 예약만", tone: "default" });
  }

  // 4) 채워져 있을 때만 붙이는 부가 칩
  if (hospital.duration) chips.push({ label: `소요 ${hospital.duration}`, tone: "default" });
  if (hospital.mealProvided) chips.push({ label: `식사 ${hospital.mealProvided}`, tone: "default" });

  // 5) 국가검진 — 지정은 초록으로 강조, 미지정은 주황
  if (hospital.nationalScreeningDesignated === true)
    chips.push({ label: "국가검진 지정기관", tone: "national" });
  else if (hospital.nationalScreeningDesignated === false)
    chips.push({ label: "국가검진 미지정", tone: "warn" });

  return chips;
}
