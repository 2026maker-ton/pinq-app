import { coverageCenters, isInYongsan } from "./region.mjs";

let loading;
export function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (loading) return loading;
  const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || key === "undefined")
    return Promise.reject(new Error("프로젝트 최상위 .env에 REACT_APP_GOOGLE_MAPS_API_KEY를 넣고 다시 실행해주세요."));
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => fail("지도 로딩 시간이 초과됐어요. 네트워크를 확인해주세요."), 20000);
    const fail = (message) => {
      clearTimeout(timeout);
      script.remove();
      loading = undefined;
      delete window.initMap;
      reject(new Error(message));
    };
    window.gm_authFailure = () => fail("Google Maps 인증 실패: 키와 API 설정을 확인해주세요.");
    window.initMap = () => {
      clearTimeout(timeout);
      delete window.initMap;
      resolve(window.google.maps);
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=initMap&language=ko&region=KR`;
    script.async = true;
    script.onerror = () => fail("Google Maps 스크립트를 불러오지 못했어요.");
    document.head.appendChild(script);
  });
  return loading;
}

const GROUPS = {
  food: ["cafe", "bakery", "restaurant"],
  culture: ["museum", "art_gallery", "library", "book_store", "tourist_attraction"],
  nature: ["park"],
};
const THEME_GROUPS = { all: ["food", "culture", "nature"], cafe: ["food"], culture: ["culture"], nature: ["nature"] };
const FIELDS = ["id", "displayName", "location", "formattedAddress", "types", "businessStatus", "regularOpeningHours", "rating", "userRatingCount", "googleMapsURI"];

function mapPlace(p) {
  const types = p.types ?? [];
  const type = types.includes("park") ? "nature" :
    types.some((t) => ["museum", "art_gallery", "library", "book_store", "tourist_attraction"].includes(t)) ? "culture" :
    types.some((t) => ["cafe", "bakery"].includes(t)) ? "cafe" : "food";
  return {
    id: p.id,
    name: p.displayName ?? "이름 없는 장소",
    lat: p.location.lat(), lng: p.location.lng(), type,
    // These are category estimates, never a Google menu or admission price.
    price: { nature: 0, culture: 10000, cafe: 8000, food: 15000 }[type],
    stay: 40, capacity: null, local: null, quiet: null,
    keywords: { nature: "자연 공원 산책 휴식", culture: "문화 전시 책 관광", cafe: "커피 디저트 카페", food: "식사 먹거리" }[type],
    address: p.formattedAddress ?? "",
    hours: p.regularOpeningHours?.weekdayDescriptions?.join(" / ") ?? "",
    rating: Number.isFinite(p.rating) ? p.rating : null,
    ratingCount: Number.isInteger(p.userRatingCount) ? p.userRatingCount : null,
    mapsUrl: p.googleMapsURI ?? "",
    demo: false,
  };
}

function evenlySpread(places, count, origin) {
  if (places.length <= count) return places;
  const meters = (a, b) => Math.hypot((a.lat - b.lat) * 111195, (a.lng - b.lng) * 88000);
  const remaining = [...places];
  remaining.sort((a, b) => meters(origin, a) - meters(origin, b));
  const chosen = [remaining.shift()];
  while (chosen.length < count && remaining.length) {
    let best = 0, max = -1;
    for (let i = 0; i < remaining.length; i++) {
      const spread = Math.min(...chosen.map((p) => meters(p, remaining[i])));
      if (spread > max) { max = spread; best = i; }
    }
    chosen.push(remaining.splice(best, 1)[0]);
  }
  return chosen;
}

export async function searchPlaces(c) {
  const maps = await loadGoogleMaps();
  const { Place, SearchNearbyRankPreference } = await maps.importLibrary("places");
  const centers = coverageCenters(c.origin, c.radius);
  const groups = THEME_GROUPS[c.theme];
  const jobs = centers.flatMap((center) => groups.map((group) => ({ center, group })));
  const collected = [];
  let successes = 0;
  // Bound concurrency and total requests to avoid burst traffic and uncontrolled billing.
  for (let i = 0; i < jobs.length; i += 3) {
    const batch = await Promise.allSettled(jobs.slice(i, i + 3).map(({ center, group }) =>
      Place.searchNearby({
        fields: FIELDS,
        locationRestriction: { center, radius: Math.min(c.radius, 2400) },
        includedTypes: GROUPS[group], maxResultCount: 20,
        rankPreference: SearchNearbyRankPreference.POPULARITY,
      })));
    for (const result of batch) if (result.status === "fulfilled") {
      successes++;
      collected.push(...(result.value.places ?? []));
    }
  }
  if (!successes) throw Error("용산구 장소 조회가 모두 실패했어요.");
  const unique = new Map();
  for (const p of collected) {
    if (!p?.id || !p.location ||
        ["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"].includes(p.businessStatus)) continue;
    const candidate = mapPlace(p);
    if (!isInYongsan(candidate)) continue;
    unique.set(candidate.id, candidate);
  }
  const meters = (a, b) => {
    const rad = (x) => x * Math.PI / 180;
    const h = Math.sin(rad(a.lat - b.lat) / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(a.lng - b.lng) / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };
  const byType = { nature: [], culture: [], cafe: [], food: [] };
  for (const candidate of unique.values())
    if (meters(c.origin, candidate) <= c.radius) byType[candidate.type].push(candidate);
  const desired = groups.length === 1 ? { nature: 48, culture: 48, cafe: 48, food: 48 } :
    { nature: 12, culture: 16, cafe: 10, food: 10 };
  const selected = Object.entries(byType).flatMap(([type, list]) => evenlySpread(list, desired[type], c.origin));
  return selected.slice(0, 48);
}
