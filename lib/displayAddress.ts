/**
 * 주소를 화면에 보일 꼴로 다듬는다 — **조사 과정이 드러나는 출처 메모만** 떼어 낸다.
 *
 * `hospitals.json`의 `address`에는 번지를 어디서 맞췄는지 적어 둔 괄호가 섞여 있다
 * (`(OSM 확인: 대사동)`, `(심평원 등록: 반곡동, 메인타워)`). 방문자에게는 뜻이 없는
 * 내부 기록이라 **화면에서만** 가린다. `hospitals.json` 값은 그대로 두므로
 * "기존 값 변경 금지" 원칙과 부딪히지 않고, 근거는 데이터에 남는다.
 *
 * 떼어 내는 기준은 **출처 이름 + 콜론**이 함께 있는 괄호 하나뿐이다. 주소 대부분에
 * 붙어 있는 법정동 괄호(`(신촌동)`, `(가좌3동 277-7)`)와 `(구:효자3동 17-1)` 같은
 * 옛 주소 표기는 방문자에게 쓸모가 있어 그대로 둔다.
 */

/** `(OSM 확인: …)`, `(심평원 등록: …)` 꼴의 출처 메모 괄호 */
const SOURCE_MEMO_RE =
  /\s*[(（]\s*(?:OSM|심평원|공단|카카오|네이버|구글|지도)[^)）]*[:：][^)）]*[)）]/g;

export function displayAddress(address: string): string;
export function displayAddress(address: string | undefined): string | undefined;
export function displayAddress(address?: string): string | undefined {
  if (!address) return address;
  const cleaned = address.replace(SOURCE_MEMO_RE, "").replace(/\s{2,}/g, " ").trim();
  // 괄호만 있던 주소가 통째로 비면 원문을 그대로 쓴다(빈 줄을 보여 주지 않는다)
  return cleaned || address;
}
