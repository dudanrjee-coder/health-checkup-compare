import type { Metadata } from "next";
import ArticleLayout, { ArticleLink, ArticleTable } from "@/components/ArticleLayout";
import { INFO_LIST, INFO_P } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 6대 암검진 한눈에 보기. 근거(2026-10-02 확인):
 *  - 국민건강보험공단 건강검진 실시안내 > 암검진(wbhaca04600m01.do): 대상·주기·검사 방법·비용부담·검진기간
 *  - 질병관리청 국가건강정보포털 「건강검진(암 검진)」(cntnts_sn=5296): 위장조영 후 위내시경,
 *    수면내시경·헬리코박터 검사 추가 비용 본인 부담, 분변잠혈 없이 대장내시경 시 전액 본인 부담
 *  - 「2026년 일반(암)건강검진 안내문」: 2단계 검사 다음 해 1월 31일까지
 */

const SLUG = "six-cancer-screenings";
const TITLE = "6대 암검진 한눈에 보기 | 전국 건강검진 병원";
const DESCRIPTION =
  "국가암검진 6가지(위·대장·간·유방·자궁경부·폐암)의 대상 나이, 검진 주기, 검사 방법, 본인 부담 비용을 표 하나로 정리했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function SixCancerScreeningsPage() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="6대 암검진 한눈에 보기"
      subtitle="암검진 · 읽는 데 3분"
      crumb="6대 암검진"
      summary="국가암검진은 위·대장·간·유방·자궁경부·폐암 6가지입니다. 암마다 대상 나이와 주기, 검사 방법이 다르고, 본인 부담은 검진비의 10%이거나 없습니다."
      sections={[
        {
          id: "who",
          heading: "누가 받나요",
          body: (
            <p className={INFO_P}>
              암마다 정해진 나이와 조건에 맞는 사람이 받습니다. 대상인 해에는 공단이
              검진표를 보내 주고, 공단 누리집에서 대상 여부를 조회할 수 있습니다. 대상 기준과
              확인 방법은{" "}
              <ArticleLink slug="national-checkup-eligibility">올해 내가 국가건강검진 대상일까?</ArticleLink>
              에 정리했습니다.
            </p>
          ),
        },
        {
          id: "table",
          heading: "암별 대상·주기·검사 방법·본인 부담",
          body: (
            <>
              <ArticleTable
                dense
                head={["암", "대상 · 주기", "검사 방법", "본인 부담"]}
                nowrapCols={[0, 3]}
                rows={[
                  ["위암", "40세 이상 · 2년마다", "위내시경(어려우면 위장조영검사)", "10%"],
                  ["대장암", "50세 이상 · 매년", "분변잠혈검사, 양성이면 대장내시경", "없음"],
                  ["간암", "40세 이상 고위험군 · 6개월마다", "간 초음파 + 혈액검사", "10%"],
                  ["유방암", "40세 이상 여성 · 2년마다", "유방촬영", "10%"],
                  ["자궁경부암", "20세 이상 여성 · 2년마다", "자궁경부세포검사", "없음"],
                  ["폐암", "54~74세 고위험군 · 2년마다", "저선량 흉부 CT", "10%"],
                ]}
              />
              <p className="m-0 text-sm text-slate-600">
                본인 부담이 10%인 암도 건강보험료 하위 50%(전년도 11월 보험료 기준)에
                해당하는 분과 의료급여수급권자는 부담이 없습니다.
              </p>
            </>
          ),
        },
        {
          id: "method",
          heading: "검사 방법 조금 더",
          body: (
            <ul className={INFO_LIST}>
              <li>
                위암: 위내시경이 기본입니다. 내시경이 어려우면 위장조영검사를 고를 수 있고,
                여기서 위암이 의심되면 위내시경을 받습니다.
              </li>
              <li>
                대장암: 먼저 분변잠혈검사(대변검사)를 합니다. ‘잠혈반응 있음’이 나온 경우에만
                대장내시경을 받습니다.
              </li>
              <li>
                간암: 상반기와 하반기에 한 번씩 간 초음파와 혈액검사(혈청알파태아단백검사)를
                받습니다. 고위험군은 간경변증, B형·C형 간염 등이 있는 사람입니다.
              </li>
              <li>
                폐암: 고위험군은 30갑년 이상 흡연력이 있는 사람 등입니다. 갑년은 하루
                흡연량(갑)에 흡연 기간(년)을 곱한 값입니다.
              </li>
            </ul>
          ),
        },
        {
          id: "cost",
          heading: "비용과 기한에서 알아둘 점",
          body: (
            <ul className={INFO_LIST}>
              <li>
                수면내시경이나 헬리코박터 검사처럼 정해진 항목 밖의 검사를 더하면, 늘어난
                비용은 본인이 냅니다.
              </li>
              <li>
                분변잠혈검사 없이 대장내시경을 바로 받으면 검사비 전액을 본인이 냅니다.
              </li>
              <li>
                검진 기간은 매년 1월 1일부터 12월 31일까지입니다. 위암·대장암 1단계 결과에
                이상이 있으면 2단계 검사는 다음 해 1월 31일까지 받을 수 있습니다.
              </li>
              <li>가족력이 있거나 증상이 있다면 검사 방법과 시기를 의사와 상담하세요.</li>
            </ul>
          ),
        },
      ]}
      sources="국민건강보험공단 건강검진 실시안내(암검진), 2026년 일반(암)건강검진 안내문, 질병관리청 국가건강정보포털 「건강검진(암 검진)」"
      checkedAt="2026년 10월 2일"
    />
  );
}
