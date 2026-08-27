import { Hospital } from "@/types/hospital";

/**
 * 칩 클러스터형 카드(HospitalCardChips)가 쓰는 파생 로직.
 *
 * 41번 항목에서 note에 넣어 둔 **주제별 문단 구분(\n\n)을 그대로 재사용**해,
 * 필드에 없는 값(검진센터 위치)만 note에서 보충한다. 문단을 다시 계산하지 않는다.
 */

export type NoteTopic = "addr" | "phone" | "booking" | "national" | "etc";

export interface NoteParagraph {
  topic: NoteTopic;
  text: string;
}

/**
 * 칩 종류. 화면에서 시각적으로 확실히 구분된다(46번 항목).
 * - `reservation` 예약 수단. 쓸 수 있으면 초록으로 채우고, 없으면 회색 비활성.
 * - `info` 상태 개념이 없는 사실. 점선 테두리 + 투명 배경이라 예약 칩과 헷갈리지 않는다.
 * - `national` 국가검진 지정 여부. 채워진 초록/주황.
 */
export type ChipKind = "reservation" | "info" | "national";

export interface Chip {
  key: string;
  label: string;
  kind: ChipKind;
  /** reservation 전용. false면 회색 비활성이고 링크가 아니다. */
  active?: boolean;
  /** national 전용. 지정이면 green, 미지정이면 amber. */
  tone?: "green" | "amber";
  href?: string;
  /** 호버·탭 시 보여줄 짧은 설명 */
  tooltip?: string;
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

/**
 * bookingUrl이 비어 있을 때, 그것이 **"온라인 예약이 없다"인지 "있는데 회원
 * 전용이라 확인하지 못했다"인지** 가른다(53번 항목).
 *
 * 8번 규칙은 로그인해야만 보이는 회원 전용 예약을 기준으로 삼지 않으므로 두 경우
 * 모두 `bookingUrl`이 빈 문자열이다. 그래서 필드만으로는 구분되지 않는다. 8번
 * 규칙이 **"확인하지 못한 회원 경로가 따로 있다면 note에 남긴다"**고 정해 둔 만큼
 * 그 note가 유일한 신호이며, 42번의 "필드에 없는 것만 note에서 보충한다"는 원칙에
 * 그대로 해당한다.
 *
 * 미게시로 확정한 문단(`"온라인 예약 경로는 홈페이지에 미게시…"`)은 제외한다.
 */
const MEMBER_ONLY_RE = /로그인|회원 전용|비회원|본인인증/;
/** 경로는 있는데 어디로 가는지 확인하지 못한 경우(55번 항목의 이대목동 유형) */
const UNVERIFIED_RE = /확인하지 못|확인 불가|확인되지 않/;

export type OnlineBookingState = "available" | "memberOnly" | "unverified" | "none";

/**
 * 온라인 예약 칩이 어느 갈래인지 정한다.
 *
 * `bookingUrl`이 비어 있다고 해서 "온라인 예약이 없다"는 뜻은 아니다. 8번 규칙이
 * 로그인 전용 경로와 확인하지 못한 경로를 모두 비우게 하기 때문이다. 셋을 한
 * 칩으로 묶으면 카드가 "없다"고 단정한다(53·54번 항목).
 */
export function onlineBookingState(hospital: Hospital): OnlineBookingState {
  if (hospital.bookingUrl) return "available";
  const booking = splitNoteParagraphs(hospital.note)
    .filter((p) => p.topic === "booking")
    .filter((p) => !p.text.includes("미게시"));
  if (booking.some((p) => MEMBER_ONLY_RE.test(p.text))) return "memberOnly";
  if (booking.some((p) => UNVERIFIED_RE.test(p.text))) return "unverified";
  return "none";
}

/**
 * accessInfo를 "주차"와 "대중교통"으로 나눈다.
 *
 * 두 내용이 한 필드에 섞여 있는 곳이 많아(예: "1호선 ○○역 도보 13분. 주차 최초
 * 30분 무료…") 문장 단위로 가른다. 한쪽만 잡히면 쪼개지 않고 **그쪽 칸에** 통째로
 * 넣는다 — 교통 안내만 있는 값을 "주차"로 라벨링하면 틀린 정보가 된다.
 */
export function splitAccessInfo(accessInfo?: string): {
  parking: string;
  transit: string;
} {
  if (!accessInfo) return { parking: "", transit: "" };

  const PARKING = /주차|주차장|요금|무료|정기권|\d+면/;
  // 노선 이름만 나열하는 문장("간선 503·571과 지선 …가 경유한다")도 잡아야 한다.
  const TRANSIT =
    /호선|역|출구|도보|버스|셔틀|지하철|정류장|승강장|간선|지선|마을|광역|경유|노선/;

  const parking: string[] = [];
  const transit: string[] = [];
  let last: "parking" | "transit" | null = null;

  for (const raw of accessInfo.split(/(?<=\.)\s+/)) {
    const s = raw.trim();
    if (!s) continue;
    if (PARKING.test(s)) {
      parking.push(s);
      last = "parking";
    } else if (TRANSIT.test(s)) {
      transit.push(s);
      last = "transit";
    } else if (last === "transit") {
      transit.push(s);
    } else {
      parking.push(s);
      last = "parking";
    }
  }

  if (transit.length === 0) return { parking: accessInfo, transit: "" };
  if (parking.length === 0) return { parking: "", transit: accessInfo };

  return { parking: parking.join(" "), transit: transit.join(" ") };
}

/** 검진센터가 있는 건물·층 표기를 note에서 뽑는다. */
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
 * 카드 상단 칩을 만든다.
 *
 * **예약 칩 2개는 값이 없어도 항상 만든다.** "온라인 예약이 없다"는 것 자체가
 * 사용자에게 필요한 정보라, 칩을 빼 버리면 확인하지 못한 것과 구분되지 않는다.
 */
export function deriveChips(hospital: Hospital): Chip[] {
  const paragraphs = splitNoteParagraphs(hospital.note);
  const chips: Chip[] = [];

  // (A) 예약 수단 — 항상 둘 다
  // 세 갈래다 — 쓸 수 있음 / 아예 없음 / 있지만 회원 전용이라 확인 못 함.
  // 뒤의 둘을 "미제공" 하나로 묶으면 카드가 "없다"고 단정해 버린다(53번 항목).
  if (hospital.bookingUrl) {
    chips.push({
      key: "online",
      kind: "reservation",
      active: true,
      label: "온라인예약 바로가기 ↗",
      href: hospital.bookingUrl,
      // bookingType이 비어 있으면 "달력에서 바로 확정"으로 단정하면 안 된다.
      // 페이지는 열리는데 뒷단계를 확인하지 못한 경우가 있다(54번 항목과 같은 계열).
      tooltip:
        hospital.bookingType === "예약신청"
          ? "신청 후 상담원이 전화로 확정합니다"
          : hospital.bookingType === "자율예약"
          ? "달력에서 날짜를 골라 바로 확정합니다"
          : "예약 방식(즉시 확정/상담원 확정)은 확인하지 못했습니다",
    });
  } else if (onlineBookingState(hospital) === "memberOnly") {
    chips.push({
      key: "online",
      kind: "reservation",
      active: false,
      label: "온라인예약 (회원 전용·확인 불가)",
      tooltip: "로그인해야 보이는 경로라 예약 방식을 확인하지 못했습니다",
    });
  } else if (onlineBookingState(hospital) === "unverified") {
    chips.push({
      key: "online",
      kind: "reservation",
      active: false,
      label: "온라인예약 (확인 불가)",
      tooltip: "예약 버튼은 있으나 연결되는 경로를 확인하지 못했습니다",
    });
  } else {
    chips.push({
      key: "online",
      kind: "reservation",
      active: false,
      label: "온라인예약 (미제공)",
    });
  }

  chips.push(
    hospital.phone
      ? {
          key: "phone",
          kind: "reservation",
          active: true,
          label: `전화 ${hospital.phone}`,
          href: `tel:${hospital.phone}`,
        }
      : {
          key: "phone",
          kind: "reservation",
          active: false,
          label: "전화번호 미확인",
        }
  );

  // (B) 순수 정보 — 상태 개념이 없다
  const place = centerPlace(paragraphs);
  const separate = isSeparateBuilding(paragraphs);
  if (place) {
    chips.push({
      key: "place",
      kind: "info",
      label: separate
        ? `검진센터 ${place}(본원과 다른 건물)`
        : `검진센터 ${place}`,
    });
  } else if (separate) {
    chips.push({
      key: "place",
      kind: "info",
      label: "검진센터가 본원과 다른 건물",
    });
  }

  // (C) 국가검진 — 호버·탭하면 확인일만 보여 준다
  if (hospital.nationalScreeningDesignated === true)
    chips.push({
      key: "national",
      kind: "national",
      tone: "green",
      label: "국가검진 지정기관",
      tooltip: `확인일: ${hospital.verifiedAt}`,
    });
  else if (hospital.nationalScreeningDesignated === false)
    chips.push({
      key: "national",
      kind: "national",
      tone: "amber",
      label: "국가검진 미지정",
      tooltip: `확인일: ${hospital.verifiedAt}`,
    });

  return chips;
}
