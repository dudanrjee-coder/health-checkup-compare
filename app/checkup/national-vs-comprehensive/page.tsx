import type { Metadata } from "next";
import ArticleLayout, { ArticleLink, ArticleSteps, ArticleTable } from "@/components/ArticleLayout";
import { INFO_LIST, INFO_P } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 국가검진과 종합검진은 무엇이 다를까. 근거(2026-10-02 확인):
 *  - 국민건강보험공단 건강검진 실시안내 > 일반건강검진(wbhaca04500m01.do): 공통·성연령별 검사 항목
 *  - 같은 곳 > 암검진(wbhaca04600m01.do): 비용부담, 분변잠혈 없이 대장내시경 시 전액 본인 부담
 *  - 「2026년 일반(암)건강검진 안내문」: 일반검진 공단 전액 부담, 정해진 항목 외 검사 본인부담 추가,
 *    검진 횟수 초과 시 검진비용 환수, 주소지와 관계없이 지정 검진기관 전국 어디서나
 *  - 질병관리청 국가건강정보포털 「건강검진(암 검진)」: 수면내시경·헬리코박터 추가 비용 본인 부담
 * "종합검진"은 공식 자료에 정의가 없어, 이 글에서는 "국가검진 항목 밖의 검사를 본인 비용으로
 * 받는 검진"으로만 쓰고 구성·가격 일반론은 쓰지 않는다. 특정 병원·상품은 권하지 않는다.
 */

const SLUG = "national-vs-comprehensive";
const TITLE = "국가검진과 종합검진은 무엇이 다를까 | 전국 건강검진 병원";
const DESCRIPTION =
  "국가건강검진과 종합검진의 비용 부담, 검사 범위 차이와 국가검진을 받으면서 다른 검사를 같은 날 함께 받을 때 알아둘 비용 규칙을 정리했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function NationalVsComprehensivePage() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="국가검진과 종합검진은 무엇이 다를까"
      subtitle="검진 전후 · 읽는 데 3분"
      crumb="국가검진과 종합검진"
      summary="국가검진은 공단이 정한 항목을 공단 부담으로 받는 검진입니다. 그 밖의 검사를 더하면, 더한 검사 비용은 본인이 냅니다."
      sections={[
        {
          id: "define",
          heading: "이 글에서 말하는 두 검진",
          body: (
            <p className={INFO_P}>
              국가검진은 국민건강보험공단이 대상과 항목을 정한 일반건강검진과 암검진입니다.
              이 글에서 종합검진은 국가검진 항목 밖의 검사를 본인 비용으로 받는 검진을
              말합니다. 종합검진의 구성과 가격은 병원마다 다릅니다.
            </p>
          ),
        },
        {
          id: "compare",
          heading: "비용과 받는 곳",
          body: (
            <ArticleTable
              head={["구분", "국가검진", "종합검진"]}
              nowrapCols={[0]}
              rows={[
                ["비용", "일반검진은 본인 부담 없음, 암검진은 10%(면제 대상 있음)", "본인 부담"],
                ["검사 항목", "공단이 정한 항목", "병원·검사마다 다름"],
                ["받는 곳", "국가검진 지정 검진기관(주소지와 관계없이 전국)", "검사를 하는 병원"],
              ]}
            />
          ),
        },
        {
          id: "scope",
          heading: "국가검진의 검사 범위",
          body: (
            <>
              <p className={INFO_P}>
                일반건강검진은 모두 같은 공통 항목을 받습니다. 진찰과 상담, 키·몸무게·허리둘레,
                시력·청력, 혈압, 흉부 방사선, 혈액검사(빈혈·공복혈당·간 기능·신장 기능),
                소변검사, 구강검진입니다. 결과는 검진기관이 검진 후 15일 이내에 우편이나
                이메일로 알려 줍니다.
              </p>
              <p className={INFO_P}>나이와 성별에 따라 더해지는 항목도 있습니다.</p>
              <ul className={INFO_LIST}>
                <li>이상지질혈증: 남성 24세 이상, 여성 40세 이상, 4년마다</li>
                <li>B형간염 40세, C형간염 56세, 폐기능 56·66세</li>
                <li>골밀도: 54·60·66세 여성</li>
                <li>인지기능장애: 66세 이상, 2년마다</li>
                <li>생활습관평가: 40·50·60·70세, 노인신체기능검사: 66·70·80세</li>
                <li>우울증 검사: 20~34세는 2년마다, 그 뒤로는 연령대마다 한 번</li>
              </ul>
              <p className={INFO_P}>
                암검진 6가지는{" "}
                <ArticleLink slug="six-cancer-screenings">6대 암검진 한눈에 보기</ArticleLink>에
                정리했습니다.
              </p>
            </>
          ),
        },
        {
          id: "together",
          heading: "같은 날 함께 받으려면",
          body: (
            <>
              <p className={INFO_P}>
                국가검진을 받으면서 항목 밖의 검사를 더할 수 있습니다. 이때 늘어난 비용은
                본인이 냅니다. 예를 들어 위내시경을 수면으로 받거나 헬리코박터 검사를 더하면 그
                비용은 본인 부담입니다.
              </p>
              <ul className={INFO_LIST}>
                <li>분변잠혈검사 없이 대장내시경을 바로 받으면 검사비 전액을 본인이 냅니다.</li>
                <li>국가검진 항목을 정해진 횟수보다 더 받으면 공단이 그 검진비용을 환수합니다.</li>
              </ul>
              <p className={INFO_P}>예약할 때는 이렇게 확인하세요.</p>
              <ArticleSteps
                steps={[
                  <>
                    올해 국가검진 대상인지 확인합니다(
                    <ArticleLink slug="national-checkup-eligibility">대상 확인 방법</ArticleLink>).
                  </>,
                  "병원이 국가검진 지정 검진기관인지 확인합니다.",
                  "예약할 때 국가검진 항목과 더하려는 검사, 추가 비용을 병원에 확인합니다.",
                ]}
              />
              <p className={INFO_P}>
                어떤 검사를 더할지는 나이, 가족력, 건강 상태에 따라 다릅니다. 의사와
                상담하세요.
              </p>
            </>
          ),
        },
      ]}
      sources="국민건강보험공단 건강검진 실시안내(일반건강검진·암검진), 2026년 일반(암)건강검진 안내문, 질병관리청 국가건강정보포털 「건강검진(암 검진)」"
      checkedAt="2026년 10월 2일"
    />
  );
}
