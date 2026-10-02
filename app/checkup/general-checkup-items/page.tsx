import type { Metadata } from "next";
import ArticleLayout, { ArticleLink, ArticleTable } from "@/components/ArticleLayout";
import { INFO_LIST, INFO_P } from "@/components/InfoPage";
import { articlePath } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

/**
 * 일반검진에서 받는 검사 항목. 근거(2026-10-02 확인):
 *  - 국민건강보험공단 건강검진 실시안내 > 일반건강검진(wbhaca04500m01.do): 공통·성연령별 검사 항목,
 *    결과통보 15일 이내, 확진검사 대상·기한
 *  - 「2026년 일반(암)건강검진 안내문」: 공통 항목별 대상질환, 시력·청력 교정시력 안내,
 *    확진검사 최초 1회 본인부담 면제(C형간염은 별도 정산)
 */

const SLUG = "general-checkup-items";
const TITLE = "일반검진에서 받는 검사 항목 | 전국 건강검진 병원";
const DESCRIPTION =
  "국가 일반건강검진에서 모든 대상자가 받는 기본 검사와 나이·성별에 따라 더해지는 검사(이상지질혈증, 간염, 골밀도, 인지기능 등)를 표로 정리했습니다.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: articlePath(SLUG) },
  openGraph: { type: "article", locale: "ko_KR", url: `${SITE_URL}${articlePath(SLUG)}`, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function GeneralCheckupItemsPage() {
  return (
    <ArticleLayout
      slug={SLUG}
      title="일반검진에서 받는 검사 항목"
      subtitle="국가건강검진 · 읽는 데 3분"
      crumb="일반검진 검사 항목"
      summary="일반건강검진은 모든 대상자가 같은 기본 검사를 받고, 나이와 성별에 따라 몇 가지 검사가 더해집니다. 결과는 검진 후 15일 이내에 받습니다."
      sections={[
        {
          id: "common",
          heading: "모든 대상자가 받는 기본 검사",
          body: (
            <>
              <p className={INFO_P}>
                일반건강검진은 고혈압, 당뇨병 같은 심뇌혈관 질환을 일찍 찾아 치료로 이어지게
                하려는 검진입니다.
              </p>
              <p className={INFO_P}>
                진찰과 상담(문진)을 시작으로 아래 검사를 받습니다. 오른쪽은 그 검사로 살피는
                질환입니다.
              </p>
              <ArticleTable
                head={["검사", "살피는 질환"]}
                rows={[
                  ["키·몸무게·허리둘레·체질량지수", "비만"],
                  ["시력·청력", "시각·청각 이상"],
                  ["혈압", "고혈압"],
                  ["혈색소(혈액)", "빈혈"],
                  ["공복혈당(혈액)", "당뇨병"],
                  ["AST·ALT·γ-GTP(혈액)", "간장질환"],
                  ["요단백(소변)·혈청크레아티닌·e-GFR(혈액)", "신장질환"],
                  ["흉부 방사선 촬영", "폐결핵·흉부질환"],
                  ["구강검진", "구강질환"],
                ]}
              />
              <p className="m-0 text-sm text-slate-600">
                시력·청력 결과는 운전면허 신체검사에도 쓰입니다. 안경이나 렌즈를 쓰는 분은
                교정시력으로 검사받으세요.
              </p>
            </>
          ),
        },
        {
          id: "age",
          heading: "나이·성별에 따라 더해지는 검사",
          body: (
            <>
            <p className={INFO_P}>
              해당 나이와 성별이면 기본 검사에 더해 받습니다. 이상지질혈증 검사는 혈액으로
              총콜레스테롤, HDL·LDL 콜레스테롤, 중성지방을 봅니다.
            </p>
            <ArticleTable
              head={["검사", "대상"]}
              nowrapCols={[0]}
              rows={[
                ["이상지질혈증", "남성 24세 이상, 여성 40세 이상, 4년마다"],
                ["B형간염", "40세(보균자·면역자 제외)"],
                ["C형간염", "56세"],
                ["골밀도", "54·60·66세 여성"],
                ["폐기능", "56·66세"],
                ["인지기능장애", "66세 이상, 2년마다"],
                ["우울증", "20~34세 2년마다, 35~39세 중 1회, 40·50·60·70대 각 1회"],
                ["조기정신증", "20~34세, 2년마다"],
                ["생활습관평가", "40·50·60·70세"],
                ["노인신체기능", "66·70·80세"],
                ["치면세균막", "40세(구강검진)"],
              ]}
            />
            </>
          ),
        },
        {
          id: "result",
          heading: "결과와 그다음",
          body: (
            <>
              <p className={INFO_P}>
                검진기관은 검진 후 15일 이내에 결과를 우편이나 이메일로 알려 줍니다.
              </p>
              <ul className={INFO_LIST}>
                <li>
                  고혈압, 당뇨병, 이상지질혈증, 폐결핵, 우울증·조기정신증, C형간염이 의심되면
                  확진검사를 받을 수 있습니다. 기한은 다음 해 3월 31일까지입니다.
                </li>
                <li>
                  확진검사는 처음 한 번 본인 부담이 없습니다. C형간염은 먼저 진료비를 낸 뒤
                  따로 정산 신청을 합니다.
                </li>
                <li>결과에 대해 궁금한 점은 의사와 상담하세요.</li>
              </ul>
            </>
          ),
        },
        {
          id: "more",
          heading: "함께 알아두면 좋은 것",
          body: (
            <p className={INFO_P}>
              암검진은 일반검진과 따로 대상과 주기가 정해져 있습니다.{" "}
              <ArticleLink slug="six-cancer-screenings">6대 암검진 한눈에 보기</ArticleLink>를
              참고하세요. 검진 당일 금식과 준비물은{" "}
              <ArticleLink slug="checkup-preparation">검진 전날과 당일 준비사항</ArticleLink>에
              정리했습니다.
            </p>
          ),
        },
      ]}
      sources="국민건강보험공단 건강검진 실시안내(일반건강검진), 2026년 일반(암)건강검진 안내문"
      checkedAt="2026년 10월 2일"
    />
  );
}
