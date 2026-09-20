let loading;
export function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary)
    return Promise.resolve(window.google.maps);
  if (loading) return loading;
  const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || key === "undefined")
    return Promise.reject(
      new Error(
        "프로젝트 최상위 .env에 REACT_APP_GOOGLE_MAPS_API_KEY를 넣고 개발 서버를 재시작해주세요.",
      ),
    );
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(
      () =>
        fail(
          "지도를 불러오는 시간이 초과됐어요. 네트워크를 확인하고 새로고침해주세요.",
        ),
      20000,
    );
    const fail = (message) => {
      clearTimeout(timeout);
      script.remove();
      loading = undefined;
      delete window.initMap;
      reject(new Error(message));
    };
    window.gm_authFailure = () =>
      fail(
        "Google Maps 인증 실패: 키, 결제, API 활성화와 웹사이트 제한을 확인해주세요.",
      );
    window.initMap = () => {
      clearTimeout(timeout);
      delete window.initMap;
      resolve(window.google.maps);
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
    script.async = true;
    script.onerror = () => fail("Google Maps 스크립트를 불러오지 못했어요.");
    document.head.appendChild(script);
  });
  return loading;
}
const TYPES = {
  all: [
    "cafe",
    "restaurant",
    "park",
    "museum",
    "art_gallery",
    "library",
    "book_store",
  ],
  cafe: ["cafe", "bakery"],
  culture: ["museum", "art_gallery", "library", "book_store"],
  nature: ["park"],
};
export async function searchPlaces(c) {
  const maps = await loadGoogleMaps();
  const { Place, SearchNearbyRankPreference } =
    await maps.importLibrary("places");
  const { places } = await Place.searchNearby({
    fields: [
      "id",
      "displayName",
      "location",
      "formattedAddress",
      "types",
      "businessStatus",
      "regularOpeningHours",
    ],
    locationRestriction: { center: c.origin, radius: c.radius },
    includedTypes: TYPES[c.theme],
    maxResultCount: 20,
    rankPreference: SearchNearbyRankPreference.DISTANCE,
  });
  return places
    .filter(
      (p) =>
        p.location &&
        p.businessStatus !== "CLOSED_PERMANENTLY" &&
        p.businessStatus !== "CLOSED_TEMPORARILY",
    )
    .map((p) => {
      const types = p.types ?? [];
      const type = types.includes("park")
        ? "nature"
        : types.some((t) =>
              ["museum", "art_gallery", "library", "book_store"].includes(t),
            )
          ? "culture"
          : types.some((t) => ["cafe", "bakery"].includes(t))
            ? "cafe"
            : "food";
      const price = { nature: 0, culture: 10000, cafe: 8000, food: 15000 }[
        type
      ];
      return {
        id: p.id,
        name: p.displayName ?? "이름 없는 장소",
        lat: p.location.lat(),
        lng: p.location.lng(),
        type,
        price,
        stay: 40,
        capacity: null,
        local: null,
        quiet: null,
        keywords: {
          nature: "자연 공원 산책 휴식",
          culture: "문화 전시 책",
          cafe: "커피 디저트 카페",
          food: "식사 먹거리",
        }[type],
        address: p.formattedAddress ?? "",
        hours: p.regularOpeningHours?.weekdayDescriptions?.join(" / ") ?? "",
        demo: false,
      };
    });
}
