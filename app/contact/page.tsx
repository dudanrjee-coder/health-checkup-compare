import type { Metadata } from "next";
import { CopyEmail } from "@/components/GuideDemos";
import InfoPage, { INFO_FINE, INFO_P, InfoSection } from "@/components/InfoPage";
import { SITE_URL } from "@/lib/site";

/**
 * 문의 페이지. 이메일은 홈·이용 안내와 같은 "클릭하면 복사" 방식(CopyEmail)을
 * 그대로 쓴다 — mailto 링크나 입력 양식은 두지 않는다.
 */

const TITLE = "문의 | 전국 건강검진 병원";
const DESCRIPTION =
  "건강검진병원.com의 병원 정보 오류 제보, 정보 수정·추가 요청, 제휴 문의를 이메일로 받습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: { type: "website", locale: "ko_KR", url: `${SITE_URL}/contact`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const TOPICS: { title: string; desc: string }[] = [
  { title: "정보 오류 제보", desc: "검진비용·전화번호·주소가 실제와 다를 때" },
  { title: "병원 정보 수정·추가", desc: "병원 관계자의 정보 갱신이나 등록 요청" },
  { title: "제휴 문의", desc: "사이트 운영 관련 제안" },
];

export default function ContactPage() {
  return (
    <InfoPage title="문의" subtitle="오류 제보와 정보 수정 요청을 받습니다.">
      <section className="flex flex-col gap-5">
        <div className="rounded-[18px] border border-slate-200 bg-white p-5">
          <CopyEmail />
        </div>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
          {TOPICS.map((t) => (
            <li key={t.title} className="rounded-[14px] border border-slate-200 bg-white px-4 py-3.5">
              <p className="m-0 text-[15px] font-bold text-slate-900">{t.title}</p>
              <p className="m-0 mt-1 text-sm leading-relaxed text-slate-600">{t.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <InfoSection heading="보내실 때">
        <p className={INFO_P}>
          병원 이름과 바뀐 내용을 함께 적어 주시면 빨리 확인할 수 있습니다. 확인 후 사이트에
          반영합니다.
        </p>
      </InfoSection>

      <p className={INFO_FINE}>건강검진병원.com 운영자</p>
    </InfoPage>
  );
}
