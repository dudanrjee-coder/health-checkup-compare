/**
 * data/hospitals.json 의 병원 좌표(lat/lng)를 Nominatim(OpenStreetMap)으로 채운다.
 *
 * 실행: node scripts/geocode.mjs
 *
 * 규칙
 * - 이미 lat/lng 이 있는 병원은 건너뛴다(캐싱). 즉 이 스크립트를 다시 돌려도
 *   새로 추가된 병원만 API를 호출한다. 강제로 다시 받으려면 --force 를 준다.
 * - Nominatim 이용 정책상 요청 간 1초 이상 간격을 두고, User-Agent 를 명시한다.
 * - 좌표가 해당 시/도 범위를 벗어나면 잘못 매칭된 것으로 보고 저장하지 않는다.
 *
 * 검색어는 각 병원 공식 홈페이지에서 확인한 주소를 아래 QUERIES 에 적어둔다.
 * (hospitals.json 에는 주소 필드를 두지 않으므로 조회용 입력만 여기서 관리)
 *
 * 값은 문자열 하나 또는 후보 배열로 적을 수 있고, 배열이면 앞에서부터 시도한다.
 * 도로명 주소만으로는 건물이 아니라 도로 전체가 잡히는 경우가 있어, 그럴 때는
 * 정식 병원명을 앞 후보로 둔다.
 */
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

const HOSPITALS_PATH = new URL("../data/hospitals.json", import.meta.url);
const USER_AGENT = "health-checkup-compare/0.1 (geocoding for static hospital list)";
const REQUEST_INTERVAL_MS = 1100;

/** 병원 id -> 검색어(문자열 또는 후보 배열, 앞에서부터 시도) */
const QUERIES = {
  // 2026-09-08 충북 tier=병원 1차 배치.
  "eumseong-ingok-jaeae-hospital": ["인곡자애병원", "충청북도 음성군 맹동면 꽃동네길 37"],
  "chungju-kimnkwon-hospital": ["김앤권병원 충주", "충북 충주시 번영대로 239"],
  "cheongju-dana-womens-hospital": ["다나여성병원 청주", "충청북도 청주시 청원구 충청대로 179"],
  "cheongju-motaean-womens-hospital": ["모태안여성병원", "충청북도 청주시 서원구 복대로17번길 57"],
  "cheongju-ppuri-hospital": ["뿌리병원 청주", "충청북도 청주시 청원구 내덕로 56"],
  // 2026-09-08 충북 tier=병원 2차 배치.
  "cheongju-saebit-hospital": ["새빛병원 청주", "충북 청주시 서원구 서부로 1350"],
  "cheongju-cnc-pureun-hospital": ["씨엔씨푸른병원", "충청북도 청주시 흥덕구 2순환로 1234"],
  "cheongju-ochang-jungang-hospital": ["오창중앙병원", "충청북도 청주시 청원구 오창읍 중부로 683"],
  "cheongju-wellness-childrens-hospital": ["웰니스어린이병원", "충북 청주시 상당구 방서동", "충북 청주시 상당구 2순환로"],
  "goesan-sungmo-hospital": ["괴산성모병원", "충북 괴산군 괴산읍 임꺽정로 116"],
  // 2026-09-08 충북 tier=병원 3차 배치.
  "cheongju-ochang-hosu-hospital": ["오창호수병원", "충청북도 청주시 청원구 오창읍"],
  "goesan-seobu-hospital": ["괴산서부병원", "충청북도 괴산군 괴산읍 읍내로 259"],
  "cheongju-micro-hospital": ["마이크로병원 청주", "충북 청주시 흥덕구 사직대로 26"],
  "boeun-hanyang-hospital": ["보은한양병원", "충북 보은군 보은읍"],
  "yeongdong-hospital": ["영동병원 충북", "충청북도 영동군 영동읍 대학로 106"],
  // 2026-09-08 충북 tier=병원 4차 배치.
  "eumseong-jeilgoeun-hospital": ["제일조은병원", "충청북도 음성군 금왕읍"],
  "cheongju-kimsookja-childrens-hospital": ["김숙자소아청소년병원", "충청북도 청주시 흥덕구 직지대로 745"],
  "jincheon-hyuksin-sungmo-hospital": ["혁신성모병원 진천", "충청북도 진천군 덕산읍"],
  "cheongju-goodnews-hospital": ["청주복음병원", "충북 청주시 서원구 사직대로 160"],
  "jecheon-sungji-hospital": ["제천성지병원", "충북 제천시 의림대로 284"],
  // 2026-09-08 충북 tier=병원 5차(마지막) 배치.
  "cheongju-samsung-hospital": ["청주삼성병원", "충청북도 청주시 서원구 청남로 2014"],
  "cheongju-prime-hospital": ["청주프라임병원", "충북 청주시 흥덕구 짐대로72번길 37"],
  "cheongju-hyundai-hospital": ["청주현대병원", "충북 청주시 흥덕구 비하동"],
  "cheongju-chello-hospital": ["첼로병원 청주", "충북 청주시 청원구 내덕동"],
  "chungju-mirae-hospital": ["충주미래병원", "충북 충주시 국원대로 99"],
  // 2026-09-08 충북 tier=병원 보류 목록 재조사(1곳, 아이웰어린이병원).
  // 병원 건물 POI, 도로명 지번(주성로 273) 모두 Nominatim에 없어 법정동(주성동) 중심점을 쓴다.
  "cheongju-iwell-childrens-hospital": ["아이웰어린이병원", "충북 청주시 청원구 주성로 273", "충북 청주시 청원구 주성동"],
  // 2026-09-09 충북 tier=병원 보류 목록 재조사(2곳째, 마이크로재활병원 — 마이크로병원과 같은 건물).
  "cheongju-micro-rehab-hospital": ["마이크로재활병원 청주", "충북 청주시 흥덕구 사직대로 26"],
  // 2026-09-09 청주한국병원(종합병원 등급 확인 후 등록).
  "cheongju-hankook-hospital": ["청주한국병원", "충청북도 청주시 상당구 단재로 106"],
  // 2026-09-08 강원 tier=병원 1차 배치.
  "gangwon-rehabilitation-hospital": ["강원특별자치도재활병원", "강원특별자치도 춘천시 충열로142번길 24-16"],
  "jeongseon-comwel-hospital": ["근로복지공단 정선병원", "강원특별자치도 정선군 정선읍 봉양1길 145"],
  // 2026-09-08 강원 tier=병원 2차 배치.
  "yanggu-baekdu-hospital": ["백두병원 양구", "강원특별자치도 양구군 양구읍 금강산로 510"],
  "wonju-bonebest-hospital": ["본베스트병원", "강원특별자치도 원주시 능라동길 51"],
  "samcheok-goodneighbor-hospital": ["선한이웃병원 삼척", "강원특별자치도 삼척시 오십천로 506"],
  "taebaek-shin-hospital": ["신태백병원", "강원특별자치도 태백시 황지로 23"],
  "wonju-yonsei-mediheim-hospital": ["연세메디하임병원", "강원특별자치도 원주시 문막읍 원문로 1419"],
  // 2026-09-08 강원 tier=병원 3차 배치.
  "wonju-boolo-hospital": ["원주불로병원", "강원도 원주시 원일로 218"],
  "wonju-jyhospital": ["원주성모병원", "강원도 원주시 소초면 치악로 2473"],
  "wonju-centum-hospital": ["원주센텀병원", "강원도 원주시 능라동길 70"],
  "wonju-yonsei-hospital": ["원주연세병원", "강원 원주시 원일로 230"],
  // 도로명 "북원로"가 우산동(시내)~귀래면(외곽)까지 길게 이어져 있어 지번 없이 도로명만
  // 쓰면 먼 지점(귀래면)이 잡힌다. 법정동(우산동)을 붙여 정확도를 높인다.
  "wonju-woori-hospital": ["원주우리병원", "강원특별자치도 원주시 우산동 북원로 2572", "강원특별자치도 원주시 북원로 2572"],
  // 2026-09-08 강원 tier=병원 4차 배치.
  "wonju-catholic-hospital": ["원주카톨릭병원", "강원도 원주시 학성동 남산로 199"],
  "wonju-prime-hospital": ["원주프라임병원", "강원특별자치도 원주시 개운동 452-3"],
  "yanggu-seongsim-hospital": ["양구성심병원", "강원도 양구군 양구읍 중심로 160"],
  "wonju-sungji-hospital": ["원주성지병원", "강원도 원주시 인동 원일로 22"],
  "yanggu-woori-hospital": ["양구우리병원", "강원특별자치도 양구군 양구읍 양구새싹로 7-7"],
  // 2026-09-08 강원 tier=병원 5차 배치.
  "wonju-samsan-hospital": ["삼산병원 원주", "강원특별자치도 원주시 혁신로 5"],
  "chuncheon-insung-hospital": ["인성병원 춘천", "강원도 춘천시 금강로 39"],
  "inje-korea-hospital": ["인제고려병원", "강원특별자치도 인제군 인제읍 비봉로 19"],
  "jeongseon-county-hospital": ["정선군립병원", "강원특별자치도 정선군 사북읍 지장천로 727"],
  "cheorwon-hospital": ["철원병원", "강원특별자치도 철원군 갈말읍 명성로 208"],
  // 2026-09-08 강원 tier=병원 6차(마지막) 배치.
  "wonju-central-hospital": ["원주센트럴병원", "강원도 원주시 백간길 95"],
  "wonju-hyundai-central-hospital": ["현대중앙병원 원주", "강원도 원주시 우산동"],
  "hoengseong-daesung-hospital": ["횡성대성병원", "횡성로 275", "강원도 횡성군 횡성읍"],
  "yeongwol-pureunsarang-hospital": ["푸른사랑병원 영월", "강원특별자치도 영월군 영월읍 중앙로 10"],
  // 2026-09-08 강원 tier=병원 7차(누락분 보완) 배치.
  "wonju-jung-hospital": ["정병원 원주", "강원도 원주시 원문로 141"],
  "wonju-yonsei-myungin-hospital": ["연세명인병원", "강원특별자치도 원주시 평원로 100"],
  // 2026-08-23 서울 중랑구 3곳 등록분(38번 항목).
  "seoul-green": ["녹색병원 중랑구", "서울특별시 중랑구 사가정로49길 53"],
  // "서울의료원"만 쓰면 서울특별시 산하 다른 의료 시설이 잡힐 수 있어 법정동을 붙인다.
  "seoul-medical-center": [
    "서울의료원 신내동",
    "서울특별시 중랑구 신내로 156",
  ],
  "seoul-dongbu-jeil": ["동부제일병원", "서울특별시 중랑구 망우로 511"],
  // 2026-08-23 서울 종로구 2곳 등록분(37번 항목).
  // "서울적십자병원"은 인천·상주·통영 등 같은 이름의 다른 지역 병원과 섞이지 않도록 정식명을 먼저 쓴다.
  "seoul-redcross": ["서울적십자병원", "서울특별시 종로구 새문안로 9"],
  "seoul-seran": ["세란병원", "서울특별시 종로구 통일로 256"],
  // 2026-08-23 서울 양천구 2곳 등록분(36번 항목).
  "seoul-hongik": ["홍익병원 양천구", "서울특별시 양천구 목동로 225"],
  "seoul-seonam": [
    "서울특별시서남병원",
    "서남병원 양천구",
    "서울특별시 양천구 신정이펜1로 20",
  ],
  // 2026-08-23 서울 강서구 2곳 등록분(35번 항목).
  "seoul-mizmedi": ["미즈메디병원", "서울특별시 강서구 강서로 295"],
  // "부민병원"만 쓰면 부산 계열 동명 병원이 잡히므로 자치구를 붙인다.
  "seoul-bumin": ["서울부민병원", "부민병원 강서구", "서울특별시 강서구 공항대로 389"],
  // 2026-08-23 서울 동대문구 2곳 등록분(34번 항목).
  // "서울성심병원"은 한강·강남·강동·구로·청구성심병원과 이름이 비슷해 자치구를 붙인다.
  "seoul-sungsim": ["서울성심병원 동대문구", "서울특별시 동대문구 왕산로 259"],
  // 정식명·주소 어느 쪽으로 조회해도 같은 부지의 **아라마크(주)서울동부병원장례식장**이 먼저 잡힌다.
  // 한양대학교병원(편의점)·보라매병원(대관업체)에 이은 세 번째 POI 오매칭이라 통칭을 쓴다.
  "seoul-dongbu": [
    "서울시동부병원",
    "동부병원 동대문구 서울",
    "서울특별시 동대문구 무학로 124 동부병원",
  ],
  // 2026-08-23 서울 영등포구 3곳 등록분(33번 항목).
  "seoul-daerim-sungmo": ["대림성모병원", "서울특별시 영등포구 시흥대로 657"],
  "seoul-myongji-sungmo": ["명지성모병원", "서울특별시 영등포구 도림로 156"],
  // "성애병원"만으로는 광명성애병원 등 같은 재단의 다른 병원이 잡힐 수 있어 자치구를 붙인다.
  "seoul-sungae": [
    "성애병원 영등포구",
    "서울특별시 영등포구 여의대방로53길 22",
  ],
  // 2026-08-23 서울 상급종합병원 10곳 등록분(30번 항목).
  // 대학병원은 정식명으로 조회하면 병원 건물이 아니라 **대학 캠퍼스**가 잡히는 일이 많아
  // 자치구나 법정동을 붙인 병원명을 첫 후보로 둔다.
  "seoul-kangbuk-samsung": [
    "강북삼성병원",
    "서울특별시 종로구 새문안로 29",
  ],
  "seoul-konkuk-univ": [
    "건국대학교병원 광진구",
    "서울특별시 광진구 능동로 120-1",
  ],
  "seoul-kyunghee-univ": [
    "경희대학교병원 동대문구",
    "서울특별시 동대문구 경희대로 23",
  ],
  // OSM 등록명이 "고려대학교구로병원"이라 띄어쓰기가 있는 우리 표기로는 안 잡힐 수 있다.
  "seoul-korea-guro": [
    "고려대학교구로병원",
    "고대구로병원",
    "서울특별시 구로구 구로동로 148",
  ],
  "seoul-samsung-medical": [
    "삼성서울병원",
    "서울특별시 강남구 일원로 81",
  ],
  "seoul-gangnam-severance": [
    "강남세브란스병원",
    "서울특별시 강남구 언주로 211",
  ],
  "seoul-asan": ["서울아산병원", "서울특별시 송파구 올림픽로43길 88"],
  // OSM 등록명은 통칭인 "이대목동병원"이라 정식명(이화여자대학교 목동병원)으로는 잡히지 않는다.
  "seoul-ewha-mokdong": [
    "이대목동병원",
    "서울특별시 양천구 안양천로 1071",
  ],
  "seoul-chungang-univ": [
    "중앙대학교병원 흑석동",
    "서울특별시 동작구 흑석로 102",
  ],
  // 주소로 조회하면 같은 번지의 **세븐일레븐 한양대학교병원점**(편의점 POI)이 먼저 잡힌다.
  // 보라매병원이 "플로렌스 파티하우스"에 잡혔던 것과 같은 유형이라 병원명만 쓴다.
  "seoul-hanyang-univ": ["한양대학교병원", "한양대병원 사근동"],
  // 2026-08-22 서울 후보 1곳 자치구 10곳 전수 조사분.
  // 9호선 중앙보훈병원역과 이름이 같아 병원명을 먼저 쓰면 역이 잡힌다. 주소를 첫 후보로 둔다.
  "seoul-jungang-bohun": [
    "서울특별시 강동구 진황도로61길 53",
    "중앙보훈병원 강동구",
  ],
  // 대한병원은 전국에 흔한 이름이라 주소만 쓴다.
  // 주소만 쓰면 건물이 아니라 도봉로(도로)가 잡히고 동도 수유동이 아닌 미아동으로 나온다.
  "seoul-daehan": ["대한병원 수유동", "대한병원 강북구"],
  "seoul-hyemin": ["혜민병원 광진구", "서울특별시 광진구 자양로 85"],
  "seoul-guro-sungsim": ["구로성심병원", "서울특별시 구로구 경인로 427"],
  "seoul-heemyoung": ["희명병원 금천구", "서울특별시 금천구 시흥대로 244"],
  "seoul-atomic": ["원자력병원 노원구", "서울특별시 노원구 노원로 75"],
  // 신림선 보라매병원역과 이름이 겹쳐 주소를 첫 후보로 둔다. 주소는 검진센터가 있는 전문건설회관이다.
  "seoul-boramae": [
    // 검진센터 주소(전문건설회관)로 조회하면 같은 건물의 파티 대관업체가 먼저 잡힌다.
    "서울특별시보라매병원",
    "보라매병원 동작구",
  ],
  "seoul-dongshin": ["동신병원 서대문구", "서울특별시 서대문구 연희로 272"],
  "seoul-geumgang-asan": ["금강아산병원", "서울특별시 용산구 이촌로 318"],
  "seoul-nmc": ["국립중앙의료원", "서울특별시 중구 을지로 245"],
  "daejeon-chungnam-univ": "대전광역시 중구 문화로 282",
  "daejeon-konyang-univ": "대전광역시 서구 관저동로 158",
  "daejeon-eulji-univ": "대전광역시 서구 둔산서로 95",
  "seoul-eulji-nowon": "서울특별시 노원구 한글비석로 68",
  "seoul-eulji-gangnam": "서울특별시 강남구 도산대로 202",
  "gyeonggi-eulji-uijeongbu": "경기도 의정부시 동일로 712",
  "daegu-yeungnam": "대구광역시 남구 현충로 170",
  "daegu-medical-center": ["대구의료원", "대구광역시 서구 평리로 157"],
  "daegu-catholic": "대구광역시 남구 두류공원로17길 33",
  // 주소만으로는 대흥로(도로)가 잡혀서 병원명을 먼저 시도한다.
  "daejeon-catholic-daejeon-st-marys": [
    "가톨릭대학교 대전성모병원",
    "대전광역시 중구 대흥로 64",
  ],
  "seoul-severance": ["세브란스병원", "서울특별시 서대문구 연세로 50-1"],
  "seoul-korea-anam": [
    "고려대학교 안암병원",
    "서울특별시 성북구 고려대로 73",
  ],
  "seoul-catholic-seoul-st-marys": [
    "가톨릭대학교 서울성모병원",
    "서울특별시 서초구 반포대로 222",
  ],
  "busan-inje-paik": [
    "인제대학교 부산백병원",
    "부산광역시 부산진구 복지로 75",
  ],
  "busan-donga": ["동아대학교병원", "부산광역시 서구 대신공원로 26"],
  "busan-pnu": ["부산대학교병원", "부산광역시 서구 구덕로 179"],
  "seoul-snu": ["서울대학교병원", "서울특별시 종로구 대학로 101"],
  "gyeonggi-snubh": [
    "분당서울대학교병원",
    "경기도 성남시 분당구 구미로173번길 82",
  ],
  "daegu-knu": ["경북대학교병원", "대구광역시 중구 동덕로 130"],
  "daegu-keimyung-dongsan": [
    "계명대학교 동산병원",
    "대구광역시 달서구 달구벌대로 1035",
  ],
  // 정식 명칭으로는 도로만 잡혀서 통용 명칭을 첫 후보로 둔다.
  "incheon-inha": ["인하대병원", "인천광역시 제물포구 인항로 27"],
  // 건강증진센터가 암센터 13층에 있어 암센터 건물 좌표를 쓴다.
  "incheon-gachon-gil": ["가천대길병원 암센터", "가천대길병원"],
  "gwangju-jnu": ["전남대학교병원", "광주광역시 동구 제봉로 42"],
  "gwangju-chosun": ["조선대학교병원", "광주광역시 동구 필문대로 365"],
  "ulsan-uuh": ["울산대학교병원", "울산광역시 동구 대학병원로 25"],
  "sejong-cnush": ["세종충남대학교병원", "세종특별자치시 보듬7로 20"],
  // "대전선병원"·주소로는 결과가 없거나 도로/버스정류장(같은 이름의 511번 정류장)이
  // 먼저 잡힌다. "선병원 대전"이라야 amenity=hospital 노드가 첫 결과로 나온다.
  "sejong-nk": ["엔케이세종병원", "세종특별자치시 한누리대로 161"],
  "ulsan-donggang": ["동강병원", "울산광역시 중구 태화로 239"],
  "gwangju-christian": ["광주기독병원", "광주광역시 남구 양림로 37"],
  "incheon-naeun": ["나은병원", "인천광역시 서구 원적로 23"],
  "incheon-sarang": ["인천사랑병원", "인천광역시 미추홀구 미추홀대로 726"],
  // 2026-08-21 인천 전수 조사분.
  "incheon-medical-center": ["인천광역시의료원", "인천광역시 동구 방축로 217"],
  "incheon-christian": ["인천기독병원", "인천광역시 중구 답동로30번길 10"],
  // "incheon-paik"(인천백병원)은 일부러 등록하지 않는다. Nominatim에 병원 노드가 없고
  // "백병원 인천"으로는 같은 이름의 **버스정류장**(백병원(송림패션몰), 염전로40번길)만 나온다.
  // 도로명으로 조회하면 건물이 아니라 샛골로(도로)가 잡히는데 인천광역시 범위 안이라
  // SIDO_BOUNDS 검사도 통과해 버린다. 창원파티마병원·근로복지공단 대전병원과 같은 처리로
  // 좌표를 비우고 카드로만 노출한다.
  // OSM 등록명이 "유비스병원"이라 정식명으로는 독배로(도로)만 잡힌다.
  "incheon-uvis": ["유비스병원 인천", "인천광역시 미추홀구 독배로 503"],
  "incheon-nasaret": ["나사렛국제병원", "인천광역시 연수구 먼우금로 98"],
  "incheon-redcross": ["인천적십자병원", "인천광역시 연수구 원인재로 263"],
  "incheon-hallym": ["한림병원 인천", "인천광역시 계양구 장제로 722"],
  // "incheon-sejong"(인천세종병원)도 등록하지 않는다. Nominatim에 병원 노드가 없고
  // "세종병원 인천 계양"으로는 tourism=artwork("세종병원 조각품")만 나온다. 도로명으로는
  // 계양문화로(도로)가 잡힌다. 같은 재단의 부천세종병원이 OSM 등록명 "세종병원"으로
  // 잡히는 것과 달리 인천세종병원은 노드 자체가 없다.
  // OSM 등록명이 "성민병원"이라 정식명으로는 잡히지 않는다(온병원·문화병원·센텀병원·강남병원과 같은 패턴).
  "incheon-new-sungmin": ["성민병원 인천", "뉴성민병원", "인천광역시 서구 신석로 70"],
  "incheon-geomdan-top": ["검단탑병원", "인천광역시 서구 청마로19번길 5"],
  "incheon-onnuri": ["온누리병원 검단", "인천광역시 서구 완정로 199"],
  "incheon-bs": ["비에스종합병원", "인천광역시 강화군 강화읍 충렬사로 31"],
  "incheon-himchan": ["인천힘찬종합병원", "인천광역시 남동구 논현로 72"],
  "incheon-bupyeong-serim": ["부평세림병원", "인천광역시 부평구 부평대로 175"],
  "incheon-comwel": ["근로복지공단 인천병원", "인천광역시 부평구 무네미로 446"],
  // 2026-08-21 광주 전수 조사분. 주소 후보는 Nominatim 인식률을 위해 옛 표기(광주광역시)를 쓴다.
  "gwangju-suwan": ["광주수완병원", "광주광역시 광산구 임방울대로 370"],
  "gwangju-singa": ["신가병원 광주", "광주광역시 광산구 목련로 316"],
  // "gwangju-cheomdan"(첨단종합병원)은 일부러 등록하지 않는다. Nominatim에 병원 노드가 없고
  // 도로명으로 조회하면 건물이 아니라 첨단중앙로170번길(도로)이 잡히는데 광주 범위 안이라
  // SIDO_BOUNDS 검사도 통과해 버린다.
  "gwangju-hanam-sungshim": ["하남성심병원", "광주광역시 광산구 용아로 259"],
  // "gwangju-ks"(KS병원)도 등록하지 않는다. Nominatim에 광주 KS병원 노드가 없고
  // "KS병원"으로 조회하면 **서울 강남구의 동명 KS병원**이 잡힌다. 도로명으로는 왕버들로(도로)만 나온다.
  "gwangju-central": ["광주센트럴병원", "광주광역시 광산구 수완로 6"],
  "gwangju-city": ["광주씨티병원", "광주광역시 남구 서문대로654번길 5"],
  "gwangju-donga": ["동아병원 광주", "광주광역시 남구 대남대로 238"],
  // "광주병원"만으로는 같은 이름의 버스정류장(동문대로)이 첫 결과로 나온다.
  "gwangju-gwangju-hosp": ["광주병원 두암동", "광주광역시 북구 면앙로139번길 51"],
  // OSM 등록명이 "일곡병원"이라 정식명으로는 양일로(도로)만 잡힌다.
  "gwangju-ilgok": ["일곡병원 광주", "광주광역시 북구 양일로 309"],
  "gwangju-hyundae": ["광주현대병원", "광주광역시 북구 설죽로 291"],
  // "광주희망병원"만으로는 동구 소태동의 동명 병원이 첫 결과로 나온다(공식 주소는 북구 용두동).
  "gwangju-heemang": ["광주희망병원 용두동", "광주광역시 북구 하서로 429"],
  "gwangju-unam-hanguk": ["운암한국병원", "광주광역시 북구 북문대로 191"],
  "gwangju-happyview": ["해피뷰병원", "광주광역시 북구 경열로 216"],
  "gwangju-hanguk": ["광주한국병원", "광주광역시 서구 월드컵4강로 223"],
  "gwangju-mirae21": ["미래로21병원", "광주광역시 서구 화운로 1"],
  "gwangju-sangmoo": ["상무병원 광주", "광주광역시 서구 상무자유로 181-7"],
  "gwangju-seogwang": ["서광병원 광주", "광주광역시 서구 금화로59번길 6"],
  // 2026-08-21 서울 서초구 전수 조사분.
  "seoul-gibbeum": ["기쁨병원 서초", "서울특별시 서초구 서초중앙로 4"],
  // 2026-08-21 서울 은평구 전수 조사분.
  "seoul-cheonggu-sungsim": ["청구성심병원", "서울특별시 은평구 통일로 873"],
  // 2026-08-21 서울 송파구 전수 조사분.
  "seoul-police": ["경찰병원 송파", "국립경찰병원", "서울특별시 송파구 송이로 123"],
  "daegu-fatima": ["대구파티마병원", "대구광역시 동구 아양로 99"],
  "seoul-sahmyook": ["삼육서울병원", "서울특별시 동대문구 망우로 82"],
  "seoul-hplus-yangji": [
    "에이치플러스 양지병원",
    "서울특별시 관악구 남부순환로 1636",
  ],
  "seoul-hanil": ["한일병원", "서울특별시 도봉구 우이천로 308"],
  "busan-good-samsun": ["좋은삼선병원", "부산광역시 사상구 가야대로 326"],
  "busan-samyook": ["삼육부산병원", "부산광역시 서구 대티로 170"],
  "daejeon-sun": ["선병원 대전", "대전광역시 중구 목중로 29"],
  "daejeon-yuseong-sun": ["유성선병원", "대전광역시 유성구 북유성대로 93"],
  "daejeon-hankook": ["대전한국병원", "대전광역시 동구 동서대로 1672"],
  "gyeonggi-ajou": ["아주대학교병원", "경기도 수원시 영통구 월드컵로 164"],
  "busan-dongeui": ["동의병원 부산", "부산광역시 부산진구 양정로 62"],
  // 2026-08-20 대구 일반종합병원 전수 조사분.
  // "daegu-dream"은 일부러 등록하지 않는다. Nominatim에 드림종합병원 노드가 없고
  // ("드림병원 대구 남구", "대구드림종합병원", "드림종합병원 대명동" 모두 결과 없음),
  // 도로명으로 조회하면 대명로(도로, 우편번호 42481)가 잡혀 공식 42474와 어긋난다.
  // 창원파티마병원·근로복지공단 대전병원과 같은 처리로 좌표를 비워 둔다.
  // "구병원"만으로 조회하면 "구병원건너"·"구병원앞" 버스정류장이 먼저 잡힌다.
  // 법정동을 붙인 "구병원 감삼동"으로도 조회 순서가 매번 같지 않아 정류장이 나올 때가
  // 있어서, OSM이 이 병원에 적어 둔 도로명 "감삼길"을 붙였다. 이 검색어는 limit=1에서도
  // healthcare=hospital 노드가 나오는 것을 확인했다.
  "daegu-koo": ["구병원 감삼길"],
  "daegu-bohun": ["대구보훈병원", "대구광역시 달서구 월곡로 60"],
  // 2026-08-20 울산 일반종합병원 전수 조사분.
  "ulsan-good-samjeong": ["좋은삼정병원", "울산광역시 남구 북부순환도로 51"],
  // 2026-08-20 검진센터 재조사로 추가한 대구·울산 일반종합병원.
  "daegu-samil": ["삼일병원 대구", "대구광역시 달서구 월배로 436"],
  // "daegu-kwak"은 일부러 등록하지 않는다. Nominatim에 곽병원 노드가 없고
  // ("곽병원 수동"·"곽병원 중구 대구"·"대구곽병원" 모두 결과 없음), 도로명으로 조회하면
  // 국채보상로(도로, 동인동4가)가 잡혀 공식 주소(수동)와 법정동이 다르다.
  // OSM 등록명이 "강남병원"이라 "강남종합병원"으로는 도로(동촌로)만 잡힌다.
  "daegu-gangnam": ["강남병원 대구 동구"],
  // "daegu-cheonju-seongsam"도 노드가 없어 등록하지 않는다. 도로명으로 조회하면
  // 달구벌대로(도로, 이천동)가 잡혀 공식 주소(신매동)와 법정동이 다르다.
  "ulsan-joongang": ["울산중앙병원", "울산광역시 남구 문수로 472"],
  "ulsan-city": ["울산시티병원", "울산광역시 북구 산업로 1007"],
  // 2026-08-20 부산 일반종합병원 전수 마무리분.
  // OSM 등록명이 "문화병원"이라 "좋은문화병원"으로는 결과가 없고, 도로명으로 조회하면
  // 범일로(도로)가 잡힌다. 온종합병원(OSM명 "온병원")과 같은 패턴이다.
  "busan-good-moonhwa": ["문화병원 부산 동구"],
  "busan-dongrae-bongseng": [
    "동래봉생병원",
    "부산광역시 동래구 안연로109번길 27",
  ],
  // OSM 등록명이 "센텀병원"이라 "센텀종합병원"으로는 결과가 없고, 도로명으로 조회하면
  // 수영로679번길(도로)이 잡힌다.
  "busan-centum": ["센텀병원 수영구"],
  "busan-medical-center": [
    "부산광역시의료원",
    "부산광역시 연제구 월드컵대로 359",
  ],
  "busan-bohun": ["부산보훈병원", "부산광역시 사상구 백양대로 420"],
  // 2026-08-20 부산 일반종합병원 보강분.
  "busan-good-gangan": ["좋은강안병원", "부산광역시 수영구 수영로 493"],
  // 검진센터는 서면 온병원빌딩에 따로 있지만 좌표는 본원(당감동) 기준으로 잡는다.
  "busan-on": ["온종합병원", "부산광역시 부산진구 가야대로 721"],
  "busan-daedong": ["대동병원 부산", "부산광역시 동래구 충렬대로 187"],
  "busan-sungmo": ["부산성모병원", "부산광역시 남구 용호로232번길 25-14"],
  "busan-maryknoll": ["메리놀병원", "부산광역시 중구 중구로 121"],
  // 2026-08-20 대전 일반종합병원 보강분.
  "daejeon-daecheong": ["대청병원 대전", "대전광역시 서구 계백로 1322"],
  "daejeon-bohun": ["대전보훈병원", "대전광역시 대덕구 대청로82번길 147"],
  // "daejeon-comwel"도 창원파티마병원과 같은 이유로 일부러 등록하지 않는다.
  // Nominatim에 병원 건물(amenity=hospital) 노드가 없고 같은 이름의 **버스정류장**
  // (중리북로, 법1동)만 있다. 도로명으로 조회하면 계족로의 다른 구간(읍내동, 우편번호
  // 34356)이 잡히는데 공식 주소의 34384와 다르고 실제 위치에서 약 1.4km 떨어져 있다.
  // 대전광역시 범위 안이라 SIDO_BOUNDS 검사는 통과하므로 검색어를 비워 두어 건너뛴다.
  // 2026-08-20 전국 확장 마무리분(8개 도 일반종합병원).
  "gangwon-gangneung-asan": [
    "강릉아산병원",
    "강원특별자치도 강릉시 사천면 방동길 38",
  ],
  "chungbuk-cheongju-hana": [
    "하나병원 청주",
    "충청북도 청주시 흥덕구 2순환로 1262",
  ],
  "chungnam-cheonan-chungmu": [
    "천안충무병원",
    "충청남도 천안시 서북구 다가말3길 8",
  ],
  "jeonbuk-jeonju-jesus": ["예수병원 전주", "전북 전주시 완산구 서원로 365"],
  // 전남광주통합특별시는 Nominatim이 아직 모를 수 있어 옛 지명(전라남도 순천시)으로 조회한다.
  "jeonnam-suncheon-carollo": ["성가롤로병원", "전라남도 순천시 순광로 221"],
  "gyeongbuk-andong": ["안동병원", "경상북도 안동시 앙실로 11"],
  // "gyeongnam-changwon-fatima"은 일부러 등록하지 않는다.
  // Nominatim에 창원파티마병원 건물(amenity=hospital) 노드가 없고, 같은 이름의
  // **버스정류장 2곳**(창이대로·사화로)만 있다. 도로명으로 조회하면 창이대로의
  // 엉뚱한 구간(성산구 신월동 일대, 병원에서 동쪽으로 약 4km)이 잡히는데
  // 경상남도 범위 안이라 SIDO_BOUNDS 검사도 통과해 버린다.
  // 검색어를 등록하면 그 잘못된 좌표가 저장되므로 비워 두어 "검색어 미등록, 건너뜀"으로
  // 두고, 지도 마커 없이 카드로만 노출한다. OSM에 병원 노드가 생기면 그때 추가할 것.
  "jeju-halla": ["제주한라병원", "제주특별자치도 제주시 도령로 65"],
  "gyeonggi-bundang-jesaeng": [
    "분당제생병원",
    "경기도 성남시 분당구 서현로180번길 20",
  ],
  "gyeonggi-dongsuwon": ["동수원병원", "경기도 수원시 팔달구 중부대로 165"],
  // "부천세종병원"은 Nominatim에 결과가 없고, 도로명 주소로 조회하면 건물이 아니라
  // 호현로489번길(도로)이 잡힌다. OSM 등록명이 "세종병원"이라 "세종병원 부천"이어야
  // amenity=hospital 노드가 나온다. (OSM은 이 건물의 도로를 경인로324번길로 적어 두었지만
  // 우편번호·법정동은 공식 주소와 같다. 6번 규칙대로 address는 공식 표기를 그대로 둔다.)
  "gyeonggi-bucheon-sejong": [
    "세종병원 부천",
    "경기도 부천시 소사구 호현로489번길 28",
  ],
  // 정식 명칭으로는 검색 결과가 없어 통용 명칭을 첫 후보로 둔다.
  "gyeonggi-korea-ansan": [
    "고대안산병원",
    "고려대학교안산병원",
    "경기도 안산시 단원구 적금로 123",
  ],
  "gangwon-knu": ["강원대학교병원", "강원특별자치도 춘천시 백령로 156"],
  "gangwon-wonju-severance": [
    "원주세브란스기독병원",
    "강원특별자치도 원주시 일산로 20",
  ],
  "chungbuk-cbnu": ["충북대학교병원", "충청북도 청주시 서원구 1순환로 776"],
  "chungnam-dankook": ["단국대학교병원", "충청남도 천안시 동남구 망향로 201"],
  "jeonbuk-jbnu": ["전북대학교병원", "전북특별자치도 전주시 덕진구 건지로 20"],
  "jeonbuk-wonkwang": ["원광대학교병원", "전북특별자치도 익산시 무왕로 895"],
  "jeonnam-hwasun-cnu": [
    "화순전남대학교병원",
    "전라남도 화순군 화순읍 서양로 322",
  ],
  "gyeongbuk-dongguk-gyeongju": [
    "동국대학교경주병원",
    "경상북도 경주시 동대로 87",
  ],
  "gyeongbuk-schmc-gumi": [
    "순천향대학교부속구미병원",
    "경상북도 구미시 1공단로 179",
  ],
  "seoul-schmc": ["순천향대학교서울병원", "서울특별시 용산구 대사관로 59"],
  "chungnam-schmc-cheonan": [
    "순천향대학교천안병원",
    "충청남도 천안시 동남구 순천향6길 31",
  ],
  "gyeonggi-schmc-bucheon": [
    "순천향대학교부천병원",
    "경기도 부천시 조마루로 170",
  ],
  "gyeongnam-gnuh-jinju": ["경상국립대학교병원", "경상남도 진주시 강남로 79"],
  // 현재 명칭으로는 도로만 잡혀서 OSM에 등록된 옛 명칭을 첫 후보로 둔다.
  "gyeongnam-gnuch-changwon": [
    "창원경상대학교병원",
    "창원경상국립대학교병원",
    "경상남도 창원시 성산구 삼정자로 11",
  ],
  "jeju-jnu": ["제주대학교병원", "제주특별자치도 제주시 아란13길 15"],
  // 2026-09-05 CSV 병원명에 "종합병원"이 들어가는 미등록 16곳 조사분(1차 4곳).
  "gyeongnam-changwon-jeil": [
    "창원제일종합병원",
    "경상남도 창원시 마산합포구 3·15대로 238",
  ],
  "daegu-nazareth": ["나사렛종합병원 대구", "대구광역시 달서구 월배로 97"],
  "gyeongbuk-gyeongsan-semyeong": [
    "세명종합병원 경산",
    "경상북도 경산시 경안로 208",
  ],
  "jeonnam-mokpo-sean": ["세안종합병원", "전라남도 목포시 고하대로 795-2"],
  // 2026-09-05 CSV 병원명에 "종합병원"이 들어가는 미등록 16곳 조사분(2차 4곳).
  "jeonnam-naju-general": ["나주종합병원", "전라남도 나주시 영산로 5419"],
  "jeonnam-bitgaram-general": [
    "빛가람종합병원",
    "전라남도 나주시 정보화길 49",
  ],
  "jeonnam-goheung-general": ["고흥종합병원", "전라남도 고흥군 고흥읍 고흥로 1935"],
  "jeonnam-haenam-general": ["해남종합병원", "전라남도 해남군 해남읍 해남로 45"],
  // 2026-09-05 CSV 병원명에 "종합병원"이 들어가는 미등록 16곳 조사분(3차 4곳).
  "chungnam-dangjin-general": [
    "당진종합병원",
    "충청남도 당진시 반촌로 5-15",
  ],
  "gyeonggi-bucheon-daniel-general": [
    "다니엘종합병원",
    "경기도 부천시 원미구 중동로 361",
  ],
  "gyeonggi-hwaseong-jungang-general": [
    "화성중앙종합병원",
    "경기도 화성시 향남읍 발안로 5",
  ],
  "gyeonggi-hwaseong-wonkwang-general": [
    "원광종합병원 화성",
    "경기도 화성시 화산북로 21",
  ],
  // 2026-09-05 CSV 병원명에 "종합병원"이 들어가는 미등록 16곳 조사분(4차, 마지막 4곳).
  // OSM 등록명이 "해남우리병원"이라 "해남우리종합병원"으로는 결과가 없다.
  "jeonnam-haenam-woori-general": [
    "해남우리병원",
    "전라남도 해남군 옥천면 해남로 597",
  ],
  "jeonnam-jangheung-general": [
    "장흥종합병원",
    "전남 장흥군 장흥읍 흥성로 74",
  ],
  "jeonnam-yeonggwang-general": [
    "영광종합병원",
    "전라남도 영광군 영광읍 와룡로 3",
  ],
  "chungnam-yesan-general": ["예산종합병원", "충청남도 예산군 예산읍 금오대로 94"],
  // 2026-09-06 "의료원" tier 신설 테스트로 등록한 강릉의료원.
  "gangwon-gangneung-medical-center": [
    "강릉의료원",
    "강원특별자치도 강릉시 경강로 2007",
  ],
  // 2026-09-08 전남 tier=병원 1차 배치.
  "gwangyang-gangnam-hospital": ["강남병원 광양", "전라남도 광양시 중마중앙로 17"],
  "goheung-yunho21-hospital": ["윤호21병원 고흥", "전남 고흥군 고흥읍 터미널길 16"],
  "gurye-hospital": ["구례병원", "전라남도 구례군 구례읍 동편제길 4"],
  "damyang-sarang-hospital": ["담양사랑병원", "전라남도 담양군 담양읍 천변7길 19"],
  "mokpo-mirae-hospital": ["목포미래병원", "전남 목포시 녹색로 41"],
  // 2026-09-08 전남 tier=병원 2~4차 배치.
  "mokpo-mizai-hospital": ["목포미즈아이병원", "전남 목포시 백년대로 418"],
  "mokpo-yehyang-hospital": ["목포예향병원", "전남 목포시 삼학로223번길 38"],
  "mokpo-jangmun-hospital": ["목포장문외과병원", "전남 목포시 백년대로 322"],
  "mokpo-solteun-hospital": ["솔튼병원 목포", "전남 목포시 고하대로 724"],
  "suncheon-sunjeong-hospital": ["순정병원 순천", "전남 순천시 해룡면 지봉로 372-3"],
  "suncheon-s-hospital": ["순천에스병원", "전남 순천시 용당삼산로 11"],
  "mokpo-hansarang-hospital": ["목포한사랑병원", "전남 목포시 백년대로 335"],
  "mokpo-hyundai-hospital": ["목포현대병원", "전남 목포시 용당로 322-1"],
  "suncheon-miz-hospital": ["미즈여성아동병원 순천", "전남 순천시 조례1길 10-26"],
  "yeosu-aeyang-hospital": ["여수애양병원", "전남 여수시 율촌면 구암길 319"],
  "yeongam-samhojeil-hospital": ["삼호제일병원", "전남 영암군 삼호읍 신항로 92"],
  // 2026-09-08 전남 tier=병원 5차 배치.
  "suncheon-hana-hospital": ["순천하나병원", "전남 순천시 팔마로 215"],
  "suncheon-hope-hospital": ["순천희망병원", "전남 순천시 중앙로 4"],
  "suncheon-onnuri-hospital": [
    "전남 순천시 해룡면 향매로 97",
    "신대온누리병원",
    "온누리병원 순천 해룡면",
  ],
  "yeosu-cs-namu-hospital": ["씨에스나무병원", "전남 여수시 도원로 164-1"],
  "boseong-asan-hospital": ["보성아산병원", "전남 보성군 미력면 가평길 36-17"],
  // 2026-09-08 전남 tier=병원 6차 배치.
  "yeosu-gaon-hospital": ["여수가온병원", "전남 여수시 좌수영로 251-0"],
  "yeosu-jungang-hospital": ["여수중앙병원", "전남 여수시 둔덕2길 6-3"],
  "yeosu-hankook-hospital": ["여수한국병원", "전남 여수시 여천체육공원길 10"],
  // 2026-09-08 전남 tier=병원 7차 배치.
  "yeongam-hankook-hospital": [
    "전남 영암군 영암읍 오리정길 8",
    "영암한국병원",
  ],
  "yeosu-yewul-hospital": ["예울병원 여수", "전남 여수시 신월로 114"],
  "wando-daesung-hospital": ["완도대성병원", "전남 완도군 완도읍 청해진동로 63"],
  // 2026-09-08 전남 tier=병원 8차 배치.
  "yeosu-munwha-hospital": ["여수문화병원", "전남 여수시 대치3길 26"],
  "gwangyang-hospital": ["광양병원", "전남 광양시 광양읍 인덕로 992"],
  "suncheon-hyundai-womens-hospital": ["현대여성아동병원 순천", "전남 순천시 장선배기1길 8"],
  "gokseong-sarang-hospital": ["곡성사랑병원", "전남 곡성군 곡성읍 곡성로 761"],
  // 2026-09-08 전남 tier=병원 9차 배치.
  "boseong-samho-hospital": [
    "전남 보성군 벌교읍 남하로 12",
    "벌교삼호병원",
  ],
  "mokpo-sinan-hospital": ["전남 목포시 산정로 12", "신안병원 목포"],
  "sinan-daewoo-hospital": ["전남 신안군 비금면 송치길 155-11"],
  "hampyeong-sungsim-hospital": ["함평성심병원", "전남 함평군 함평읍 영수길 132"],
  // 2026-09-08 전남 tier=병원 10차 배치.
  "goheung-nokdong-hyundai-hospital": ["녹동현대병원", "전남 고흥군 도양읍 차경구렁목길 215"],
  "suncheon-peace-hospital": ["순천평화병원", "전남 순천시 양율길 180"],
  "mokpo-nodong-hospital": ["목포노동병원", "전남 목포시 수강로12번길 11-1"],
  "jangseong-hospital": ["장성병원", "전남 장성군 장성읍 역전로 171"],
  // 2026-09-08 전남 tier=병원 11차 배치.
  "jangseong-hyewon-hospital": ["장성혜원병원", "전남 장성군 장성읍 강변안길 22"],
  "jangheung-uri-hospital": ["장흥우리병원", "전남 장흥군 장흥읍 흥성로 83"],
  "jangheung-integrated-medical-hospital": [
    "원광대학교 장흥통합의료병원",
    "전남 장흥군 안양면 로하스로 121",
  ],
  "mokpo-jeil-internal-medicine-hospital": ["제일내과병원 목포", "전남 목포시 섶나루길 126"],
  // 2026-09-08 전남 tier=병원 12차 배치.
  "jindo-hankook-hospital": ["진도한국병원", "전남 진도군 진도읍 남문길 48"],
  "suncheon-plus-imiko-hospital": ["플러스아이미코병원", "전남 순천시 신월큰길 7"],
  // 2026-09-08 전남 tier=병원 13차(마지막) 배치.
  "hwasun-korea-hospital": ["화순고려병원", "전남 화순군 화순읍 충의로 109"],
  "hwasun-sungsim-hospital": ["화순성심병원", "전남 화순군 화순읍 만연로 31"],
  "hwasun-jungang-hospital": ["화순중앙병원", "전남 화순군 화순읍 칠충로 101"],
  "haenam-hankook-hospital": ["해남한국병원", "전남 해남군 해남읍 중앙2로 123"],
  // 2026-09-09 경남 tier=병원 1차 배치.
  "gimhae-centum-hospital": ["김해센텀병원", "경상남도 김해시 구지로 56"],
  "changwon-365-hospital": ["365병원 창원", "경상남도 창원시 마산회원구 3.15대로 686"],
  "geoje-childrens-hospital": ["거제아동병원", "경상남도 거제시 동문천로 52"],
  "geochang-redcross-hospital": ["거창적십자병원", "경상남도 거창군 거창읍 중앙로 91"],
  "changwon-goot-hospital": ["구트병원 창원", "경상남도 창원시 성산구 원이대로 578"],
  // 2026-09-09 경남 tier=병원 2차 배치.
  "gimhae-goodmorning-hospital": ["김해굿모닝병원", "경상남도 김해시 분성로 444"],
  "gimhae-sarang-hospital": ["김해사랑병원", "경상남도 김해시 금관대로 1263"],
  "miryang-nano-hospital": ["나노병원 밀양", "경상남도 밀양시 중앙로 229"],
  // 2026-09-09 경남 tier=병원 3차 배치.
  "yangsan-eroun-hospital": ["더이로운병원", "경상남도 양산시 양산대로 886"],
  "changwon-dongmasan-hospital": ["동마산병원", "경상남도 창원시 마산회원구 3.15대로 681"],
  "jinju-dongjinju-jeil-hospital": ["동진주 제일병원 진주", "경상남도 진주시 대신로 359"],
  "changwon-metro-hospital": ["메트로병원 창원", "경상남도 창원시 의창구 평산로219번길 3"],
  // 2026-09-09 경남 tier=병원 4차 배치(31~60번).
  "changwon-moran-womens-hospital": ["모란여성병원", "경상남도 창원시 성산구 마디미서로 56"],
  "miryang-hospital": ["밀양병원", "경상남도 밀양시 밀양대로 1823"],
  "changwon-vital-hospital": ["바이탈병원 창원", "경상남도 창원시 의창구 북면 천주로 785"],
  "jinju-bando-hospital": ["반도병원 진주", "경상남도 진주시 남강로 701"],
  "yangsan-bonbarun-hospital": ["본바른병원", "경상남도 양산시 물금읍 청운로 343"],
  "sacheon-samcheonpo-jeil-hospital": ["삼천포제일병원", "경상남도 사천시 중앙로 136"],
  "changwon-sangnam-hanmaeum-hospital": ["상남한마음병원", "경상남도 창원시 성산구 원이대로682번길 21"],
  "gimhae-seoul-saessack-hospital": ["서울새싹병원", "경상남도 김해시 율하3로 53"],
  "geoje-seoul-childrens-hospital": ["서울아동병원 거제", "경상남도 거제시 서문로5길 6"],
  "yangsan-seoul-pamily-hospital": ["서울패미리병원", "경상남도 양산시 물금읍 증산역로 135"],
  "changwon-seoul-family-hospital": ["서울패밀리병원", "경상남도 창원시 성산구 마디미서로 54"],
  "yangsan-centumhill-hospital": ["센텀힐병원", "경상남도 양산시 평산로 11"],
  "haman-yeongdong-hospital": ["영동병원 함안", "시영의료재단 영동병원", "경상남도 함안군 칠원읍 용산2길 45-13"],
  // 2026-09-09 경남 tier=병원 5차 배치(61~90번).
  "changwon-sinmasan-seoul-childrens-hospital": ["신마산서울아동병원", "경상남도 창원시 마산합포구 문화동15길 25"],
  "gimhae-isarang-hospital": ["아이사랑병원 김해", "경상남도 김해시 활천로 22"],
  "changwon-yangdeok-seoul-childrens-hospital": ["양덕서울아동병원", "경상남도 창원시 마산회원구 양덕로 190"],
  "yangsan-aideul-hospital": ["양산아이들병원", "경상남도 양산시 물금읍 청운로 354"],
  "yangsan-jeil-hospital": ["양산제일병원", "경상남도 양산시 동면 금오로 255"],
  "jinju-yedam-hospital": ["예담소아청소년과병원", "경상남도 진주시 충의로 20-33"],
  "jinju-yeson-rehab-hospital": ["예손재활의학과병원", "경상남도 진주시 진주대로 839"],
  "changwon-yein-hospital": ["예인병원 창원", "경상남도 창원시 진해구 진해대로 958"],
  "gimhae-woori-womens-hospital": ["우리여성병원 김해", "경상남도 김해시 내외중앙로 91"],
  "yangsan-woongsang-good-kids-hospital": ["웅상좋은아이병원", "경상남도 양산시 평산로 12"],
  "changwon-eunhye-hospital": ["은혜병원 창원", "경상남도 창원시 마산합포구 해안대로 331"],
  "changwon-himchan-hospital": ["창원힘찬병원", "경상남도 창원시 의창구 의창대로 45"],
  "miryang-yoon-hospital": ["밀양윤병원", "경상남도 밀양시 삼문중앙로 32"],
  "gimhae-samseung-hospital": ["김해삼승병원", "경상남도 김해시 김해대로 2335"],
  "changwon-semyeong-hospital": ["세명병원 창원 진해구", "경상남도 창원시 진해구 용원서로 42"],
  "namhae-hospital": ["남해병원", "경상남도 남해군 남해읍 화전로 169"],
  "gimhae-mega-hospital": ["메가병원 김해", "경상남도 김해시 계동로 237"],
  // 병원 건물 POI, 도로명(학산2길)·법정리(학산리) 모두 Nominatim에 없어 면(산인면) 중심점을 쓴다.
  "haman-ara-hankook-hospital": ["아라한국병원", "경상남도 함안군 산인면 학산리", "경상남도 함안군 산인면"],
  "sacheon-samcheonpo-seoul-hospital": ["삼천포서울병원", "경상남도 사천시 남일로 33"],
  "changwon-segwang-hospital": ["세광병원 창원 진해구", "경상남도 창원시 진해구 중원동로 55-1"],
  // 2026-09-09 경남 tier=병원 6차(마지막) 배치(91~133번).
  "gimhae-mi-hospital": ["엠아이병원 김해", "경상남도 김해시 번화1로 36"],
  // 병원 건물 POI, 도로명(용평로5길) 모두 Nominatim에 없어 동(용평동) 중심점을 쓴다.
  "miryang-goodmorning-hospital": ["밀양굿모닝병원", "경상남도 밀양시 용평로5길 4-20", "경상남도 밀양시 용평동"],
  "gimhae-jinyoung-hospital": ["진영병원 김해", "경상남도 김해시 진영읍 김해대로334번길 9"],
  "gimhae-rebom-hospital": ["래봄병원 김해", "경상남도 김해시 분성로 202"],
  "geochang-jungang-medical-hospital": ["중앙메디컬병원 거창", "경상남도 거창군 거창읍 거창대로1길 7-2"],
  "gimhae-jinyoung-saessack-hospital": ["진영새싹병원", "경상남도 김해시 진영읍 본산로 15-17"],
  "jinju-su-hospital": ["진주수병원", "경상남도 진주시 동진로 22"],
  "jinju-goodmorning-hospital": ["진주굿모닝병원", "경상남도 진주시 서장대로213번길 7"],
  "jinju-mirae-womens-hospital": ["진주미래여성병원", "경상남도 진주시 진주대로 957"],
  "jinju-bokeum-hospital": ["진주복음병원", "경상남도 진주시 진양호로 370"],
  "jinju-bon-hospital": ["진주본병원", "경상남도 진주시 진양호로 206"],
  "jinju-seran-hospital": ["진주세란병원", "경상남도 진주시 진주대로 829"],
  "changwon-cham-womens-hospital": ["참여성병원 창원", "경상남도 창원시 마산합포구 불종거리로 19"],
  "changwon-jungang-hospital": ["창원중앙병원", "경상남도 창원시 성산구 대암로 40-4"],
  "changwon-tuntun-i-hospital": ["창원튼튼i병원", "경상남도 창원시 의창구 원이대로 53"],
  "changnyeong-hansung-hospital": ["한성병원 창녕", "경상남도 창녕군 창녕읍 교리1길 2"],
  "tongyeong-korea-hospital": ["통영고려병원", "경상남도 통영시 중앙로 310"],
  "tongyeong-seoul-hospital": ["통영서울병원", "경상남도 통영시 광도면 남해안대로 857"],
  "tongyeong-redcross-hospital": ["통영적십자병원", "경상남도 통영시 중앙로 97"],
  "sacheon-hana-hospital": ["하나병원 사천", "경상남도 사천시 사천읍 진삼로 1468-8"],
  "changwon-hana-hospital": ["하나병원 창원 마산합포구", "경상남도 창원시 마산합포구 합포로 110"],
  "yangsan-hanareum-hospital": ["한아름병원 양산", "경상남도 양산시 물금읍 범구로 27"],
  "hamyang-sungsim-hospital": ["함양성심병원", "경상남도 함양군 함양읍 고운로 70"],
  "changwon-huimang-hospital": ["희망병원 창원 진해구", "경상남도 창원시 진해구 용원로 15"],
  // 2026-09-09 경남 tier=병원 보류 목록 재조사 1차(A+C그룹, Playwright/Wayback 활용).
  // 병원 건물 POI, 도로명(송정1길)·법정리(송정리) 모두 Nominatim에 없어 읍(거창읍) 중심점을 쓴다.
  "geochang-segyeong-hospital": ["에스지서경병원", "경상남도 거창군 거창읍 송정1길 24-13", "경상남도 거창군 거창읍"],
  "changwon-jinhae-seoul-childrens-hospital": [
    "서울아동병원 창원 진해구",
    "경상남도 창원시 진해구 진해대로776번길 27",
  ],
  "changwon-naeseo-seoul-childrens-hospital": [
    "서울아동병원 창원 마산회원구 내서읍",
    "경상남도 창원시 마산회원구 내서읍 삼계로 2",
  ],
  "gimhae-yulha-dreamtree-hospital": ["율하꿈나무병원", "경상남도 김해시 율하3로 38"],
  // 2026-09-09 경북 tier=병원 1차 배치(1~30번).
  "gumi-gangnam-hospital": ["강남병원 구미", "경상북도 구미시 금오시장로2길 21"],
  "gyeongsan-gyeongbuk-regional-rehab-hospital": ["경북권역재활병원", "경상북도 경산시 미래로 120"],
  "gyeongju-goodmorning-hospital": ["경주굿모닝병원", "경상북도 경주시 원화로 397"],
  "gyeongju-centum-hospital": ["경주센텀병원", "경상북도 경주시 화랑로 130"],
  "gyeongju-keimyung-dongsan-hospital": [
    "계명대학교 경주동산병원",
    "경상북도 경주시 봉황로 65",
  ],
  "gyeongju-momzone-womens-hospital": ["맘존여성병원", "경상북도 경주시 원화로 315"],
  "gumi-bareunyou-hospital": ["바른유병원", "경상북도 구미시 역전로 28"],
  "pohang-women-child-hospital": ["여성아이병원", "경상북도 포항시 북구 우창동로22번길 7"],
  "yeongdeok-asan-hospital": ["영덕아산병원", "경상북도 영덕군 영해면 영덕로 1621"],
  "yeongju-kidok-hospital": ["영주기독병원", "경상북도 영주시 구성로 380"],
  "yeongju-jain-hospital": ["영주자인병원", "경상북도 영주시 대동로31번길 9"],
  "yeongcheon-j-hospital": ["영천제이병원", "경상북도 영천시 호국로 145"],
  "chilgok-waegwan-hospital": ["왜관병원", "경상북도 칠곡군 왜관읍 군청2길 10"],
  // 2026-09-09 경북 tier=병원 2차 배치(31~48번, 18곳 중 등록분).
  "pohang-city-hospital": ["시티병원 포항", "경상북도 포항시 북구 장량로31번길 56"],
  "cheongdo-daenam-hospital": ["청도대남병원", "경상북도 청도군 화양읍 청화로 79-7"],
  "pohang-womens-hospital": ["포항여성병원", "경상북도 포항시 북구 포스코대로 269"],
  // "중앙로"가 문경시 안에 점촌동·흥덕동 두 구간으로 따로 있어 법정동 없이 조회하면
  // 도심(점촌동)이 아닌 흥덕동 구간이 먼저 잡힌다. 법정동을 붙여 정확도를 높인다.
  "mungyeong-central-hospital": ["경상북도 문경시 점촌동 중앙로 117"],
  "yecheon-kwon-hospital": ["예천권병원", "경상북도 예천군 예천읍 시장로 136"],
  "yeongnam-jeil-hospital": ["영남제일병원", "경상북도 의성군 안계면 용기4길 36"],
  // "원화로"는 성동동·황오동 등 여러 동을 지나가 법정동 없이 조회하면 다른 구간이
  // 잡힌다. 법정동(성동동)을 붙여 정확도를 높인다.
  "keunmadi-keun-hospital": ["경상북도 경주시 성동동 원화로 312"],
  // "용담로"는 현곡면~황성동까지 길게 이어져 있어 법정동(황성동) 없이 조회하면
  // 먼 현곡면 구간이 잡힌다. 법정동을 붙여 정확도를 높인다.
  "hanbit-childrens-hospital": ["경상북도 경주시 황성동 용담로 34"],
  // 2026-09-09 경북 보류 15곳 재조사(등록 전환 14곳).
  "bonghwa-haeseong-hospital": ["봉화해성병원", "경상북도 봉화군 봉화읍 보밑길 3"],
  "silla-miso-hospital": ["경상북도 경주시 신평동 보문로 465"],
  // 건물 POI, 도로명(삼백로) 모두 Nominatim에 없어 법정동(무양동) 중심점을 쓴다.
  "sangju-barun-rehabilitation-hospital": ["경상북도 상주시 무양동 삼백로 66", "경상북도 상주시 무양동"],
  "seongju-moogang-hospital": ["성주무강병원", "경상북도 성주군 성주읍 성주읍3길 5"],
  // "화랑로"도 경주시 여러 동을 지나가는 도로라 법정동(성건동)을 붙인다.
  "gyeongju-hyundai-hospital": ["경상북도 경주시 성건동 화랑로 51"],
  "uiseong-jenam-hospital": ["제남병원 의성", "경상북도 의성군 봉양면 도리원2길 41"],
  "pohang-sangkwaehan-hanggu-hospital": ["경상북도 포항시 북구 중흥로 265"],
  "goryeong-yeongsaeng-hospital": ["고령영생병원", "경상북도 고령군 대가야읍 중앙로 33"],
  "gyeongju-jagang-hospital": ["경상북도 경주시 성건동 금성로 287"],
  "yeongyang-hospital": ["영양병원 영양군", "경상북도 영양군 영양읍 동서대로 75"],
  "cheongdo-cheongchun-hospital": ["경상북도 청도군 매전면 청려로 3757"],
  // 건물 POI, 도로명(화랑로 129 구간) 모두 Nominatim에 없어 법정동(성동동) 중심점을 쓴다.
  "gyeongju-saecheonnyeon-hospital": ["경상북도 경주시 성동동 화랑로 129", "경상북도 경주시 성동동"],
  "gumi-hyundai-hospital": ["경상북도 구미시 형곡동 신시로 54"],
  // 건물 POI, 도로명(대학로 11) 모두 Nominatim에 없어 법정동(중산동) 중심점을 쓴다.
  "gyeongsan-kkumgreen-hospital": ["꿈그린소아청소년과병원", "경상북도 경산시 중산동 대학로 11", "경상북도 경산시 중산동"],
  // 2026-09-09~10 경남 보류 33곳 재조사(등록 전환 22곳, 2조+3조).
  "jinju-prime-hospital": ["경상남도 진주시 명석면 나불로 305"],
  "gimhae-adong-hospital": ["김해아동병원", "경상남도 김해시 내외중앙로 74"],
  "geoje-daewoo-adong-hospital": ["대우아동병원", "경상남도 거제시 옥포대첩로 38"],
  // 도로명(동외로 142)이 Nominatim에 없어 법정동 중심점(고성읍)을 쓴다.
  "goseong-the-joeun-hospital": ["더조은병원 고성", "경상남도 고성군 고성읍 동외로 142", "경상남도 고성군 고성읍"],
  "geoje-malgeunsaem-centum-hospital": ["맑은샘센텀병원", "경상남도 거제시 거제대로 3762"],
  "miryang-mireu-i-hospital": ["미르아이병원", "경상남도 밀양시 미리벌중앙로 67"],
  "changwon-misoan-rehabilitation-hospital": ["경상남도 창원시 마산회원구 3.15대로 775"],
  "gimhae-samsung-adong-hospital": ["삼성아동병원 김해", "경상남도 김해시 삼계중앙로 36"],
  // 도로명(대야로 876)이 Nominatim에 없어 법정동 중심점(합천읍)을 쓴다.
  "hapcheon-samsung-hospital": ["삼성합천병원", "경상남도 합천군 합천읍 대야로 876", "경상남도 합천군 합천읍"],
  "changwon-sangnam-goodmorning-hospital": ["경상남도 창원시 성산구 상남로 73"],
  // 도로명(정동2길 58)이 Nominatim에 없어 법정동 중심점(정량동)을 쓴다.
  "tongyeong-sinsegyero-hospital": ["신세계로병원", "경상남도 통영시 정동2길 58", "경상남도 통영시 정량동"],
  "changwon-jinhae-woori-hospital": ["경상남도 창원시 진해구 용원로 13"],
  "uiryeong-hospital": ["의령병원", "경상남도 의령군 의령읍 의병로14길 10"],
  "miryang-jeil-hospital": ["경상남도 밀양시 노상하4길 4"],
  // 도로명(동전고개로 2)이 Nominatim에 없어 면 중심점(진동면)을 쓴다.
  "jindong-taebong-hospital": ["진동태봉병원", "경상남도 창원시 마산합포구 진동면 동전고개로 2", "경상남도 창원시 마산합포구 진동면"],
  // "동진로"가 진주시 여러 동을 지나가 법정동(칠암동) 없이 조회하면 다른 구간(상대동)이 잡힌다.
  "jinju-saerom-rehabilitation-hospital": ["진주새롬재활의학과병원", "경상남도 진주시 칠암동 동진로 22"],
  "gimhae-geumgang-hospital": ["금강병원 김해", "경상남도 김해시 가락로 20"],
  "yangsan-jain-hill-hospital": ["자인힐병원", "경상남도 양산시 물금읍 청운로 345"],
  "changwon-thekium-hospital": ["창원더키움병원", "경상남도 창원시 의창구 중동중앙로 95"],
  "changwon-kidswell-pediatric-hospital": ["키즈웰소아청소년과병원", "경상남도 창원시 마산회원구 용마로 130"],
  "jinju-tuntun-pediatric-hospital": ["튼튼소아청소년과병원 진주", "경상남도 진주시 진양호로 206"],
  "miryang-happy-hospital": ["경상남도 밀양시 하남읍 수산중앙로 56"],
  // 2026-09-10 경남 보류 33곳 재조사(1조, 등록 전환 10곳).
  "changnyeong-seoul-hospital": ["경상남도 창녕군 창녕읍 창녕대로 122"],
  // 도로명(선평길 17)이 Nominatim에 없어 읍 중심점(사천읍)을 쓴다.
  "sacheon-seoul-childrens-hospital": ["경상남도 사천시 사천읍 선평길 17", "경상남도 사천시 사천읍"],
  "jinju-seoul-childrens-hospital": ["경상남도 진주시 하대로 80"],
  "tongyeong-seoul-childrens-hospital": ["경상남도 통영시 중앙로 334"],
  "changwon-jinhae-dana-hospital": ["경상남도 창원시 진해구 진해대로1026번길 4"],
  "changwon-best-su-hospital": ["베스트수병원", "경상남도 창원시 마산회원구 양덕로 190"],
  "jinju-gangnam-hospital": ["경상남도 진주시 동진로 111"],
  "goseong-gang-hospital": ["경상남도 고성군 고성읍 중앙로 49"],
  "geoje-jungang-hospital": ["거제중앙병원", "경상남도 거제시 고현로 89"],
  "changwon-goodmorning-naegwa-hospital": ["경상남도 창원시 의창구 사화로 6"],
};

/** 시/도별 대략적인 좌표 범위. 엉뚱한 곳이 매칭되는 것을 걸러낸다. */
const SIDO_BOUNDS = {
  대전광역시: { minLat: 36.15, maxLat: 36.5, minLng: 127.2, maxLng: 127.6 },
  서울특별시: { minLat: 37.4, maxLat: 37.7, minLng: 126.7, maxLng: 127.2 },
  부산광역시: { minLat: 34.9, maxLat: 35.4, minLng: 128.7, maxLng: 129.4 },
  대구광역시: { minLat: 35.7, maxLat: 36.0, minLng: 128.4, maxLng: 128.8 },
  // 인천은 본토(37.3~37.6)만 감싸면 강화군·옹진군이 범위 밖으로 걸린다.
  // 실제로 비에스종합병원(강화읍, 37.736)이 amenity=hospital 노드로 정확히 잡혔는데도
  // maxLat 37.7에 막혀 저장되지 않았다. 강화군 북단(약 37.85)과 옹진군 백령도
  // (약 37.96/124.7)·덕적도(약 37.0/126.1)까지 들어가도록 넓힌다.
  인천광역시: { minLat: 36.9, maxLat: 38.0, minLng: 124.5, maxLng: 126.9 },
  // 광주광역시 + 전라남도 통합(2026-07-01). 두 옛 지역을 모두 감싸는 범위.
  // Nominatim은 새 이름(전남광주통합특별시)과 옛 이름을 모두 인식한다. 위 QUERIES에
  // 옛 표기가 남아 있는 항목은 이미 좌표가 캐싱되어 있어 그대로 둔 것뿐이다.
  전남광주통합특별시: { minLat: 33.9, maxLat: 35.5, minLng: 125.9, maxLng: 127.9 },
  울산광역시: { minLat: 35.4, maxLat: 35.8, minLng: 129.0, maxLng: 129.5 },
  세종특별자치시: { minLat: 36.4, maxLat: 36.7, minLng: 127.1, maxLng: 127.4 },
  경기도: { minLat: 36.9, maxLat: 38.3, minLng: 126.3, maxLng: 127.9 },
  강원특별자치도: { minLat: 37.0, maxLat: 38.6, minLng: 127.0, maxLng: 129.4 },
  충청북도: { minLat: 36.0, maxLat: 37.3, minLng: 127.3, maxLng: 128.7 },
  충청남도: { minLat: 35.9, maxLat: 37.1, minLng: 125.9, maxLng: 127.6 },
  전북특별자치도: { minLat: 35.3, maxLat: 36.2, minLng: 126.4, maxLng: 127.9 },
  경상북도: { minLat: 35.6, maxLat: 37.6, minLng: 127.8, maxLng: 129.6 },
  경상남도: { minLat: 34.6, maxLat: 35.9, minLng: 127.5, maxLng: 129.3 },
  제주특별자치도: { minLat: 33.1, maxLat: 33.6, minLng: 126.1, maxLng: 126.99 },
};

async function geocode(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "kr");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status} ${res.statusText}`);

  const results = await res.json();
  if (!results.length) return null;
  const { lat, lon, display_name: displayName } = results[0];
  return { lat: Number(lat), lng: Number(lon), displayName };
}

function isInsideSido(sido, { lat, lng }) {
  const bounds = SIDO_BOUNDS[sido];
  if (!bounds) return true;
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

/** region 객체는 원본 파일처럼 한 줄로 유지한다. */
function formatJson(hospitals) {
  return (
    JSON.stringify(hospitals, null, 2).replace(
      /"region": \{\s*\n\s*"sido": (".*?"),\s*\n\s*"sigungu": (".*?")\s*\n\s*\}/g,
      '"region": { "sido": $1, "sigungu": $2 }'
    ) + "\n"
  );
}

async function main() {
  const force = process.argv.includes("--force");
  const hospitals = JSON.parse(await readFile(HOSPITALS_PATH, "utf8"));

  let requested = 0;
  let updated = 0;

  for (const hospital of hospitals) {
    const hasCoords =
      typeof hospital.lat === "number" && typeof hospital.lng === "number";
    if (hasCoords && !force) continue;

    const queries = [QUERIES[hospital.id] ?? []].flat();
    if (!queries.length) {
      console.log(`- ${hospital.name}: 검색어 미등록, 건너뜀`);
      continue;
    }

    let result = null;
    for (const query of queries) {
      if (requested > 0) await sleep(REQUEST_INTERVAL_MS);
      requested += 1;

      const candidate = await geocode(query);
      if (!candidate) continue;

      if (!isInsideSido(hospital.region.sido, candidate)) {
        console.log(
          `- ${hospital.name}: "${query}" 결과가 ${hospital.region.sido} 범위 밖(${candidate.lat}, ${candidate.lng}) → 사용하지 않음 [${candidate.displayName}]`
        );
        continue;
      }

      result = candidate;
      break;
    }

    if (!result) {
      console.log(`- ${hospital.name}: 쓸 수 있는 검색 결과 없음`);
      continue;
    }

    hospital.lat = result.lat;
    hospital.lng = result.lng;
    updated += 1;
    console.log(
      `+ ${hospital.name}: ${result.lat}, ${result.lng} [${result.displayName}]`
    );
  }

  if (updated > 0) {
    await writeFile(HOSPITALS_PATH, formatJson(hospitals), "utf8");
  }
  console.log(`\n요청 ${requested}건, 좌표 갱신 ${updated}건`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
