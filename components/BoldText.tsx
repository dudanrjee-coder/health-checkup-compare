/**
 * note에서 글자 그대로 옮겨 온 글에 섞인 `**강조**` 표시를 굵은 글씨로 바꾼다.
 *
 * 2026-11-09에 상세 페이지 본문(publicNote)에만 넣었는데, **표 칸**(주차·교통)에는
 * 빠져 있어 울산 3곳에서 별표가 글자 그대로 보였다. 같은 note에서 온 글이 자리에 따라
 * 다르게 보이면 안 되므로 공용으로 옮겨 카드·상세 양쪽에서 쓴다
 * (2026-11-12, 독립 점검 ⑦).
 *
 * 문자열 자체는 고치지 않는다 — 짝이 맞지 않는 별표는 별표만 지우고 글은 그대로 둔다.
 */
export default function BoldText({
  text,
  className = "font-semibold text-slate-800",
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split("**");
  if (parts.length % 2 === 0) return <>{parts.join("")}</>;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className={className}>
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}
