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
  // 조사자가 내린 결론·처리를 적은 말
  /기존 판정|판정 유지|따랐다|따른다|뺐다|공식 확인|\d+번 기준|그대로 썼|로 봤다|보기로 했/,
  // 조사자가 무엇을 했는지 적은 말(판독·내려받기·폼 미제출 등)
  /판독했|내려받|제출하지 않|분류가 없|분류만 있|비급여 목록|보이지 않는다|잡히지 않/,
  // 내부 경로·주소가 드러나는 문장(방문자용 문장에 파일 경로·URL은 넣지 않는다)
  /https?:\/\/|\/bbs\/|\b[A-Za-z0-9_\-]+\.(?:php|asp|html|do)\b|[a-z0-9-]+\.(?:com|kr|net|org)\/[^\s)]/,
  // 자료·규칙·필드를 가리키는 말
  /CSV|명단|필드|규칙|항목 번호|README|심사평가원|심평원|HIRA|요양기관기호|사업자(?:등록)?번호|푸터|퓨니코드|리다이렉트/,
  // 필드 기입 설명
  /priceRange|bookingUrl|bookingType|resultNotice|accessInfo|mealProvided|examDuration|waitingPeriod|verifiedAt|note에|미게시|넣지 않|쓰지 않|비웠다|적지 않|생략했다|으로 남긴다|채웠다|그대로 옮겼|옮기지 않|근거로 적었|정정했다/,
  // 좌표·주소 판정
  /OSM|Nominatim|좌표|lat\/lng|WGS84|지도 마커|자릿수|법정동|행정동/,
  // 판단·선례·동명 대조
  /선례|근거로 쓰지|판단했다|판단한다|판단은|주석|display: ?none|고아 페이지|별개 기관|동명|조사분|차 배치|배치\(|0번 원칙|재조사/,
];

/** ② 혼자 읽으면 뜻이 통하지 않는 문장 — 괄호·기호·번호로 시작하거나 앞 문장을 가리킨다 */
const FRAGMENT_START_RE = /^[(（※·\-–—*[\d]/;
const ANAPHORA_START_RE =
  /^(그|이|저|위|해당|둘|셋|나머지|앞|뒤|거기|여기|반면|다만|또|또한|그래서|그러나|그리고|이때|이외|이 외|이는|그중|그 중|같은|양쪽|후자|전자)/;

/** 문장 끝으로 볼 수 있는 꼴. 이게 아니면 문장이 잘렸다고 보고 뺀다 */
const SENTENCE_END_RE = /(다|요|까|음|함|됨)[.!?]$|[.!?]$/;

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

/** ④ 화면 표(검진비용·결과통보·소요시간·식사·주차·교통)와 같은 내용을 반복하는 문장인지 */
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
    // 표 값의 15자 창이 문장 안에 그대로 있으면 같은 내용을 반복하는 것으로 본다
    for (let i = 0; i + 15 <= value.length; i += 1) {
      if (target.includes(value.slice(i, i + 15))) return true;
    }
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
  if (repeatsTable(sentence, hospital)) return "④ 화면 표와 같은 내용";
  return null;
}

/** 병원 하나의 publicNote를 만든다. 문단 구조와 문장 순서를 유지한다. */
export function buildPublicNote(hospital) {
  const paragraphs = (hospital.note || "")
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);

  const kept = [];
  const dropped = [];
  const outParagraphs = [];

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
      if (reason) {
        dropped.push({ text: s, reason });
        prevDropped = true;
        continue;
      }
      keepHere.push(s);
      kept.push(s);
      prevDropped = false;
    }
    if (keepHere.length) outParagraphs.push(keepHere.join(" "));
  }

  return { publicNote: outParagraphs.join("\n\n"), kept, dropped };
}

/** publicNote의 모든 문장이 note 안에 글자 그대로 있는지 */
export function verifyVerbatim(note, publicNote) {
  const bad = [];
  for (const para of publicNote.split(/\n\s*\n/)) {
    for (const s of splitSentences(para)) {
      if (!note.includes(s)) bad.push(s);
    }
  }
  return bad;
}

/* ───────────────────────── 실행부 ───────────────────────── */

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const all = args.includes("--all");
  const only = args.find((a) => a.startsWith("--id="))?.slice(5);

  const raw = fs.readFileSync(FILE, "utf8");
  const data = JSON.parse(raw);
  const targetIds = only ? [only] : all ? data.map((h) => h.id) : PILOT_IDS;

  let inserted = 0;
  let skipped = 0;
  let out = raw;

  for (const id of targetIds) {
    const h = data.find((x) => x.id === id);
    if (!h) {
      console.log(`!!! 없는 id: ${id}`);
      continue;
    }
    if (h.publicNote !== undefined) {
      skipped += 1;
      continue;
    }
    const { publicNote, kept, dropped } = buildPublicNote(h);

    if (only || dry) {
      console.log(`\n######## ${h.name} (${h.tier}) — 문장 ${kept.length + dropped.length}개 중 ${kept.length}개 남김, publicNote ${publicNote.length}자`);
      if (only) {
        kept.forEach((s) => console.log(`  [남김] ${s}`));
        dropped.forEach((d) => console.log(`  [뺌 · ${d.reason}] ${d.text.slice(0, 90)}`));
      }
    }
    if (dry) continue;

    const bad = verifyVerbatim(h.note || "", publicNote);
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
