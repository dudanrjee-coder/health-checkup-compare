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
