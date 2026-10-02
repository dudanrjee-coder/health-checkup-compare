import type { Metadata } from "next";
import ArticleLayout, { ArticleLink, ArticleTable } from "@/components/ArticleLayout";
import { INFO_LIST, INFO_P } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 검진 결과 읽는 법과 재검 안내. 근거(2026-10-02 확인):
 *  - 「건강검진 실시기준」(보건복지부고시 제2026-6호, 2026.1.7. 시행, 공단 건강Law SEQ=80):
 *    제10조 결과통보 15일 이내 우편·이메일·모바일 등, 제11조 질환 의심 시 해당 분야 진료(확진검사 포함) 안내
 *  - 질병관리청 국가건강정보포털 「알아두면 도움이 되는 ‘건강검진’」(thtimt_cntnts_sn=7, 2021-11-30):
 *    일반건강검진 결과통보서 판정 칸(정상A, 정상B(경계), 일반 질환의심, 고혈압·당뇨병 질환의심, 유질환자),
 *    항목별 결과·참고치, 심뇌혈관질환 위험평가와 "의사와 상담" 안내
 *  - 국민건강보험공단 건강검진 실시안내 > 일반건강검진(wbhaca04500m01.do): 확진검사 대상·항목·기관·기한·비용
 *  - 「2026년 일반(암)건강검진 안내문」: 결과 조회 경로(최근 10년), 확진검사 최초 1회 본인부담 면제, 2단계 검사 기한
 * 판정별 뜻을 풀어 쓴 공식 자료는 찾지 못해 명칭만 적는다. 수치 정상 범위는 쓰지 않는다.
 */

const SLUG = "reading-checkup-results";
const TITLE = "검진 결과 읽는 법과 재검 안내 | 전국 건강검진 병원";
const DESCRIPTION =
  "국가 일반건강검진 결과통보서를 받는 시기와 방법, 판정 구분, 질환의심일 때 받는 확진검사의 대상·기한·비용을 공식 자료 기준으로 정리했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function ReadingCheckupResultsPage() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="검진 결과 읽는 법과 재검 안내"
      subtitle="검진 전후 · 읽는 데 3분"
      crumb="결과 읽는 법"
      summary="결과는 검진 후 15일 이내에 받습니다. 질환이 의심되면 확진검사를 받을 수 있고, 결과 해석은 의사와 상담하는 것이 가장 정확합니다."
      sections={[
        {
          id: "when",
          heading: "결과는 언제, 어떻게 받나요",
          body: (
            <ul className={INFO_LIST}>
              <li>검진기관은 검진을 마친 뒤 15일 이내에 결과통보서를 보냅니다.</li>
              <li>우편, 이메일, 모바일 등으로 받습니다.</li>
              <li>
                공단 누리집이나 앱 ‘건강보험25시’의 건강모아 → 나의 건강 → 건강검진 결과조회에서
                최근 10년 결과를 볼 수 있습니다.
              </li>
            </ul>
          ),
        },
        {
          id: "grade",
          heading: "결과통보서의 판정 구분",
          body: (
            <>
              <p className={INFO_P}>
                일반건강검진 결과통보서에는 종합소견과 함께 아래 판정 중 하나가 표시됩니다.
                명칭은 공식 결과통보서에 적힌 그대로입니다.
              </p>
              <ArticleTable
                head={["판정 구분"]}
                rows={[["정상A"], ["정상B(경계)"], ["일반 질환의심"], ["고혈압·당뇨병 질환의심"], ["유질환자"]]}
              />
              <p className={INFO_P}>
                검사 항목마다 내 결과와 참고치가 함께 적혀 있습니다. 숫자 하나만 보고 스스로
                판단하지 말고, 종합소견과 함께 의사와 상담하세요. 결과통보서에 심뇌혈관질환
                위험평가가 있다면, 그 목표 상태도 개인의 건강 수준에 따라 달라질 수 있으니 의사와
                상담하라고 안내돼 있습니다.
              </p>
            </>
          ),
        },
        {
          id: "confirm",
          heading: "질환이 의심되면: 확진검사",
          body: (
            <>
              <p className={INFO_P}>
                질환이 의심되면 검진기관이 해당 분야 진료를 받도록 안내합니다. 아래 질환이
                의심되면 확진검사를 받을 수 있습니다.
              </p>
              <ul className={INFO_LIST}>
                <li>대상: 고혈압, 당뇨병, 이상지질혈증, 폐결핵, 우울증·조기정신증, C형간염</li>
                <li>기한: 검진 받은 다음 해 3월 31일까지</li>
                <li>
                  비용: 처음 1회는 본인 부담이 없습니다. C형간염은 먼저 진료비를 내고 따로 정산
                  신청을 합니다. 그 밖의 추가 검사를 하면 비용이 생깁니다.
                </li>
                <li>준비물: 결과통보서와 신분증을 가지고 가야 합니다.</li>
                <li>
                  받는 곳: 고혈압·당뇨병·이상지질혈증은 의원·병원, 폐결핵·C형간염은 의원부터
                  상급종합병원까지 가능합니다. 우울증·조기정신증은 정신건강의학과 의원·병원(정신병원
                  제외)에서 받습니다.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "cancer",
          heading: "암검진에서 더 검사가 필요하다면",
          body: (
            <p className={INFO_P}>
              위암·대장암 1단계 결과에 이상이 있으면 2단계 검사(위내시경, 대장내시경)를 다음 해
              1월 31일까지 받을 수 있습니다. 검사별 흐름은{" "}
              <ArticleLink slug="six-cancer-screenings">6대 암검진 한눈에 보기</ArticleLink>에
              정리했습니다.
            </p>
          ),
        },
        {
          id: "symptom",
          heading: "증상이 있다면",
          body: (
            <p className={INFO_P}>
              판정 결과와 관계없이 몸에 증상이 있다면 검진을 기다리지 말고 병원 진료를
              받으세요. 결과 해석과 이후 관리는 의사와 상담하세요.
            </p>
          ),
        },
      ]}
      sources="보건복지부 「건강검진 실시기준」(고시 제2026-6호), 질병관리청 국가건강정보포털 「알아두면 도움이 되는 ‘건강검진’」, 국민건강보험공단 건강검진 실시안내(일반건강검진), 2026년 일반(암)건강검진 안내문"
      checkedAt="2026년 10월 2일"
    />
  );
}
