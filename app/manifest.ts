import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

/**
 * Next.js가 app/manifest.ts를 자동으로 /manifest.webmanifest로 내보내고
 * <link rel="manifest">도 알아서 <head>에 넣어준다.
 *
 * icon-192.png/icon-512.png는 favicon.ico·apple-icon.png와 달리 Next.js
 * 파일 컨벤션 이름(icon.png)이 아니라서 자동 인식되지 않고, layout.tsx의
 * metadata.icons에 넣어도 favicon.ico 파일 컨벤션이 우선 적용되면서 통째로
 * 무시된다(실제로 렌더링해서 <head>를 확인해 보니 그랬다). 두 파일은 PWA
 * 매니페스트용(홈 화면에 추가 시 아이콘)으로 만들어진 크기라 여기서 쓴다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
