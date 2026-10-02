import type { Metadata } from "next";
import ArticleLayout, { ArticleTable } from "@/components/ArticleLayout";
import { INFO_LIST, INFO_P } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 위내시경과 위장조영촬영, 무엇을 고를까. 근거(2026-10-02 확인):
 *  - 국민건강보험공단 건강검진 실시안내 > 암검진(wbhaca04600m01.do): 위내시경 기본, 어려우면 위장조영 선택, 비용 10%
 *  - 「2026년 일반(암)건강검진 안내문」: 위장조영 '위암의심' 시 위내시경 다음 해 1월 31일까지, 수면내시경 후 운전 위험·보호자 동반
 *  - 질병관리청 국가건강정보포털 「위내시경」(cntnts_sn=5258): 직접 관찰·조직검사, 금식, 목 국소마취, 건강 상태에 따른 제한,
 *    평소 약은 의사와 상의, 수면(의식하 진정) 내시경과 보호자 동반
 *  - 질병관리청 「상부위장관 촬영」(cntnts_sn=5471): 바륨·발포제·X선, 8시간 금식, 임신 시 피함, 변비, 조직검사 필요 시 내시경 추가
 *  - 질병관리청 「건강검진(암 검진)」(cntnts_sn=5296): 위장조영 후 위암 의심 시 위내시경, 수면내시경 추가 비용 본인 부담
 *  - 국가암정보센터 Q&A 「위장관 조영술은 내시경검사와 어떻게 다른가요?」: 변이 희게 나옴, 불편감·민감도 차이
 * 어느 검사가 낫다고 권하지 않는다 — 결론은 의사와 상담.
 */

const SLUG = "endoscopy-vs-upper-gi";
const TITLE = "위내시경과 위장조영촬영, 무엇을 고를까 | 전국 건강검진 병원";
const DESCRIPTION =
  "국가 위암검진의 위내시경과 위장조영검사를 검사 방식, 준비, 조직검사 가능 여부, 비용, 검사 후 흐름으로 나란히 비교했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function EndoscopyVsUpperGiPage() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="위내시경과 위장조영촬영, 무엇을 고를까"
      subtitle="암검진 · 읽는 데 3분"
      crumb="위내시경과 위장조영"
      summary="국가 위암검진은 위내시경이 기본이고, 내시경이 어려우면 위장조영검사를 고를 수 있습니다. 어느 쪽이 맞는지는 건강 상태와 병력에 따라 다르니 의사와 상담하세요."
      sections={[
        {
          id: "compare",
          heading: "두 검사는 이렇게 다릅니다",
          body: (
            <ArticleTable
              head={["구분", "위내시경", "위장조영검사"]}
              nowrapCols={[0]}
              rows={[
                ["방식", "입으로 내시경을 넣어 식도·위·십이지장 안을 직접 봄", "바륨 조영제와 발포제를 마신 뒤 X선으로 촬영"],
                ["조직검사", "검사 중 필요하면 바로 가능", "할 수 없음. 필요하면 내시경을 추가로 받음"],
                ["준비", "전날 저녁을 일찍 먹고 검사가 끝날 때까지 금식", "전날 저녁은 유동식, 검사 8시간 전부터 물도 금식"],
                ["본인 부담", "검진비의 10%(면제 대상 있음)", "검진비의 10%(면제 대상 있음)"],
              ]}
            />
          ),
        },
        {
          id: "flow",
          heading: "국가검진에서의 흐름",
          body: (
            <>
              <p className={INFO_P}>
                40세 이상은 2년마다 위암검진을 받습니다. 기본은 위내시경입니다. 내시경이
                어려운 경우 위장조영검사를 선택할 수 있습니다.
              </p>
              <ul className={INFO_LIST}>
                <li>위내시경 중 필요하면 조직검사로 확인합니다.</li>
                <li>
                  위장조영검사에서 위암이 의심되면 위내시경을 받습니다. 이 위내시경은 다음 해
                  1월 31일까지 받을 수 있습니다.
                </li>
                <li>
                  본인 부담 10%는 건강보험료 하위 50%(전년도 11월 보험료 기준)와
                  의료급여수급권자에게는 없습니다.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "notes",
          heading: "검사별로 알아둘 점",
          body: (
            <ul className={INFO_LIST}>
              <li>
                위내시경: 검사 전 목 안을 국소마취합니다. 고혈압, 심장질환 등 일부 건강
                상태에서는 검사가 제한될 수 있어 의사가 시행 여부를 정합니다.
              </li>
              <li>
                위장조영검사: 방사선을 쓰므로 임신 중이거나 임신 가능성이 있으면 피하는 것이
                좋습니다. 검사 뒤 며칠은 변이 희게 나올 수 있고, 변비가 생길 수 있어 물을
                많이 마십니다.
              </li>
              <li>
                공식 자료는 위장조영검사가 위내시경보다 불편감이 덜한 대신, 작은 병변을 찾는
                데는 덜 민감하다고 설명합니다.
              </li>
              <li>평소 먹는 약이 있다면 검사 전에 계속 먹을지 의사와 상의하세요.</li>
            </ul>
          ),
        },
        {
          id: "sedation",
          heading: "수면내시경을 원한다면",
          body: (
            <p className={INFO_P}>
              진정제를 써서 받는 수면내시경은 국가검진 항목 밖이라 늘어난 비용은 본인이
              냅니다. 검사 후에는 직접 운전하면 위험하므로 보호자와 함께 가거나 대중교통을
              이용하세요.
            </p>
          ),
        },
        {
          id: "choose",
          heading: "어떻게 고를까",
          body: (
            <p className={INFO_P}>
              어느 검사가 맞는지는 사람마다 다릅니다. 건강 상태, 지난 검사 결과, 앓고 있는
              병에 따라 달라질 수 있으니 검진기관 의사와 상담해 정하세요.
            </p>
          ),
        },
      ]}
      sources="국민건강보험공단 건강검진 실시안내(암검진), 2026년 일반(암)건강검진 안내문, 질병관리청 국가건강정보포털 「위내시경」·「상부위장관 촬영」·「건강검진(암 검진)」, 국가암정보센터 「위장관 조영술은 내시경검사와 어떻게 다른가요?」"
      checkedAt="2026년 10월 2일"
    />
  );
}
