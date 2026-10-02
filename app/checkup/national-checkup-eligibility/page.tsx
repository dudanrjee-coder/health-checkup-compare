import type { Metadata } from "next";
import ArticleLayout, { ArticleSteps, ArticleTable } from "@/components/ArticleLayout";
import { INFO_P } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 검진 안내 첫 글. 모든 사실은 국민건강보험공단 공식 자료로 확인했다(2026-10-02):
 *  - 건강모아 > 건강검진 실시안내 > 일반건강검진(wbhaca04500m01.do)·암검진(wbhaca04600m01.do)
 *  - 같은 페이지의 「2026년 일반(암)건강검진 안내문」 PDF
 * 제도가 바뀌면(특히 연도·대상 연령·본인부담) 위 자료와 다시 대조한다.
 */

const SLUG = "national-checkup-eligibility";
const TITLE = "올해 내가 국가건강검진 대상일까? | 전국 건강검진 병원";
const DESCRIPTION =
  "2026년 국가건강검진 대상 기준(짝수 연도 출생자), 6대 암검진 대상 나이와 주기, 국민건강보험공단에서 대상 여부를 확인하는 방법과 본인 부담 비용을 정리했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function NationalCheckupEligibilityPage() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="올해 내가 국가건강검진 대상일까?"
      subtitle="국가건강검진 · 읽는 데 3분"
      crumb="국가건강검진 대상 확인"
      summary="2026년은 짝수 해라서, 짝수 연도에 태어난 분이 일반건강검진 대상입니다. 정확한 대상 여부는 국민건강보험공단에서 바로 확인할 수 있습니다."
      sections={[
        {
          id: "general",
          heading: "일반건강검진은 2년에 한 번",
          body: (
            <p className={INFO_P}>
              지역가입자 세대주와 직장가입자, 20세 이상 세대원과 피부양자는 2년마다
              일반건강검진을 받습니다. 태어난 해가 짝수면 짝수 해에, 홀수면 홀수 해에 받는
              식입니다. 사무직이 아닌 직장가입자는 매년 받습니다.
            </p>
          ),
        },
        {
          id: "cancer",
          heading: "암검진은 암마다 나이와 주기가 다릅니다",
          body: (
            <ArticleTable
              head={["암 종류", "대상", "주기"]}
              nowrapCols={[0, 2]}
              rows={[
                ["위암", "40세 이상", "2년"],
                ["대장암", "50세 이상", "1년"],
                ["간암", "40세 이상 간암 고위험군", "6개월"],
                ["유방암", "40세 이상 여성", "2년"],
                ["자궁경부암", "20세 이상 여성", "2년"],
                ["폐암", "54~74세 폐암 고위험군", "2년"],
              ]}
            />
          ),
        },
        {
          id: "check",
          heading: "내가 대상인지 확인하는 방법",
          body: (
            <ArticleSteps
              steps={[
                "국민건강보험공단 누리집(www.nhis.or.kr)이나 모바일 앱 ‘건강보험25시’에 로그인합니다.",
                "건강모아 → 나의 건강 → 검진대상 조회를 누릅니다.",
                "본인 인증을 하면 올해 검진 대상 여부를 확인하고 검진대상 확인서를 출력할 수 있습니다. 전화(공단 고객센터 1577-1000)로도 문의할 수 있습니다.",
              ]}
            />
          ),
        },
        {
          id: "cost",
          heading: "비용은 얼마나 들까",
          body: (
            <p className={INFO_P}>
              일반건강검진은 본인 부담이 없습니다. 암검진은 검진비의 10%를 내며, 대장암과
              자궁경부암 검진은 본인 부담이 없습니다. 건강보험료 하위 50%(전년도 11월 보험료
              기준)에 해당하는 분과 의료급여수급권자는 암검진도 본인 부담이 없습니다.
            </p>
          ),
        },
      ]}
      sources="국민건강보험공단 건강검진 실시안내(일반건강검진·암검진), 2026년 일반(암)건강검진 안내문"
      checkedAt="2026년 10월 2일"
    />
  );
}
