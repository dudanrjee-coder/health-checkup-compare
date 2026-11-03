import type { Metadata } from "next";
import InfoPage, { INFO_LIST, INFO_P, InfoSection } from "@/components/InfoPage";
import { SITE_URL } from "@/lib/site";

const TITLE = "사이트 소개 | 전국 건강검진 병원";
const DESCRIPTION =
  "건강검진병원.com을 만든 이유와 담고 있는 정보, 정보 출처, 운영 방식을 소개합니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { type: "website", locale: "ko_KR", url: `${SITE_URL}/about`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function AboutPage() {
  return (
    <InfoPage
      title="사이트 소개"
      subtitle="전국 건강검진 병원 정보를 한곳에서 비교하는 사이트입니다."
    >
      <InfoSection heading="만든 이유">
        <p className={INFO_P}>
          건강검진 병원을 고르려면 병원 홈페이지를 하나씩 들어가 검진 비용, 결과 받는
          방법, 주차 정보를 찾아야 합니다. 건강검진병원.com은 이 정보를 지역별로 모아
          한눈에 비교할 수 있게 정리했습니다.
        </p>
      </InfoSection>

      <InfoSection heading="담고 있는 정보">
        <ul className={INFO_LIST}>
          <li>전국 상급종합병원·종합병원·병원·의료원의 검진센터 정보</li>
          <li>검진비용, 결과통보 방법, 소요시간, 식사제공, 주차·교통</li>
          <li>국가건강검진 지정 여부와 예약 방법</li>
        </ul>
      </InfoSection>

      <InfoSection heading="정보 출처">
        <ul className={INFO_LIST}>
          <li>각 병원 공식 홈페이지(검진센터 하위 메뉴까지 직접 확인)</li>
          <li>국민건강보험공단 검진기관 명단</li>
          <li>건강보험심사평가원 병원 정보</li>
        </ul>
        <p className={INFO_P}>병원마다 정보를 확인한 날짜를 상세 페이지에 함께 적어 두었습니다.</p>
      </InfoSection>

      <InfoSection heading="조사 방법">
        <p className={INFO_P}>
          병원 한 곳을 등록할 때 아래 순서를 그대로 밟습니다. 자세한 내용은{" "}
          <a href="/guide#source" className="text-blue-600 hover:underline">
            이용 안내의 「정보는 이렇게 모았습니다」
          </a>
          에 적어 두었습니다.
        </p>
        <ul className={INFO_LIST}>
          <li>
            건강보험심사평가원의 병원 목록에서 그 지역의 검진 대상 병원을 먼저
            추립니다.
          </li>
          <li>
            병원 공식 홈페이지에 들어가 검진센터 하위 메뉴(프로그램·비용, 검진
            절차, 오시는 길·주차, 결과 통보, 예약 안내)를 끝까지 열어 봅니다.
          </li>
          <li>
            국민건강보험공단 검진기관 명단과 기관명·주소를 대조해 국가건강검진
            지정 여부와 지정 검진 종류를 확인합니다. 등급이나 규모로 짐작하지
            않습니다.
          </li>
          <li>
            홈페이지에서 찾지 못한 항목은 추측해서 채우지 않고 비워 두어
            「병원문의」로 표시합니다.
          </li>
        </ul>
      </InfoSection>

      <InfoSection heading="얼마나 자주 갱신하나요">
        <p className={INFO_P}>
          전국을 한 번에 다시 조사하지는 않습니다. 지역을 나눠 순차적으로
          조사하면서 등록을 늘리고 있고, 병원 정보는 새로 확인한 내용이 생기면
          그때그때 고칩니다.
        </p>
        <p className={INFO_P}>
          그래서 병원마다 마지막으로 확인한 날짜가 다릅니다. 각 병원 상세
          페이지의 「정보 확인일」이 그 병원을 마지막으로 확인한 날이니, 날짜가
          오래됐다면 예약 전에 병원에 한 번 더 확인해 주세요. 바뀐 내용을 알려
          주시면 확인해서 고치겠습니다.
        </p>
      </InfoSection>

      <InfoSection heading="이용할 때 알아두세요">
        <p className={INFO_P}>
          검진 비용과 운영 방식은 병원 사정에 따라 바뀔 수 있습니다. 예약 전에 반드시
          병원에 직접 확인해 주세요. 이 사이트는 의료 상담을 제공하지 않습니다.
        </p>
      </InfoSection>

      <InfoSection heading="운영">
        <p className={INFO_P}>
          건강검진병원.com 운영자가 개인적으로 조사하고 운영합니다. 특정 병원으로부터
          대가를 받고 순서나 내용을 정하지 않습니다.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
