import type { Metadata } from "next";
import ArticleLayout, { ArticleLink, ArticleSteps } from "@/components/ArticleLayout";
import { INFO_LIST, INFO_P } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 검진을 미뤘다면? 추가 수검 안내. 근거(2026-10-02 확인):
 *  - 국민건강보험공단 건강검진 실시안내 > 일반건강검진(wbhaca04500m01.do): 검진기간 12.31 종료,
 *    전년도 미수검자 신청 시 금년도 대상 추가등록, 확진검사 다음 연도 3.31까지
 *  - 같은 곳 > 암검진(wbhaca04600m01.do): 검진기간 연장 없음, 2단계 다음해 1.31까지,
 *    전년도 미수검자 추가 등록 가능하나 비용 부담 달라질 수 있음(1577-1000·지사 문의)
 *  - 누리집 메뉴: 건강모아 > 나의 건강 > 검진신청 > 전년도미수검자 추가신청(로그인 필요, 화면 내용은 미확인)
 *  - 「2026년 일반(암)건강검진 안내문」: 대상 변동 사유, 예약 조기 마감 가능
 */

const SLUG = "missed-checkup";
const TITLE = "검진을 미뤘다면? 추가 수검 안내 | 전국 건강검진 병원";
const DESCRIPTION =
  "국가건강검진 기간(매년 12월 31일까지)을 놓쳤을 때 전년도 미수검자 추가 등록으로 올해 검진을 받는 방법과 신청 경로, 기한을 정리했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function MissedCheckupPage() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="검진을 미뤘다면? 추가 수검 안내"
      subtitle="국가건강검진 · 읽는 데 3분"
      crumb="추가 수검 안내"
      summary="국가건강검진은 매년 12월 31일에 끝나고 기간 연장은 없습니다. 지난해 검진을 놓쳤다면 공단에 신청해 올해 검진 대상으로 추가 등록할 수 있습니다."
      sections={[
        {
          id: "period",
          heading: "검진 기간은 매년 12월 31일까지",
          body: (
            <>
              <p className={INFO_P}>
                일반건강검진과 암검진은 매년 1월 1일부터 12월 31일까지 받습니다. 기간
                연장은 없습니다. 다만 검진 결과에 따라 이어서 받는 검사는 기한이 조금
                깁니다.
              </p>
              <ul className={INFO_LIST}>
                <li>위암·대장암 1단계 결과에 이상이 있으면 2단계 검사는 다음 해 1월 31일까지</li>
                <li>
                  일반건강검진에서 고혈압·당뇨병·이상지질혈증 등이 의심돼 받는 확진검사는 다음 해
                  3월 31일까지
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "add",
          heading: "지난해 검진을 놓쳤다면",
          body: (
            <p className={INFO_P}>
              지난해 대상이었는데 검진을 받지 않은 사람(전년도 미수검자)은 공단에 신청하면
              올해 검진 대상으로 추가 등록할 수 있습니다. 암검진도 추가 등록이 가능하지만,
              비용 부담이 달라질 수 있으니 먼저 공단에 확인하세요. 추가 등록이 되면 올해
              검진 기간인 12월 31일 안에 받아야 합니다.
            </p>
          ),
        },
        {
          id: "apply",
          heading: "신청하는 방법",
          body: (
            <ArticleSteps
              steps={[
                "국민건강보험공단 누리집(www.nhis.or.kr)에 로그인합니다.",
                "건강모아 → 나의 건강 → 검진신청 → 전년도미수검자 추가신청을 누릅니다.",
                "궁금한 점은 공단 고객센터(1577-1000)나 가까운 공단 지사에 문의할 수 있습니다.",
              ]}
            />
          ),
        },
        {
          id: "before",
          heading: "검진 전에 확인할 것",
          body: (
            <ul className={INFO_LIST}>
              <li>
                대상자로 안내받았더라도 해외 체류, 군 입대, 직장 입·퇴사, 건강보험 자격 상실
                등으로 바뀔 수 있습니다. 검진 전에 대상 여부와 항목을 다시 확인하세요. 확인
                방법은 <ArticleLink slug="national-checkup-eligibility">올해 내가 국가건강검진 대상일까?</ArticleLink>
                에 있습니다.
              </li>
              <li>
                검진표는 전자문서로 보내고, 전자문서를 열어 보지 않으면 주민등록 주소지로 우편을
                보냅니다. 직장가입자는 일반건강검진 대상 여부가 회사로도 통보됩니다.
              </li>
              <li>
                검진표를 잃어버렸다면 1577-1000이나 가까운 지사에 신청해 다시 받을 수
                있습니다. 공단 누리집 검진대상 조회에서 검진대상 확인서를 출력할 수도 있습니다.
              </li>
              <li>검진기관에서는 신분증으로 대상 여부를 확인한 뒤 검진합니다.</li>
              <li>
                검진기관 사정에 따라 예약이 일찍 마감될 수 있습니다. 미리 확인하고 예약한 뒤
                방문하세요.
              </li>
            </ul>
          ),
        },
      ]}
      sources="국민건강보험공단 건강검진 실시안내(일반건강검진·암검진), 2026년 일반(암)건강검진 안내문"
      checkedAt="2026년 10월 2일"
    />
  );
}
