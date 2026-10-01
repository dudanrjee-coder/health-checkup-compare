import type { Metadata } from "next";
import InfoPage, { INFO_FINE, INFO_P, InfoSection } from "@/components/InfoPage";
import { SITE_URL } from "@/lib/site";
import { CONTACT_EMAIL } from "@/lib/useCopyEmail";

/**
 * 개인정보처리방침. 2번(쿠키)은 app/api/visit/route.ts의 hc_visited 쿠키
 * (값은 KST 날짜뿐, 2일 뒤 만료)와 맞춰 쓴 문장이다 — 카운터가 바뀌면 같이 고친다.
 */

const TITLE = "개인정보처리방침 | 전국 건강검진 병원";
const DESCRIPTION =
  "건강검진병원.com이 쿠키와 접속 기록 등 방문자 정보를 어떻게 다루는지 안내합니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: { type: "website", locale: "ko_KR", url: `${SITE_URL}/privacy`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="개인정보처리방침"
      subtitle="건강검진병원.com이 방문자 정보를 어떻게 다루는지 안내합니다."
    >
      <InfoSection heading="1. 수집하는 개인정보">
        <p className={INFO_P}>
          이 사이트는 회원가입이 없고, 이름·전화번호·주민등록번호 같은 개인정보를
          입력받지 않습니다.
        </p>
      </InfoSection>

      <InfoSection heading="2. 쿠키 사용">
        <p className={INFO_P}>
          방문자 수를 세기 위해 쿠키를 사용합니다. 같은 사람이 하루에 여러 번 들어와도
          한 번만 세려는 용도이며, 쿠키에는 이름이나 연락처가 담기지 않습니다. 브라우저
          설정에서 쿠키를 거부할 수 있고, 거부해도 사이트 이용에는 문제가 없습니다.
        </p>
      </InfoSection>

      <InfoSection heading="3. 접속 기록">
        <p className={INFO_P}>
          사이트는 Vercel(미국) 서버에서 운영됩니다. 서비스 운영 과정에서 접속 IP,
          브라우저 종류, 접속 시각 같은 기록이 Vercel에 자동으로 남을 수 있습니다. 또한
          지도를 보여주기 위해 OpenStreetMap 서버에서 지도 이미지를 불러오며, 이때 접속
          IP가 OpenStreetMap 측에 전달됩니다.
        </p>
      </InfoSection>

      <InfoSection heading="4. 광고">
        <p className={INFO_P}>
          앞으로 Google 애드센스 광고를 게재할 수 있습니다. 이 경우 Google을 포함한 제3자
          광고 업체가 쿠키를 사용해 방문자의 이전 방문 기록을 바탕으로 광고를 보여줄 수
          있습니다. 맞춤 광고는 Google 광고 설정(
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563eb] underline underline-offset-2 hover:text-blue-700"
          >
            adssettings.google.com
          </a>
          )에서 끌 수 있습니다.
        </p>
      </InfoSection>

      <InfoSection heading="5. 제3자 제공">
        <p className={INFO_P}>운영자는 방문자 정보를 다른 곳에 팔거나 제공하지 않습니다.</p>
      </InfoSection>

      <InfoSection heading="6. 문의처">
        <p className={INFO_P}>
          개인정보 관련 문의: 건강검진병원.com 운영자 · {CONTACT_EMAIL}
        </p>
      </InfoSection>

      <p className={INFO_FINE}>시행일 2026년 10월 1일 · 내용이 바뀌면 이 페이지에 공지합니다.</p>
    </InfoPage>
  );
}
