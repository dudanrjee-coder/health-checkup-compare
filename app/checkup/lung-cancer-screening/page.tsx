import type { Metadata } from "next";
import ArticleLayout, { ArticleLink, ArticleTable } from "@/components/ArticleLayout";
import { ArticleRegionLinks, ScopeExampleLinks } from "@/components/ArticleRegionLinks";
import { INFO_LIST, INFO_P } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 폐암 검진, 누가 받고 무엇을 하나. 근거(2026-11-12 확인):
 *  - 국민건강보험공단 건강검진 실시안내 > 암검진(wbhaca04600m01.do): 폐암 검진 대상 나이·주기·검사,
 *    고위험군 기준 가·나·다, 갑년 정의, 산정특례 유예, 비용부담(공단 90%·수검자 10%),
 *    국가암검진사업 대상자·의료급여수급권자 부담 없음, 검진기간 1.1.~12.31., 결과통보 15일 이내
 *  - 「2026년 건강검진 안내」 PDF(wbhaca04500_2026_1.pdf, 이미지 판독): 검진표의 "폐암 (54세~74세 고위험군)"
 * 의학적 판단은 적지 않는다 — 검사 결과 해석과 치료는 의사 상담으로 넘긴다.
 */

const SLUG = "lung-cancer-screening";
const TITLE = "폐암 검진, 누가 받고 무엇을 하나 | 전국 건강검진 병원";
const DESCRIPTION =
  "국가 폐암검진의 대상 나이(54~74세)와 고위험군 세 가지 기준, 갑년 계산법, 저선량 흉부 CT와 사후 결과 상담, 본인 부담 비용과 검진 기간을 국민건강보험공단 자료로 정리했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function LungCancerScreeningPage() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="폐암 검진, 누가 받고 무엇을 하나"
      subtitle="암검진 · 읽는 데 4분"
      crumb="폐암 검진"
      summary="국가 폐암검진은 나이만으로 대상이 되지 않습니다. 2026년 현재 54세부터 74세까지 가운데 흡연력 등으로 폐암 발생 고위험군에 해당하는 사람이 2년마다 저선량 흉부 CT와 사후 결과 상담을 받습니다."
      sections={[
        {
          id: "who",
          heading: "누가 받나요",
          body: (
            <>
              <p className={INFO_P}>
                2026년 현재 국가 폐암검진은 54세부터 74세까지의 남녀 가운데{" "}
                <strong className="font-semibold text-slate-900">폐암 발생 고위험군</strong>에
                해당하는 사람이 대상입니다. 다른 암검진은 나이와 성별만으로 대상이 정해지지만, 폐암은
                여기에 흡연력 조건이 더해집니다. 주기는 2년마다입니다.
              </p>
              <p className={INFO_P}>
                공단이 적어 둔 고위험군 기준은 세 가지이고, 셋 중 하나에만 해당해도 됩니다.
              </p>
              <ArticleTable
                head={["구분", "기준"]}
                nowrapCols={[0]}
                rows={[
                  [
                    "가",
                    "해당연도 전 2년 내 국가건강검진에서 작성하는 문진표로 30갑년 이상 흡연력이 확인되고, 현재 흡연 중인 사람",
                  ],
                  [
                    "나",
                    "건강보험 금연치료 사업에서 작성하는 문진표로 흡연력이 30갑년 이상으로 확인되는 사람",
                  ],
                  [
                    "다",
                    "국가폐암검진을 받았던 사람으로, 검진 후 금연 15년 이내(74세까지)",
                  ],
                ]}
              />
              <p className={INFO_P}>
                ‘다’ 기준 덕분에 담배를 끊은 뒤에도 한동안은 대상에서 바로 빠지지 않습니다. 대상인지
                아닌지는 공단이 정해 통보하므로, 직접 계산해 판단하기보다 검진표나 공단 누리집의
                검진대상 조회로 확인하는 쪽이 정확합니다. 올해 대상인지 확인하는 방법은{" "}
                <ArticleLink slug="national-checkup-eligibility">
                  올해 내가 국가건강검진 대상일까?
                </ArticleLink>
                에 정리했습니다.
              </p>
            </>
          ),
        },
        {
          id: "pack-year",
          heading: "갑년이 무엇인가요",
          body: (
            <>
              <p className={INFO_P}>
                갑년(甲年)은 흡연량을 재는 단위입니다. 공단은 “1일 흡연량(1갑: 20개비 기준) ×
                흡연기간(년)”이라고 설명합니다. 하루에 몇 갑을 몇 해 동안 피웠는지를 곱한 값입니다.
              </p>
              <ArticleTable
                head={["하루 흡연량", "흡연 기간", "갑년"]}
                nowrapCols={[0, 1, 2]}
                rows={[
                  ["1갑(20개비)", "30년", "30갑년"],
                  ["1.5갑(30개비)", "20년", "30갑년"],
                  ["2갑(40개비)", "15년", "30갑년"],
                  ["0.5갑(10개비)", "30년", "15갑년"],
                ]}
              />
              <p className={INFO_P}>
                표는 계산 방법을 보여 주는 예일 뿐입니다. 실제 대상 여부는 검진 문진표에 적힌 흡연력을
                공단이 확인해 정합니다.
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
                검사는 <strong className="font-semibold text-slate-900">저선량 흉부 CT</strong>이고,
                검사 뒤에는 <strong className="font-semibold text-slate-900">사후 결과 상담</strong>이
                함께 따라옵니다. 공단은 두 가지를 묶어 폐암 검진의 내용으로 적고 있습니다.
              </p>
              <ul className={INFO_LIST}>
                <li>
                  일반건강검진에서 하는 흉부 방사선(X-선) 촬영과는 다른 검사입니다. 일반건강검진의 공통
                  검사 항목은{" "}
                  <ArticleLink slug="general-checkup-items">일반검진에서 받는 검사 항목</ArticleLink>에
                  있습니다.
                </li>
                <li>
                  촬영 장비가 있어야 하는 검사이므로, 예약 전에 그 병원이 폐암 검진을 하는 기관인지
                  확인하는 편이 좋습니다. 찾는 방법은{" "}
                  <ArticleLink slug="finding-checkup-center">
                    국가건강검진 받을 병원, 어떻게 찾고 고를까
                  </ArticleLink>
                  에 정리했습니다.
                </li>
                <li>
                  결과를 어떻게 읽고 무엇을 더 해야 하는지는 사람마다 다릅니다. 판단은 사후 결과 상담에서
                  의사와 하시기 바랍니다. 이 글은 제도 안내일 뿐 의학적 판단을 대신하지 않습니다.
                </li>
              </ul>
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
                암검진 전체의 대상·주기·본인 부담을 한 표로 보고 싶다면{" "}
                <ArticleLink slug="six-cancer-screenings">6대 암검진 한눈에 보기</ArticleLink>를
                보세요. 결과통보서를 받은 뒤의 절차는{" "}
                <ArticleLink slug="reading-checkup-results">검진 결과 읽는 법과 재검 안내</ArticleLink>
                에 있습니다.
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
                폐암 산정특례 적용자는 검진 대상에서 유예됩니다. 다만 본인이 검진을 원하면 대상자로
                추가 등록할 수 있습니다.
              </li>
              <li>
                전년도에 검진을 받지 못했다면 공단에 요청해 올해 대상으로 추가 등록할 수 있습니다. 다만
                비용 부담이 달라질 수 있어 공단은 대표번호(1577-1000)나 가까운 지사로 문의하라고
                안내합니다. 자세한 내용은{" "}
                <ArticleLink slug="missed-checkup">검진을 미뤘다면? 추가 수검 안내</ArticleLink>에
                있습니다.
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
                국가건강검진은 주소지와 관계없이 전국의 지정 검진기관에서 받습니다. 이 사이트의 병원
                페이지에서는 국가건강검진 상자에 지정 범위가 표시되고, 범위에 ‘폐암’이 보이는 병원의
                예는 다음과 같습니다(범위를 확인한 병원 중 등급·가나다순 앞쪽이며, 지역별 전체 목록은
                아닙니다).
              </p>
              <ScopeExampleLinks keyword="폐암" limit={3} />
              <p className={INFO_P}>지역별 병원 목록에서 가까운 곳을 찾아볼 수도 있습니다.</p>
              <ArticleRegionLinks />
            </>
          ),
        },
      ]}
      sources="국민건강보험공단 건강검진 실시안내 > 암검진, 「2026년 건강검진 안내」(국민건강보험공단)"
      checkedAt="2026년 11월 12일"
    />
  );
}
