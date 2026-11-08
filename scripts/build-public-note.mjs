/**
 * note에서 **방문자용 문장만 골라** `publicNote` 필드를 만든다.
 *
 * 절대 원칙
 * - `note`는 한 글자도 바꾸지 않는다. publicNote는 note **문장을 그대로 복사**한 것이고,
 *   고쳐 쓰거나 요약하지 않는다. 그래서 publicNote의 모든 문장은 note 안에 글자 그대로 있다.
 * - 기존 값도 바꾸지 않는다. 이 스크립트는 `"publicNote"` 줄을 **새로 끼워 넣기만** 한다.
 *   이미 있는 병원은 건너뛴다(멱등).
 *
 * 쓰는 법
 *   node scripts/build-public-note.mjs --dry           # 판정만 출력, 파일 안 건드림
 *   node scripts/build-public-note.mjs --dry --id=<id> # 한 곳만 문장별로 자세히
 *   node scripts/build-public-note.mjs                 # 시범 10곳에 주입
 *   node scripts/build-public-note.mjs --all           # 전체 적용(2단계에서)
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const FILE = path.resolve("data/hospitals.json");

/** 1.5단계 시범 10곳 — 1단계(lib/noteBody.ts)와 같은 병원이다 */
export const PILOT_IDS = [
  "seoul-samsung-medical",
  "gwangju-jnu",
  "incheon-onnuri",
  "busan-daedong",
  "jeju-jnu",
  "seoul-gangdong-chung-hospital",
  "seoul-joeunmadi-hospital",
  "seoul-songpa-hansol-hospital",
  "daegu-barobone-hospital",
  "busan-gupo-bumin-hospital",
];

/** 국가검진 지정 근거 문단 — 상자에서 정형문으로 보여 주므로 publicNote에는 넣지 않는다 */
const NATIONAL_RE =
  /^(국가건강검진 지정|국가검진 지정|국가건강검진 미지정|국가검진 미지정|CSV 명단에 없어|2021년부터 공단)/;

/**
 * ③ 조사 과정·분류 표현, 그리고 ① 내부 메모. 한 문장에 하나라도 있으면 뺀다.
 * (정보와 메모가 한 문장에 섞여 있어도 문장을 자르지 않고 통째로 뺀다 = 원칙 ①)
 */
const MEMO_RE = [
  // 조사 과정·분류 표현
  /해당한다|해당된다|어디에도|\d+갈래|열어 보|확인했다|확인했고|확인해 보|확인한다|살펴보|훑어|전수|모두 열었|모두 확인|전부 확인|직접 열어|키워드|0건|검색 \d|도메인 \d|사이트맵|GNB/,
  // 확인 자체를 가리키는 말 — "2026-08 홈페이지 확인값", "다시 확인하지는 않았다"
  /확인값|확인하지는|확인하지 않|적용하지 않|적용했다|적용한다|확인된다|확인됐다|확인되었다|판정했|판정한다|판별했/,
  // 조사자가 내린 결론·처리를 적은 말
  /기존 판정|판정 유지|따랐다|따른다|뺐다|공식 확인|\d+번 기준|그대로 썼|로 봤다|보기로 했/,
  // 조사자가 무엇을 했는지 적은 말(판독·내려받기·폼 미제출 등)
  /판독했|내려받|제출하지 않|분류가 없|분류만 있|비급여 목록|보이지 않는다|잡히지 않/,
  // 내부 경로·주소가 드러나는 문장(방문자용 문장에 파일 경로·URL은 넣지 않는다)
  /https?:\/\/|\/bbs\/|\b[A-Za-z0-9_\-]+\.(?:php|asp|html|do)\b|[a-z0-9-]+\.(?:com|kr|net|org)\/[^\s)]/,
  // **맨 도메인**도 뺀다. 위 규칙은 도메인 뒤에 경로가 붙은 것만 잡아서
  // "공식 도메인(leadersas.kr)이 …"이 화면에 나갔다(2026-11-09).
  // 앞이 ASCII라 한글 문장은 걸리지 않는다.
  /[a-z0-9][a-z0-9-]{1,}\.(?:co\.kr|or\.kr|go\.kr|ne\.kr|kr|com|net|org)\b/i,
  // 홈페이지를 찾으려고 무엇을 뒤졌는지 적은 말
  /WebSearch|Wayback|굿닥|하이닥|모두닥|닥터나우|위즈닥터|wizdoctor|애그리게이터|아그리게이터|제3자|자체 도메인|도메인 자체|DNS|호스팅|스냅샷|검색 결과에/,
  // 자료·규칙·필드를 가리키는 말
  /CSV|명단|필드|규칙|항목 번호|README|심사평가원|심평원|HIRA|요양기관기호|사업자(?:등록)?번호|푸터|퓨니코드|리다이렉트/,
  // 필드 기입 설명
  // 필드 이름은 **타입에 있는 것을 다 적는다.** sourceUrl이 빠져 있어
  // "기존 sourceUrl(…)은 404여서 현재 경로로 교체."가 화면에 나갔다(2026-11-08).
  /priceRange|bookingUrl|bookingType|resultNotice|accessInfo|mealProvided|examDuration|waitingPeriod|verifiedAt|phone|sourceUrl|reservationMethod|affiliation|publicNote|nationalScreeningDesignated|note에|미게시|넣지 않|쓰지 않|비웠다|적지 않|생략했다|으로 남긴다|채웠다|그대로 옮겼|옮기지 않|근거로 적었|정정했다|에 썼다|으로 썼다|가장 포괄적|로 교체|보지 않는다|보지 않았다/,
  // 조사자가 "이렇게 본다"고 적은 말
  /로 본다|으로 본다|확인되지 않|확인 불가|확인하지 못|볼 수 없|보기 어렵/,
  // 필드에 **무엇을 어떻게 적었는지** 설명한 말. 2026-11-08에 추가했다 —
  // 시범 10곳을 화면에서 읽어 보니 "일반(기본) 검진 기준 하나만 남겨
  // '약 4시간'로 적었다" 같은 문장이 그대로 노출되고 있었다. 표에 이미 같은
  // 값이 있고, 방문자에게는 우리가 어느 값을 골랐는지가 아무 뜻이 없다.
  /로 적었다|로 적었고|라고 적었다|하나만 남겨|만 남겼|만 남긴다|로 처리했|로 처리한다|로 기재했|기재한다|2순위|1순위/,
  // 조사 절차 자체를 가리키는 말(0번 체크리스트·N번 원칙·이전 조사 정정)
  // "오기"는 앞에 공백을 둬야 한다 — "나오기까지"처럼 다른 낱말에 묻혀 있다
  /체크리스트|\d+번 원칙|\d+단계대로|정정|잘못 기재|바로잡| 오기다| 오기로| 오기라/,
  // README 규칙 번호를 가리키는 말. "57번 항목", "58번 항목의 4단계", "71번 항목 기준"
  /\d+번 항목|\d+번 규칙|\d+번째 규칙/,
  // 공단 CSV 대조 과정. 국가검진 문단은 통째로 빼지만, 순번 이야기가 다른
  // 문단에 흩어져 있는 병원이 있다(2026-11-09).
  /순번|인접행|앞뒤 행|단독 매칭|무관 후보|무관함|오케스트레이터|지역 불명|블록\)|시 블록|구 블록/,
  // 값을 어디에 어떻게 남겼는지 적은 말
  // "적었"은 조사자가 적은 경우가 대부분이지만, 병원이 적은 것을 옮긴 문장도
  // 함께 빠진다(광주병원 1곳). 그래도 메모 노출 0건이 먼저다.
  /남겼다|남긴다|남겨 둔|여기 적는|여기에 남긴|함께 남겼|적었|확정했다|확정한다|보강했|보충했|맞췄|줄였다|넓혔다|빈 값|종전에는|이전 기록|이전 조사|다음에 볼 때/,
  // 아직 못 끝낸 일·다시 볼 일을 적은 말
  /재확인|확인이 더|확인 필요|미확인|주의가 필요|출처마다|페이지마다|따름\.|플래그|노드가|사이트맵|sitemap|시군구는|찾지 못|발견하지 못/,
  // 여러 값 중 **우리가 하나를 골랐다**고 적은 말 (2026-11-09, 시범 렌더에서 발견)
  /골랐다|골라 적|골라 넣|택했다|택해 적|고른 값|우선했다|앞세웠다|옮겼다/,
  // 값을 어디에 어떤 꼴로 넣었는지·비워 뒀는지 적은 말
  /쓰고 있다|써 뒀|적어 두었다|적어 둔 값|비워 둔|그대로 두었|그대로 둔다|둔다\.|유지한다|유지했다|반영했다|반영한다|표기가 이미|형식을 채우|형식은 채우|채우지 못|채울 수 없|도보 N분/,
  // 두 출처가 엇갈린다는 메모
  /엇갈|어느 쪽이|표기가 다르다|표기는 다르다|둘 다 옮|둘 다 남|차이를 여기/,
  // 바로 앞 문장에 매달린 꼬리. 앞 문장이 빠지면 가리킬 것이 없어진다.
  /도 함께 (적혀|안내|나온다|있다|남)|도 같이 (적|안내)|라는 단서|단서도|같은 곳에|같은 페이지의|같은 표에|여기에도|거기에도/,
  // 내부 문서·쿼리 문자열
  /[a-z-]+\.md\b|\?[A-Za-z_]+=|\d+번 시점/,
  // **어느 페이지를 열어 봤는지** 나열한 문장. 조사 기록의 첫 줄에 늘 나오고,
  // 메뉴 이름을 수십 개 늘어놓아 방문자에게는 읽을 수 없는 목록이 된다.
  /열었다|열어 봤|열어봤|열람했|훑었|뒤졌|받아 열었|전부 열|다 열어|읽음\)|\bDOM\b|열지 않|열지 못/,
  // 파일 이름이 드러나는 문장 — "이미지 기반 페이지, cancer_01~10.jpg"
  /\.(?:jpg|jpeg|png|gif|webp|svg|pdf|xlsx?|hwp|docx?|zip|json|xml|csv|js|ts)\b/i,
  /파일명|고아 경로|수집했|채택하지|채택했/,
  // 2026-11-09 무작위 20곳 렌더 확인에서 더 나온 꼴
  /뺀 상세|뺀 내용|뺀 항목|읽지 않|읽지 못|교차검증|교차 확인|근거다/,
  // 사이트가 어떻게 만들어졌는지 적은 기술 메모 — 창원파티마의
  // "프로그램 페이지가 SPA라 HTML만 받으면 빈 껍데기가 오고 …"
  /\bSPA\b|\bHTML\b|빈 껍데기|탭 패널|렌더링|자바스크립트|JS 클릭|스크립트 렌더/,
  // 내부 경로·페이지 코드·쿼리 문자열 — "/gumiHealth/", "sub07_01", "tc_idx=153", "p=2_3_3_4".
  // **소문자로 시작하는 것만** 잡는다. 대문자 프로그램 이름(BASIC/SMART/PREMIUM,
  // PET-MRI, VIP)은 병원이 쓰는 실제 상품명이라 남겨야 한다.
  /\/[a-z][a-z0-9_]{2,}|\/\d|\b[a-z]{1,12}_[a-z0-9_]+\b|\b[a-z]{1,10}\d{2,}(?:[_-]\d+)*\b|[a-z_]+=\d|\bid:|raw HTML|HTML 소스|배치 \d/,
  // 값을 어디서 가져왔는지·못 찾았는지 적은 말
  /가져왔다|가져온 값|발견 안|발견되지 않/,
  // 우리가 어느 쪽 표기를 앞세웠는지 적은 말
  /따랐|앞에 두|뒤에 두|쪽을 앞에/,
  // 좌표·주소 판정
  /OSM|Nominatim|좌표|lat\/lng|WGS84|지도 마커|자릿수|법정동|행정동/,
  // 판단·선례·동명 대조
  /선례|근거로 쓰지|판단했다|판단한다|판단은|주석|display: ?none|고아 페이지|별개 기관|동명|조사분|차 배치|배치\(|0번 원칙|재조사/,
];

/** ② 혼자 읽으면 뜻이 통하지 않는 문장 — 괄호·기호·번호로 시작하거나 앞 문장을 가리킨다 */
const FRAGMENT_START_RE = /^[(（※·\-–—*[\d]/;

/**
 * **인용만 늘어놓고 제 말이 없는 문장**인지 (2026-11-09 추가).
 *
 * 천안충무병원에 `"주차료는 … 제시하면 됩니다"와 "검진 후 죽 쿠폰을 …"다.`가
 * 나왔다. 주어가 앞 문장에 있어서 혼자서는 무슨 안내인지 알 수 없다.
 *
 * 따옴표로 시작하는 문장을 모두 빼면 안 된다 — `'종합 건강검진' 페이지 아래쪽
 * 분류표에 … 검진 베이직 30만원 …`처럼 **인용은 페이지 이름일 뿐이고 본문이
 * 뒤에 다 있는** 문장이 60개(5,006자)나 된다. 그래서 따옴표 안을 지우고
 * **남는 글이 거의 없을 때만** 뺀다.
 */
/**
 * ⑦ 홈페이지 **메뉴 이름만 늘어놓은 조각**인지 (2026-11-09 추가).
 *
 * 조사 기록은 "어느 메뉴를 봤는지"를 적는데, 동사 없이 메뉴 이름만 늘어놓은
 * 줄이 있다 — `"병원소개(소개·의료진소개·병원둘러보기…), 관절센터, 척추센터, …"`.
 * 방문자에게는 읽을 수 없는 목록이다.
 *
 * 가격표와 **반드시** 구분해야 한다. `"뇌MRI 59만원, 뇌MRA 59만원, …"`도 가운뎃점이
 * 많지만 2단계에서 살리기로 한 알짜 내용이다. 그래서 세 조건을 모두 본다 —
 * 가운뎃점 4개 이상, **숫자가 하나도 없고**(가격표는 전부 숫자가 있다),
 * 종결 어미로 끝나지 않으며, 괄호 묶음이 2개 이상이거나 가운뎃점이 8개 이상.
 * 전수에서 10조각만 걸리고, 그중 9개가 메뉴 나열이다.
 */
const MENU_DUMP_END_RE = /(?:다|요|음|함|됨|오|까)[.!?]$/;

function isMenuDump(sentence) {
  const dots = (sentence.match(/·/g) || []).length;
  if (dots < 4) return false;
  if (/\d/.test(sentence)) return false;
  if (MENU_DUMP_END_RE.test(sentence)) return false;
  const groups = (sentence.match(/\([^)]*\)/g) || []).length;
  return groups >= 2 || dots >= 8;
}

function isQuoteOnly(sentence) {
  if (!/["'“‘「『]/.test(sentence)) return false;
  const rest = sentence
    .replace(/"[^"]*"|'[^']*'|“[^”]*”|‘[^’]*’|「[^」]*」|『[^』]*』/g, "")
    .replace(/[\s.,!?·와과및그리고]/g, "");
  return rest.length < 8;
}
const ANAPHORA_START_RE =
  /^(그|이|저|위|해당|둘|셋|나머지|앞|뒤|거기|여기|반면|다만|또|또한|그래서|그러나|그리고|이때|이외|이 외|이는|그중|그 중|같은|양쪽|후자|전자)/;

/** 문장 끝으로 볼 수 있는 꼴. 이게 아니면 문장이 잘렸다고 보고 뺀다 */
const SENTENCE_END_RE = /(다|요|까|음|함|됨)[.!?]$|[.!?]$/;

/**
 * ⑤ 혼자 읽으면 뜻이 통하지 않는 **짧은 조각**을 걸러 내는 기준 (2026-11-09 추가).
 *
 * `"대표번호(검진 전용 번호 없음)."`(88곳), `"메뉴는 살아 있지만 기능은 없다."`처럼
 * 문법은 온전하지만 앞 문장 없이는 아무 뜻이 없는 짧은 문장이 화면에 깔려 있었다.
 * 조사 기록에서는 바로 앞 줄이 무엇을 가리키는지 알지만, 화면에서는 그 앞 줄이
 * 빠져 있어 방문자에게는 빈 말이 된다.
 *
 * 짧아도 **숫자·장소·시간**이 들어 있으면 그 자체로 뜻이 통하므로 남긴다
 * (`"센터는 암병원 3층."`, `"접수는 평일 오전 7시30분~9시30분이다."`).
 * 숫자 하나가 장소·시간 대부분을 덮는다. 숫자 없이 장소·시간을 가리키는 말만
 * 따로 적는데, **한 글자(관·동·호)는 쓸 수 없다** — "번호"의 호, "기관"의 관이 걸린다.
 *
 * 방문자가 **실제로 할 수 있는 일/못 하는 일**을 적은 짧은 문장도 남긴다
 * (`"온라인 예약 불가, 전화예약만 가능."` 58곳, `"수면내시경 시 자가운전 불가."`).
 * 기준안 그대로면 이 둘까지 빠져서 아까웠다.
 */
const SHORT_MIN_LENGTH = 25;
const CONCRETE_RE =
  /\d|오전|오후|요일|공휴일|평일|주말|지하|본관|별관|신관|구관|정문|후문|로비|전화예약만|방문예약만|완전예약제|금식|자가운전/;

/** 괄호·따옴표가 모두 닫혔는지 — 문장 중간에서 끊겼는지 보는 데 쓴다 */
function balanced(s) {
  const n = (re) => (s.match(re) || []).length;
  return (
    n(/\(/g) === n(/\)/g) &&
    n(/（/g) === n(/）/g) &&
    n(/「/g) === n(/」/g) &&
    n(/'/g) % 2 === 0 &&
    n(/"/g) % 2 === 0
  );
}

/**
 * 문장 단위로 쪼갠다.
 * - 마침표 뒤에 공백이 있을 때만 끊어 도메인·전화번호를 보호한다.
 * - **괄호·따옴표가 닫히지 않았으면 다음 조각을 붙인다.** 그러지 않으면
 *   `"… 수면비 별도."` / `"공단 검진 해당 시 … 차감),"`처럼 괄호 한가운데가
 *   잘려 두 문장이 다 깨진다.
 */
export function splitSentences(paragraph) {
  const pieces = paragraph
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out = [];
  let buf = "";
  for (const piece of pieces) {
    buf = buf ? `${buf} ${piece}` : piece;
    if (balanced(buf)) {
      out.push(buf);
      buf = "";
    }
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * 표 값보다 이만큼 길면 **표보다 더 많은 내용을 담은 것**으로 본다.
 *
 * 2026-11-08 추가한 ④의 예외다. 표는 가격을 범위로만 보여 준다 —
 * `"기본종합검진 남 30만원·여 35만원 ~ VIP특화 남 150만원·여 155만원"`.
 * note에는 가운데 등급(프리미엄 60/65, 골드 125/130)과 각 패키지에 든 검사
 * 항목까지 있어서, 겹친다고 통째로 빼면 병원 고유 정보가 함께 사라진다.
 * 길이로 재는 것은 거친 기준이지만, "표 값이 조각 안에 들어 있다"는 사실에
 * 더해 **조각이 표보다 훨씬 길다**면 나머지가 새 내용이라는 뜻이다.
 */
const TABLE_LONGER_RATIO = 1.3;

/**
 * ④ 화면 표(검진비용·결과통보·소요시간·식사·주차·교통)와 같은 내용을 반복하는지.
 * 표 값보다 `TABLE_LONGER_RATIO`배 넘게 길면 반복이 아니라고 본다.
 */
function repeatsTable(sentence, hospital) {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const target = norm(sentence);
  const fields = [
    hospital.priceRange,
    hospital.resultNotice,
    hospital.examDuration,
    hospital.mealProvided,
    hospital.accessInfo,
  ].filter(Boolean);
  for (const raw of fields) {
    const value = norm(raw);
    // 표 값의 15자 창이 문장 안에 그대로 있으면 같은 내용을 가리키는 것으로 본다
    let overlaps = false;
    for (let i = 0; i + 15 <= value.length; i += 1) {
      if (target.includes(value.slice(i, i + 15))) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) continue;
    // 겹치더라도 표보다 훨씬 길면 표에 없는 내용을 더 담고 있다
    if (target.length > value.length * TABLE_LONGER_RATIO) continue;
    return true;
  }
  return false;
}

/** 문장 하나의 판정. keep이면 null, 아니면 뺀 이유를 돌려준다. */
export function dropReason(sentence, hospital, prevDropped) {
  if (sentence.length < 10) return "너무 짧음";
  if (!SENTENCE_END_RE.test(sentence)) return "문장이 끝나지 않음(분리 오류 가능)";
  if (FRAGMENT_START_RE.test(sentence)) return "② 괄호·기호·번호로 시작";
  if (prevDropped && ANAPHORA_START_RE.test(sentence))
    return "② 앞 문장을 가리키는데 그 앞 문장이 빠짐";
  for (const re of MEMO_RE) if (re.test(sentence)) return "①③ 내부 메모·조사 과정 표현";
  if (sentence.length < SHORT_MIN_LENGTH && !CONCRETE_RE.test(sentence))
    return "⑤ 짧고 혼자서는 뜻이 통하지 않음";
  if (isQuoteOnly(sentence)) return "② 인용만 있고 제 말이 없음";
  if (isMenuDump(sentence)) return "⑦ 홈페이지 메뉴 이름만 나열";
  if (repeatsTable(sentence, hospital)) return "④ 화면 표와 같은 내용";
  return null;
}

/**
 * 조각(문장 가운데에서 끝나는 글)의 판정. `dropReason`과 같은데 **종결 어미 검사만
 * 뺀다** — 뒤 메모를 잘라내면 남는 쪽이 문장 가운데라 마침표가 없다.
 */
function fragmentDropReason(text, hospital, prevDropped) {
  if (text.length < 15) return "너무 짧음";
  if (!balanced(text)) return "괄호·따옴표가 닫히지 않음";
  if (FRAGMENT_START_RE.test(text)) return "② 괄호·기호·번호로 시작";
  if (prevDropped && ANAPHORA_START_RE.test(text))
    return "② 앞 문장을 가리키는데 그 앞 문장이 빠짐";
  for (const re of MEMO_RE) if (re.test(text)) return "①③ 내부 메모·조사 과정 표현";
  if (repeatsTable(text, hospital)) return "④ 화면 표와 같은 내용";
  return null;
}

/**
 * 앞 메모를 떼어 낼 수 있는 구분자. 여기서 자르면 **뒤쪽이 원래 문장의 끝**이라
 * 종결 어미와 마침표가 그대로 붙어 있어 혼자서도 문장으로 읽힌다.
 * 예: `"검진비용은 … 라이브 탭 4개에서 확인했다 — 기본종합검진 남 30만원·…"`
 */
const LEAD_DELIMS = [" — ", " – ", " -- ", ": "];

/**
 * 뒤 메모를 떼어 낼 수 있는 연결 어미. 여기서 자르면 남는 쪽이 **문장 가운데**라
 * 마침표 없이 연결 어미로 끝난다(`"… 따로 적혀 있어"`). 그래서 기본값은 끄고
 * `--trim-trail`을 줄 때만 쓴다.
 */
const TRAIL_CONNECTIVE_RE = /(?:적혀 있어|있어서|있어|뿐이고|이고|없고|라서|어서|지만|는데|으며)(?=\s)/g;

/**
 * 문장 하나에서 **앞뒤 메모만 잘라내고** 남은 부분을 돌려준다.
 * 잘라낸 결과는 문장의 연속된 부분 문자열이므로 note 안에 글자 그대로 있다.
 * 살릴 수 없으면 null.
 */
export function trimSentence(sentence, hospital, prevDropped, { lead = true, trail = false } = {}) {
  // ① 앞 잘라내기 — 가장 왼쪽 구분자부터 보며 **가장 많이 남는** 쪽을 고른다
  for (const d of lead ? LEAD_DELIMS : []) {
    let from = 0;
    for (;;) {
      const i = sentence.indexOf(d, from);
      if (i === -1) break;
      from = i + d.length;
      const head = sentence.slice(0, i);
      const tail = sentence.slice(i + d.length);
      if (!head.trim()) continue;
      // 구분자가 괄호 안에 있으면 자른 쪽의 괄호가 짝을 잃는다
      if (!balanced(tail)) continue;
      if (!dropReason(tail, hospital, prevDropped)) {
        return { text: tail, how: "앞 잘라냄", cut: `${head}${d}`, side: "lead" };
      }
    }
  }

  if (!trail) return null;

  // ② 뒤 잘라내기 — 가장 오른쪽 연결 어미부터 보며 **가장 많이 남는** 쪽을 고른다
  const bounds = [...sentence.matchAll(TRAIL_CONNECTIVE_RE)].map((m) => m.index + m[0].length);
  for (const end of bounds.reverse()) {
    const head = sentence.slice(0, end);
    const cut = sentence.slice(end);
    if (cut.trim().length < 6) continue;
    if (!fragmentDropReason(head, hospital, prevDropped)) {
      return { text: head, how: "뒤 잘라냄", cut, side: "trail" };
    }
  }
  return null;
}

/**
 * ⑥ 같은 사실을 두 번 적은 조각인지 (2026-11-09 추가).
 *
 * 조사 기록은 같은 사실을 문단마다 다시 적는 일이 있다 — 전남대는
 * `"센터는 어린이병원 6동 7층."`과 `"건강증진센터는 어린이병원 6동 7층이다."`가
 * 둘 다 남아 화면에 같은 말이 두 번 나왔다. 앞서 쓴 조각들의 4글자 조각 중
 * 60% 이상이 이미 나왔으면 되풀이로 본다. 전수에서 2조각만 걸리는 느슨한
 * 기준이라, 비슷한 주제의 다른 문장을 잘못 지우지 않는다.
 */
const DUPLICATE_OVERLAP = 0.6;

function charGrams(s, n = 4) {
  const t = s.replace(/[\s.,'"()·—–]/g, "");
  const out = new Set();
  for (let i = 0; i + n <= t.length; i += 1) out.add(t.slice(i, i + n));
  return out;
}

/** 병원 하나의 publicNote를 만든다. 문단 구조와 문장 순서를 유지한다. */
export function buildPublicNote(hospital, { lead = true, trail = false } = {}) {
  const paragraphs = (hospital.note || "")
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);

  const kept = [];
  const dropped = [];
  const trimmed = [];
  const outParagraphs = [];
  // ⑥ 되풀이 판정에 쓸, 지금까지 쓴 글의 4글자 조각
  const seenGrams = new Set();

  /** 이 조각이 앞서 쓴 글과 겹치면 true. 안 겹치면 조각을 등록하고 false */
  const isDuplicate = (text) => {
    const g = charGrams(text);
    if (!g.size) return false;
    let hit = 0;
    for (const x of g) if (seenGrams.has(x)) hit += 1;
    if (hit / g.size >= DUPLICATE_OVERLAP) return true;
    for (const x of g) seenGrams.add(x);
    return false;
  };

  for (const para of paragraphs) {
    if (NATIONAL_RE.test(para)) {
      dropped.push({ text: para, reason: "국가검진 상자에서 정형문으로 표시" });
      continue;
    }
    const sentences = splitSentences(para);
    const keepHere = [];
    let prevDropped = false;
    for (const s of sentences) {
      const reason = dropReason(s, hospital, prevDropped);
      if (!reason) {
        if (isDuplicate(s)) {
          dropped.push({ text: s, reason: "⑥ 앞에서 이미 적은 내용" });
          prevDropped = true;
          continue;
        }
        keepHere.push(s);
        kept.push(s);
        prevDropped = false;
        continue;
      }
      // 통째로 빼는 대신 **앞뒤 메모만 잘라내** 본다. 내부 메모·조사 과정
      // 표현(①③) 때문에 빠진 문장만 해당한다 — ②는 애초에 혼자 못 읽는
      // 문장이고 ④는 표와 겹치는 내용이라 잘라도 쓸 게 남지 않는다.
      const salvage = reason.startsWith("①③")
        ? trimSentence(s, hospital, prevDropped, { lead, trail })
        : null;
      if (salvage && !isDuplicate(salvage.text)) {
        keepHere.push(salvage.text);
        kept.push(salvage.text);
        trimmed.push({ before: s, after: salvage.text, ...salvage });
        prevDropped = false;
        continue;
      }
      dropped.push({ text: s, reason });
      prevDropped = true;
    }
    if (keepHere.length) outParagraphs.push(keepHere.join(" "));
  }

  return { publicNote: outParagraphs.join("\n\n"), kept, dropped, trimmed };
}

/**
 * publicNote를 이루는 **조각 하나하나**가 note 안에 글자 그대로 있는지.
 *
 * 쓴 조각(`kept`)을 그대로 대조한다. 저장된 publicNote를 다시 문장으로 쪼개
 * 대조하면 안 된다 — 뒤 메모를 잘라낸 조각은 마침표 없이 끝나서, 다시 쪼갤 때
 * 다음 문장과 한 덩어리로 붙어 "note에 없는 문장"으로 잘못 잡힌다.
 */
export function verifyVerbatim(note, kept) {
  return kept.filter((s) => !note.includes(s));
}

/* ───────────────────────── 실행부 ───────────────────────── */

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const all = args.includes("--all");
  // --force: 이미 있는 publicNote를 규칙이 바뀐 뒤 다시 만든다(기존 줄을 지우고 새로 넣는다)
  const force = args.includes("--force");
  // --trim-trail: 뒤 메모까지 잘라낸다. 남는 쪽이 연결 어미로 끝나므로 기본값은 꺼짐.
  const trail = args.includes("--trim-trail");
  const only = args.find((a) => a.startsWith("--id="))?.slice(5);

  const raw = fs.readFileSync(FILE, "utf8");
  const data = JSON.parse(raw);
  const targetIds = only ? [only] : all ? data.map((h) => h.id) : PILOT_IDS;

  let inserted = 0;
  let skipped = 0;
  let out = raw;

  if (force && !dry) {
    // 기존 publicNote 줄 제거 — 값에 줄바꿈이 없으므로 한 줄씩 지우면 된다
    const before = out.length;
    out = out.replace(/^ {4}"publicNote": .*\n/gm, "");
    console.log("기존 publicNote 줄 제거:", before - out.length, "바이트");
  }


  for (const id of targetIds) {
    const h = data.find((x) => x.id === id);
    if (!h) {
      console.log(`!!! 없는 id: ${id}`);
      continue;
    }
    if (h.publicNote !== undefined && !force) {
      skipped += 1;
      continue;
    }
    const { publicNote, kept, dropped, trimmed } = buildPublicNote(h, { trail });

    if (only || dry) {
      console.log(`\n######## ${h.name} (${h.tier}) — 문장 ${kept.length + dropped.length}개 중 ${kept.length}개 남김(잘라내 살린 것 ${trimmed.length}개), publicNote ${publicNote.length}자`);
      if (only) {
        // 잘라내 살린 조각도 kept에 들어 있으므로 여기서는 빼고 따로 보여 준다
        const trimmedTexts = new Set(trimmed.map((t) => t.after));
        kept.filter((s) => !trimmedTexts.has(s)).forEach((s) => console.log(`  [남김] ${s}`));
        trimmed.forEach((t) => console.log(`  [${t.how}] ${t.after}\n       (잘라낸 쪽: ${t.cut.trim()})`));
        dropped.forEach((d) => console.log(`  [뺌 · ${d.reason}] ${d.text.slice(0, 90)}`));
      }
    }
    if (dry) continue;

    const bad = verifyVerbatim(h.note || "", kept);
    if (bad.length) {
      console.error(`!!! ${id}: note에 없는 문장 ${bad.length}개 — 중단`);
      process.exit(1);
    }
    if (!publicNote) {
      skipped += 1;
      continue;
    }

    // "note" 줄 바로 앞에 publicNote 줄을 끼워 넣는다. 다른 바이트는 건드리지 않는다.
    const noteLine = `    "note": ${JSON.stringify(h.note)},`;
    const idx = out.indexOf(noteLine);
    if (idx === -1) {
      console.error(`!!! ${id}: note 줄을 찾지 못했다 — 중단`);
      process.exit(1);
    }
    const insertion = `    "publicNote": ${JSON.stringify(publicNote)},\n`;
    out = out.slice(0, idx) + insertion + out.slice(idx);
    inserted += 1;
  }

  if (dry) {
    console.log(`\n(dry) 대상 ${targetIds.length}곳, 이미 있는 곳 ${skipped}곳`);
    process.exit(0);
  }

  // 멱등성·무손실 검증
  const after = JSON.parse(out);
  if (after.length !== data.length) {
    console.error("!!! 건수가 달라졌다 — 저장하지 않음");
    process.exit(1);
  }
  for (let i = 0; i < data.length; i += 1) {
    const a = { ...data[i] };
    const b = { ...after[i] };
    delete b.publicNote;
    delete a.publicNote;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      console.error(`!!! ${data[i].id}: publicNote 말고 다른 값이 바뀌었다 — 저장하지 않음`);
      process.exit(1);
    }
    if ((after[i].note || "") !== (data[i].note || "")) {
      console.error(`!!! ${data[i].id}: note가 바뀌었다 — 저장하지 않음`);
      process.exit(1);
    }
  }

  fs.writeFileSync(FILE, out);
  console.log(`publicNote 주입 ${inserted}곳, 건너뜀 ${skipped}곳, 전체 ${after.length}건`);
}
