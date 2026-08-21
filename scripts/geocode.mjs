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
  "daejeon-chungnam-univ": "대전광역시 중구 문화로 282",
  "daejeon-konyang-univ": "대전광역시 서구 관저동로 158",
  "daejeon-eulji-univ": "대전광역시 서구 둔산서로 95",
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
  "gyeongnam-gnuh-jinju": ["경상국립대학교병원", "경상남도 진주시 강남로 79"],
  // 현재 명칭으로는 도로만 잡혀서 OSM에 등록된 옛 명칭을 첫 후보로 둔다.
  "gyeongnam-gnuch-changwon": [
    "창원경상대학교병원",
    "창원경상국립대학교병원",
    "경상남도 창원시 성산구 삼정자로 11",
  ],
  "jeju-jnu": ["제주대학교병원", "제주특별자치도 제주시 아란13길 15"],
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
