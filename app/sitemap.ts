import type { MetadataRoute } from "next";
import { hospitals } from "@/lib/hospitals";
import { detailPath, isIndexable } from "@/lib/detailPages";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // 병원 상세 페이지. lastModified는 그 병원 정보를 마지막으로 확인한 날짜다
  // (빌드 시각을 넣으면 내용이 안 바뀌어도 매번 갱신된 것처럼 보인다).
  // 검진 정보가 전부 비어 noindex인 페이지는 넣지 않는다(기준은 isIndexable 하나).
  const detailPages: MetadataRoute.Sitemap = hospitals.filter(isIndexable).map((h) => ({
    url: `${SITE_URL}${detailPath(h.id)}`,
    lastModified: h.verifiedAt ? new Date(h.verifiedAt) : undefined,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...detailPages,
  ];
}
