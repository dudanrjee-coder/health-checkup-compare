import type { Metadata } from "next";
import ArticleLayout, { ArticleLink, ArticleTable } from "@/components/ArticleLayout";
import { ArticleRegionLinks, ScopeExampleLinks } from "@/components/ArticleRegionLinks";
import { INFO_LIST, INFO_P } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 간암 검진, 고위험군은 6개월마다. 근거(2026-11-15 확인):
 *  - 국민건강보험공단 건강검진 실시안내 > 암검진(wbhaca04600m01.do): 간암 검진 대상(40세 이상 고위험군),
 *    상반기 1회·하반기 1회로 6개월마다 간 초음파검사와 혈액검사(혈청알파태아단백검사), 고위험군 기준 가·나,
 *    산정특례 유예, 비용부담(공단 90%·수검자 10%), 하위 50%·의료급여수급권자 부담 없음,
 *    검진기간 1.1.~12.31., 결과통보 15일 이내
 *  - 국민건강보험공단 건강검진 실시안내 > 일반건강검진(wbhaca04500m01.do): 성·연령별 검사항목
 *  - 국가암정보센터(국립암센터) 국가암검진사업: "간암 검진방법은 간 초음파검사 와 혈청 알파태아단백 검사
 *    (정성법 또는 정량법)를 병행합니다."
 *  - 질병관리청 국가건강정보포털 「간경변증」(cntnts_sn=6560): 적어도 6개월마다 상복부 초음파와 알파 태아 단백(AFP)
 *  - 질병관리청 국가건강정보포털 「B형간염」(cntnts_sn=6672): 6개월마다 간기능검사와 복부 초음파,
 *    국가 B형간염 선별검사는 일반건강검진 등을 통해 이루어짐
 *  - 질병관리청 국가건강정보포털 「복부초음파검사」(cntnts_sn=1061): 상복부 10~15분, 금식 6~8시간(가능하면 12시간),
 *    공기·뼈에 가려지면 영상 한계
 * 의학적 판단은 적지 않는다 — 고위험군 해당 여부와 결과 해석은 공단 통보와 의사 상담으로 넘긴다.
 *
 * 2026-11-18: 질병관리청 자료(공공누리 제4유형)와 겹치던 문장을 우리 말로 다시 썼다.
 * 간경변증 130자 인용은 요약으로 바꾸고, 복부초음파 설명·표 세 칸도 새로 썼다.
 * 질병관리청 직접 인용은 남기지 않았다. 겹침 측정은 `node scripts/check-quote-overlap.mjs`.
 */

const SLUG = "liver-cancer-screening";
const TITLE = "간암 검진, 고위험군은 6개월마다 | 전국 건강검진 병원";
const DESCRIPTION =
  "국가 간암검진의 대상(40세 이상 고위험군)과 고위험군 두 가지 기준, 6개월 주기, 간 초음파와 혈청알파태아단백검사, 검사 전 금식과 비용·기간을 국민건강보험공단·질병관리청 자료로 정리했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function LiverCancerScreeningPage() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="간암 검진, 고위험군은 6개월마다"
      subtitle="암검진 · 읽는 데 4분"
      crumb="간암 검진"
      summary="2026년 현재 국가 간암검진은 40세 이상 가운데 간암 발생 고위험군으로 정해진 사람이 받습니다. 주기가 6개월로, 상반기에 한 번·하반기에 한 번 간 초음파검사와 혈액검사를 받는 유일한 암검진입니다."
      sections={[
        {
          id: "who",
          heading: "누가 받나요",
          body: (
            <>
              <p className={INFO_P}>
                2026년 현재 국가 간암검진은 40세 이상 가운데{" "}
                <strong className="font-semibold text-slate-900">간암 발생 고위험군</strong>에
                해당하는 사람이 대상입니다. 나이만으로 대상이 되는 위암·대장암과 달리, 간암은 폐암처럼
                조건이 하나 더 붙습니다. 공단이 적어 둔 고위험군 기준은 두 가지이고, 둘 중 하나에만
                해당해도 됩니다.
              </p>
              <ArticleTable
                head={["구분", "기준"]}
                nowrapCols={[0]}
                rows={[
                  [
                    "가",
                    "해당년도 이전 2개년도 보험급여 내역 중 간암 발생 고위험군(간경변증, B형 간염, C형 간염, B형 또는 C형 간염 바이러스에 의한 만성 간질환 환자)",
                  ],
                  [
                    "나",
                    "과거년도 일반건강검진 결과 B형 간염 바이러스 표면항원 양성자 또는 C형 간염 바이러스 항체 양성자",
                  ],
                ]}
              />
              <p className={INFO_P}>
                두 기준 모두 <strong className="font-semibold text-slate-900">이미 있는 기록</strong>을
                봅니다. ‘가’는 지난 2년의 건강보험 급여 내역이고, ‘나’는 예전에 받은 일반건강검진
                결과입니다. 그래서 스스로 계산해 판단할 일이 아니고, 공단이 정해 통보합니다. 올해 내가
                대상인지 확인하는 방법은{" "}
                <ArticleLink slug="national-checkup-eligibility">
                  올해 내가 국가건강검진 대상일까?
                </ArticleLink>
                에 정리했습니다.
              </p>
              <p className={INFO_P}>
                ‘나’ 기준에 나오는 간염 검사는 일반건강검진의 성·연령별 검사항목에 들어 있습니다. 공단
                표를 보면 B형간염 검사는 40세(보균자 또는 면역자는 제외), C형간염 검사는 56세에
                받습니다. 질병관리청도 국가에서 하는 B형간염 선별검사가 일반건강검진 등을 통해
                이루어진다고 적고 있습니다. 일반검진에서 받는 검사 전체는{" "}
                <ArticleLink slug="general-checkup-items">일반검진에서 받는 검사 항목</ArticleLink>에
                있습니다.
              </p>
            </>
          ),
        },
        {
          id: "why-six-months",
          heading: "왜 6개월마다인가요",
          body: (
            <>
              <p className={INFO_P}>
                국가암검진 6가지 가운데 주기가 6개월인 것은 간암뿐입니다. 공단은 “상반기 1회, 하반기
                1회로 6개월마다” 받는다고 적고 있습니다. 한 해에 두 번이라는 뜻입니다.
              </p>
              <p className={INFO_P}>
                질병관리청 자료도 고위험군에게 같은 간격의 검사를 안내합니다. 간경변증 설명을 요약하면,
                간경변증이 있으면 간암이 생길 위험이 커서 정기 검사로 일찍 찾아내는 일이 중요하고,
                적어도 반년에 한 번은 상복부 초음파와 피로 보는 알파태아단백(AFP)을 확인하라는
                내용입니다(초음파로 모자라면 복부 CT를 더합니다). B형간염 설명에도 바이러스 보유자는
                6개월 간격으로 간기능검사와 복부 초음파를 받으며 정기적으로 진료받으라는 안내가 있습니다.
              </p>
              <p className={INFO_P}>
                다만 내 간 상태에 맞는 검사 종류와 간격은 사람마다 다릅니다. 이 글은 제도 안내일 뿐이니,
                치료 중이거나 이미 정기 진찰을 받고 있다면 주기는 진료하는 의사와 정하세요.
              </p>
            </>
          ),
        },
        {
          id: "what",
          heading: "무엇을 하나요",
          body: (
            <>
              <p className={INFO_P}>
                검사는 두 가지를 함께 합니다 —{" "}
                <strong className="font-semibold text-slate-900">간 초음파검사</strong>와{" "}
                <strong className="font-semibold text-slate-900">혈액검사(혈청알파태아단백검사)</strong>
                입니다. 국가암정보센터는 “간암 검진방법은 간 초음파검사와 혈청 알파태아단백
                검사(정성법 또는 정량법)를 병행합니다”라고 적고 있습니다.
              </p>
              <p className={INFO_P}>
                초음파 검사는 장비가 몸으로 보낸 음파가 장기에 부딪혀 되돌아오는 신호를 모아 화면에
                실시간으로 그려 주는 방식입니다. 질병관리청 「복부초음파검사」 설명에서 검진을 받을 때
                알아두면 좋은 것만 추리면 다음과 같습니다.
              </p>
              <ArticleTable
                head={["구분", "내용"]}
                nowrapCols={[0]}
                rows={[
                  [
                    "걸리는 시간",
                    "큰 이상이 보이지 않으면 10~15분 안에 끝납니다(영상의학과 의사가 익숙하게 상복부를 보는 경우)",
                  ],
                  [
                    "검사 전 금식",
                    "성인은 보통 6~8시간, 되도록 12시간을 넘겨 공복으로. 물·음료수·껌·담배도 안 됩니다",
                  ],
                  [
                    "검사의 한계",
                    "공기와 뼈는 초음파가 잘 통과하지 못합니다. 보려는 장기가 장 속 공기나 갈비뼈에 가리면 영상을 제대로 얻기 어려울 수 있습니다",
                  ],
                ]}
              />
              <p className={INFO_P}>
                금식 시간은 검진기관이 안내하는 쪽을 따르세요. 국가건강검진의 금식 안내는{" "}
                <ArticleLink slug="checkup-preparation">검진 전날과 당일 준비사항</ArticleLink>에
                정리해 두었습니다.
              </p>
            </>
          ),
        },
        {
          id: "cost",
          heading: "비용과 기간",
          body: (
            <>
              <ArticleTable
                head={["구분", "내용"]}
                nowrapCols={[0]}
                rows={[
                  ["본인 부담", "검진비의 10%(공단 90% 부담)"],
                  [
                    "부담 면제",
                    "국가암검진사업 대상자(전년도 11월 건강보험료 기준 하위 50%)와 의료급여수급권자는 수검자 부담 없음",
                  ],
                  ["검진 기간", "매년 1월 1일 ~ 12월 31일(검진기간 연장은 없음)"],
                  ["결과 통보", "검진기관이 검진 완료 후 15일 이내에 우편 또는 이메일로 통보"],
                ]}
              />
              <p className={INFO_P}>
                주기가 6개월이라 상반기에 받고 하반기를 놓치기 쉽습니다. 검진 기간은 12월 31일로
                끝나고 연장이 없습니다. 암검진 6가지의 대상·주기·본인 부담을 한 표로 보려면{" "}
                <ArticleLink slug="six-cancer-screenings">6대 암검진 한눈에 보기</ArticleLink>를,
                결과통보서를 받은 뒤의 절차는{" "}
                <ArticleLink slug="reading-checkup-results">검진 결과 읽는 법과 재검 안내</ArticleLink>
                를 보세요.
              </p>
            </>
          ),
        },
        {
          id: "notes",
          heading: "알아둘 점",
          body: (
            <ul className={INFO_LIST}>
              <li>
                간암 산정특례 적용자는 검진 대상에서 유예됩니다. 다만 본인이 검진을 원하면 대상자로
                추가 등록할 수 있습니다.
              </li>
              <li>
                일반건강검진에서 C형간염 질환이 의심되면 확진검사를 받을 수 있습니다. 확진검사는 처음
                1회 본인부담금이 면제되지만, C형간염은 먼저 진료비를 내고 따로 정산 신청을 합니다.
                자세한 내용은{" "}
                <ArticleLink slug="reading-checkup-results">검진 결과 읽는 법과 재검 안내</ArticleLink>
                에 있습니다.
              </li>
              <li>
                전년도에 받지 못했다면 공단에 요청해 올해 대상으로 추가 등록할 수 있습니다. 다만 비용
                부담이 달라질 수 있어 공단은 대표번호(1577-1000)나 가까운 지사로 문의하라고 안내합니다
                —{" "}
                <ArticleLink slug="missed-checkup">검진을 미뤘다면? 추가 수검 안내</ArticleLink>.
              </li>
              <li>
                제도는 해마다 바뀔 수 있습니다. 이 글은 2026년 기준이며, 받기 전에 공단 누리집이나
                검진표로 그해 기준을 한 번 더 확인하세요.
              </li>
            </ul>
          ),
        },
        {
          id: "where",
          heading: "어디서 받을 수 있나요",
          body: (
            <>
              <p className={INFO_P}>
                국가건강검진은 주소지와 관계없이 전국의 지정 검진기관에서 받습니다. 초음파 장비가 있어야
                하는 검사이므로, 예약 전에 그 병원이 간암 검진을 하는 기관인지 확인하는 편이 좋습니다.
                찾는 방법은{" "}
                <ArticleLink slug="finding-checkup-center">
                  국가건강검진 받을 병원, 어떻게 찾고 고를까
                </ArticleLink>
                에 정리했습니다.
              </p>
              <p className={INFO_P}>
                이 사이트의 병원 페이지에서는 국가건강검진 상자에 지정 범위가 표시됩니다. 범위에
                ‘간암’이 보이는 병원의 예는 다음과 같습니다(범위를 확인한 병원 중 등급·가나다순
                앞쪽이며, 지역별 전체 목록은 아닙니다).
              </p>
              <ScopeExampleLinks keyword="간암" limit={3} />
              <p className={INFO_P}>지역별 병원 목록에서 가까운 곳을 찾아볼 수도 있습니다.</p>
              <ArticleRegionLinks />
            </>
          ),
        },
      ]}
      sources="국민건강보험공단 건강검진 실시안내 > 암검진·일반건강검진, 국가암정보센터(국립암센터) 국가암검진사업, 질병관리청 국가건강정보포털 「간경변증」·「B형간염」·「복부초음파검사」"
      checkedAt="2026년 11월 15일"
    />
  );
}
