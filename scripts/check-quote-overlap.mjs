/**
 * 검진 안내 글이 질병관리청 국가건강정보포털 원문과 얼마나 겹치는지 재는 스크립트.
 *
 * 질병관리청 자료는 공공누리 제4유형(출처표시·상업적 이용금지·변경금지)이라
 * 문장을 그대로 옮기거나 고쳐 쓰는 것을 피해야 한다(README 76번, docs/adsense-plan.md 3단계).
 * 이 스크립트는 "20자 이상 연속으로 같은 글자열"을 겹침으로 보고 비율과 조각을 센다.
 *
 * 쓰는 법
 *   1) 개발 서버를 끈 상태에서 `npm run build` (빌드 HTML을 읽는다)
 *   2) `node scripts/check-quote-overlap.mjs`
 *
 * 읽는 것 : .next/server/app/checkup/<slug>.html 의 <article> 안쪽
 * 받는 것 : health.kdca.go.kr 의 해당 콘텐츠 페이지(한 번 받으면 임시폴더에 캐시)
 * 비교 방법: 공백과 따옴표를 모두 지운 뒤 최장일치로 훑는다.
 *            글을 고치면 같은 명령으로 다시 재서 전/후를 비교한다.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MIN = 20;
const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(os.tmpdir(), "kdca-quote-check");
const KDCA = (sn) =>
  `https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=${sn}`;

/** 글 slug → 비교할 질병관리청 콘텐츠 번호(cntnts_sn) */
const TARGETS = {
  "oral-checkup": ["6671", "6884"],
  "liver-cancer-screening": ["6560", "6672", "1061"],
  "colonoscopy-bowel-prep": ["5254"],
  "mental-health-checkup": ["6788"],
  "colorectal-cancer-screening": ["3435"],
};

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
}

function decode(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

/** 비교용 정규화 — 공백·따옴표를 지워 줄바꿈이나 인용부호 차이에 속지 않게 한다 */
function norm(s) {
  return decode(s)
    .replace(/[​﻿]/g, "")
    .replace(/[“”"'‘’]/g, "")
    .replace(/\s+/g, "");
}

function articleText(slug) {
  const file = path.join(ROOT, ".next/server/app/checkup", `${slug}.html`);
  if (!fs.existsSync(file)) {
    throw new Error(`빌드 HTML이 없다: ${file}\n개발 서버를 끄고 npm run build 를 먼저 돌려라.`);
  }
  const html = fs.readFileSync(file, "utf8");
  const from = html.indexOf("<article");
  const to = html.indexOf("</article>", from);
  if (from < 0 || to < 0) throw new Error(`<article>을 못 찾았다: ${slug}`);
  return stripTags(html.slice(from, to));
}

async function kdcaText(sn) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `${sn}.html`);
  if (!fs.existsSync(file)) {
    const res = await fetch(KDCA(sn), { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`질병관리청 ${sn} 받기 실패: ${res.status}`);
    fs.writeFileSync(file, await res.text());
  }
  const html = fs.readFileSync(file, "utf8");
  const parts =
    html.match(
      /<div id="contentsDiv\d+"[\s\S]*?(?=<div id="contentsDiv\d+"|<div class="reference|<div class="btn|$)/g,
    ) || [];
  return stripTags(parts.length ? parts.join(" ") : html);
}

/** a 를 훑으며 b 안에 그대로 들어 있는 MIN자 이상 구간을 모은다 */
function overlap(aRaw, bRaw) {
  const a = norm(aRaw);
  const b = norm(bRaw);
  const frags = [];
  let matched = 0;
  let i = 0;
  while (i < a.length) {
    let len = 0;
    if (i + MIN <= a.length && b.includes(a.slice(i, i + MIN))) {
      len = MIN;
      while (i + len + 1 <= a.length && b.includes(a.slice(i, i + len + 1))) len++;
    }
    if (len >= MIN) {
      frags.push(a.slice(i, i + len));
      matched += len;
      i += len;
    } else {
      i++;
    }
  }
  return { total: a.length, matched, ratio: a.length ? matched / a.length : 0, frags };
}

let worst = 0;
for (const [slug, sns] of Object.entries(TARGETS)) {
  const article = articleText(slug);
  const source = (await Promise.all(sns.map(kdcaText))).join("\n");
  const r = overlap(article, source);
  worst = Math.max(worst, r.frags.length);
  console.log(`\n=== ${slug} (질병관리청 ${sns.join(", ")}) ===`);
  console.log(
    `본문 ${r.total}자(공백·따옴표 제외) · 겹침 ${r.matched}자 = ${(r.ratio * 100).toFixed(1)}% · 조각 ${r.frags.length}개`,
  );
  r.frags
    .sort((x, y) => y.length - x.length)
    .forEach((f, k) => console.log(`  ${String(k + 1).padStart(2)}. (${f.length}자) ${f}`));
}
console.log(
  `\n캐시: ${CACHE} (원문을 다시 받으려면 이 폴더를 지운다)\n남은 조각 ${worst}개 — 조각은 따옴표로 밝힌 짧은 직접 인용만 남기는 것이 목표다.`,
);
