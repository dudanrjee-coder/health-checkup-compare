import type { MetadataRoute } from "next";
import { hospitals } from "@/lib/hospitals";
import { detailPath, isIndexable } from "@/lib/detailPages";
import { sidosWithHospitals } from "@/lib/regionStats";
import { sidoPath } from "@/lib/sidoSlugs";
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
    {
      url: `${SITE_URL}/guide`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // 병원 찾기: 전국 시·도 목록과 병원이 있는 시·도 페이지 전부
    {
      url: `${SITE_URL}/hospitals`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...sidosWithHospitals().map((sido) => ({
      url: `${SITE_URL}${sidoPath(sido)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...detailPages,
  ];
}
