import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

/**
 * Next.js가 app/manifest.ts를 자동으로 /manifest.webmanifest로 내보내고
 * <link rel="manifest">도 알아서 <head>에 넣어준다.
 *
 * 예전 PWA 전용 icon-192.png/icon-512.png는 삭제했고, 홈 화면에 추가 시
 * 아이콘은 Next.js 파일 컨벤션으로 /apple-icon.png에 서빙되는
 * app/apple-icon.png(180x180)를 같이 쓴다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    icons: [
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
