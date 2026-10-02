import type { Metadata } from "next";
import ArticleLayout, { ArticleLink } from "@/components/ArticleLayout";
import { INFO_LIST, INFO_P } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 검진 전날과 당일 준비사항. 근거(2026-10-02 확인):
 *  - 국민건강보험공단 건강검진 실시안내 > 일반건강검진(wbhaca04500m01.do): 금식(전날 저녁 9시 이후,
 *    당일 물·커피·담배·껌 등 삼감, 오후 검진은 8시간 이상 공복)
 *  - 「2026년 일반(암)건강검진 안내문」: 분변잠혈·유방암·자궁경부암만 받으면 금식 대상 아님, 웹 문진표,
 *    신분증, 자궁경부암 검진은 생리 전후 2~3일 피함, 대변 검체 본인 제출, 수면내시경 후 운전 금지·보호자 동반,
 *    귀중품 주의, 사전 예약, 교정시력
 *  - 질병관리청 국가건강정보포털 「대장내시경검사」(cntnts_sn=5254): 복용 약은 임의 중단 금지·의사와 상의,
 *    약 알레르기 알림, 3일 전 음식 제한, 전날 식사, 오후 6시부터 맑은 물, 장정결제 분할 복용·4~6시간 전
 * 특정 약 이름과 중단 기간은 쓰지 않는다(개인마다 달라 의사와 상담할 일).
 */

const SLUG = "checkup-preparation";
const TITLE = "검진 전날과 당일 준비사항 | 전국 건강검진 병원";
const DESCRIPTION =
  "건강검진 전 금식 시간, 복용 중인 약 상담, 대장내시경 장 정리, 여성 검진 시 주의할 점, 검진 당일 챙겨갈 것을 공식 자료 기준으로 정리했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function CheckupPreparationPage() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="검진 전날과 당일 준비사항"
      subtitle="검진 전후 · 읽는 데 3분"
      crumb="검진 준비사항"
      summary="검진 전날 저녁 9시부터 금식하고, 당일 아침에는 물도 마시지 않습니다. 먹고 있는 약은 임의로 끊지 말고 의사와 상의하세요."
      sections={[
        {
          id: "fasting",
          heading: "금식은 전날 저녁 9시부터",
          body: (
            <ul className={INFO_LIST}>
              <li>검진 전날 저녁 9시 이후에는 먹지 않습니다.</li>
              <li>검진 당일 아침에는 식사는 물론 물, 커피, 우유, 주스, 담배, 껌도 삼갑니다.</li>
              <li>
                오후에 검진을 받으면 검사 전 8시간 이상 공복을 지킵니다. 공복이 아니면
                결과가 다르게 나올 수 있습니다.
              </li>
              <li>
                대장암 분변잠혈검사(대변검사), 유방암, 자궁경부암 검진만 받는 경우에는 금식하지
                않아도 됩니다.
              </li>
            </ul>
          ),
        },
        {
          id: "medicine",
          heading: "먹고 있는 약이 있다면",
          body: (
            <p className={INFO_P}>
              먹고 있는 약은 임의로 끊지 마세요. 검사 전에 계속 먹을지 의사와 상의해야
              합니다. 특히 내시경 검사를 받을 때 혈액 응고에 영향을 주는 약을 먹고 있다면 꼭
              미리 알리세요. 약에 알레르기가 있다면 그것도 반드시 알려야 합니다.
            </p>
          ),
        },
        {
          id: "colon",
          heading: "대장내시경 장 정리",
          body: (
            <>
              <p className={INFO_P}>
                국가 대장암검진은 대변검사에서 ‘잠혈반응 있음’이 나온 경우에 대장내시경을
                받습니다. 대장내시경은 장을 깨끗이 비워야 검사가 잘 됩니다.
              </p>
              <ul className={INFO_LIST}>
                <li>
                  3일 전부터: 잡곡밥, 김, 미역, 옥수수, 견과류, 씨 있는 과일(수박·참외·키위)은
                  피하는 것이 좋습니다.
                </li>
                <li>
                  전날: 아침은 가볍게, 점심과 저녁은 흰죽이나 미음을 반찬 없이 먹습니다. 오후
                  6시부터는 물이나 맑은 음료를 충분히 마십니다.
                </li>
                <li>
                  장정결제: 병원이 준 복용 안내문을 그대로 따릅니다. 전날과 당일에 나눠 먹는
                  방법이 널리 쓰이며, 두 번째는 검사 4~6시간 전에 먹습니다.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "women",
          heading: "여성 검진 때 주의할 점",
          body: (
            <p className={INFO_P}>
              자궁경부암 검진은 생리 기간을 피해서 받습니다. 생리 전후 2~3일도 피하는 것이
              좋습니다. 일정이 맞지 않으면 예약을 바꾸세요.
            </p>
          ),
        },
        {
          id: "bring",
          heading: "당일 챙겨갈 것",
          body: (
            <>
              <ul className={INFO_LIST}>
                <li>신분증: 검진기관에서 신분증으로 본인과 대상 여부를 확인합니다.</li>
                <li>
                  문진표: 공단 누리집(건강모아 → 나의 건강 → 검진신청 → 문진표/평가도구
                  작성)에서 미리 쓰면 시간이 줄어듭니다. 일부 기관은 연계가 어려울 수 있으니
                  확인하세요.
                </li>
                <li>대변 검체: 본인이 신분증을 지참해 직접 제출합니다.</li>
                <li>안경·렌즈: 시력은 교정시력으로 검사합니다.</li>
                <li>귀중품은 도난·분실 우려가 있으니 주의하세요.</li>
              </ul>
              <p className={INFO_P}>
                수면내시경을 받으면 검사 후 직접 운전하면 위험합니다. 보호자와 함께 가거나
                대중교통을 이용하세요. 무엇을 받는지는{" "}
                <ArticleLink slug="general-checkup-items">일반검진에서 받는 검사 항목</ArticleLink>에
                정리했습니다.
              </p>
            </>
          ),
        },
      ]}
      sources="국민건강보험공단 건강검진 실시안내(일반건강검진), 2026년 일반(암)건강검진 안내문, 질병관리청 국가건강정보포털 「대장내시경검사」"
      checkedAt="2026년 10월 2일"
    />
  );
}
