import { coverageCenters, isInYongsan } from "./region.mjs";
import { styleSearchGroups, typicalStay } from "./engine.mjs";

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
  culture: ["book_store", "art_gallery", "library", "museum", "tourist_attraction"],
  nature: ["playground", "park"],
};
const DETAIL_TYPES = ["cafe", "bakery", "restaurant", "book_store", "art_gallery"];
const COARSE_TYPES = new Set(["park", "tourist_attraction", "shopping_mall", "university", "stadium"]);
const FIELDS = ["id", "displayName", "location", "formattedAddress", "types", "businessStatus", "regularOpeningHours", "currentOpeningHours", "rating", "userRatingCount", "googleMapsURI"];

function mapPeriods(hours) {
  return (hours?.periods ?? []).map((period) => ({
    open: period.open
      ? { day: period.open.day, hour: period.open.hour, minute: period.open.minute || 0 }
      : null,
    close: period.close
      ? { day: period.close.day, hour: period.close.hour, minute: period.close.minute || 0 }
      : null,
  })).filter((period) => period.open);
}

function isCoarse(place) {
  return (place.types || []).some((t) => COARSE_TYPES.has(t));
}

function mapPlace(p) {
  const types = (p.types ?? []).filter((t) => typeof t === "string").slice(0, 8);
  const type = types.includes("park") || types.includes("playground") ? "nature" :
    types.some((t) => ["museum", "art_gallery", "library", "book_store", "tourist_attraction"].includes(t)) ? "culture" :
    types.some((t) => ["cafe", "bakery"].includes(t)) ? "cafe" : "food";
  const current = p.currentOpeningHours;
  const regular = p.regularOpeningHours;
  const mapped = {
    id: p.id,
    name: p.displayName ?? "이름 없는 장소",
    lat: p.location.lat(), lng: p.location.lng(), type, types,
    // These are category estimates, never a Google menu or admission price.
    price: { nature: 0, culture: 10000, cafe: 8000, food: 15000 }[type],
    capacity: null, local: null, quiet: null,
    keywords: { nature: "자연 공원 산책 휴식", culture: "문화 전시 책 관광", cafe: "커피 디저트 카페", food: "식사 먹거리" }[type],
    address: p.formattedAddress ?? "",
    hours: regular?.weekdayDescriptions?.join(" / ") ?? "",
    openNow: current?.openNow === true ? true : current?.openNow === false ? false : null,
    periods: mapPeriods(regular),
    rating: Number.isFinite(p.rating) ? p.rating : null,
    ratingCount: Number.isInteger(p.userRatingCount) ? p.userRatingCount : null,
    mapsUrl: p.googleMapsURI ?? "",
    demo: false,
  };
  mapped.stay = typicalStay(mapped);
  return mapped;
}

function pickObscureSpread(places, count, origin) {
  const meters = (a, b) => Math.hypot((a.lat - b.lat) * 111195, (a.lng - b.lng) * 88000);
  if (places.length <= count)
    return [...places].sort((a, b) => (a.ratingCount || 0) - (b.ratingCount || 0) || meters(origin, a) - meters(origin, b));
  const remaining = [...places].sort(
    (a, b) => (a.ratingCount || 0) - (b.ratingCount || 0) || meters(origin, a) - meters(origin, b),
  );
  const chosen = [];
  const minGap = 180;
  while (chosen.length < count && remaining.length) {
    const index = remaining.findIndex((place) => chosen.every((pick) => meters(pick, place) >= minGap));
    chosen.push(remaining.splice(index >= 0 ? index : 0, 1)[0]);
  }
  return chosen;
}

function pickPlaces(list, count, origin) {
  const fine = list.filter((p) => !isCoarse(p));
  const coarse = list.filter(isCoarse);
  const obscure = fine.filter((p) => !Number.isFinite(p.ratingCount) || p.ratingCount < 800);
  const famous = fine.filter((p) => Number.isFinite(p.ratingCount) && p.ratingCount >= 800);
  const picked = pickObscureSpread(obscure.length ? obscure : fine, count, origin);
  const have = new Set(picked.map((p) => p.id));
  if (picked.length < count)
    picked.push(...pickObscureSpread(famous.filter((p) => !have.has(p.id)), count - picked.length, origin));
  if (picked.length < count) {
    const still = new Set(picked.map((p) => p.id));
    picked.push(...pickObscureSpread(coarse.filter((p) => !still.has(p.id)), count - picked.length, origin));
  }
  return picked;
}

async function refineCoarse(Place, rank, selected, unique) {
  const coarse = selected.filter(isCoarse).slice(0, 3);
  if (!coarse.length) return selected;
  const replacements = [];
  for (const parent of coarse) {
    try {
      const result = await Place.searchNearby({
        fields: FIELDS,
        locationRestriction: { center: { lat: parent.lat, lng: parent.lng }, radius: 180 },
        includedTypes: DETAIL_TYPES,
        maxResultCount: 10,
        rankPreference: rank,
      });
      const children = (result.places ?? [])
        .filter((p) => p?.id && p.location && !["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"].includes(p.businessStatus))
        .map(mapPlace)
        .filter((child) => isInYongsan(child) && !isCoarse(child) && !unique.has(child.id));
      if (children.length) replacements.push({ parent, children });
    } catch {
      // Keep the coarse place when the detail search fails.
    }
  }
  if (!replacements.length) return selected;
  const drop = new Set(replacements.map((item) => item.parent.id));
  const extra = replacements.flatMap((item) => item.children);
  for (const child of extra) unique.set(child.id, child);
  return [...selected.filter((p) => !drop.has(p.id)), ...extra].slice(0, 48);
}

export async function searchPlaces(c) {
  const maps = await loadGoogleMaps();
  const { Place, SearchNearbyRankPreference } = await maps.importLibrary("places");
  const centers = coverageCenters(c.origin, c.radius);
  const groups = styleSearchGroups(c.styles);
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
        rankPreference: SearchNearbyRankPreference.DISTANCE,
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
  const selected = Object.entries(byType).flatMap(([type, list]) => pickPlaces(list, desired[type], c.origin));
  return refineCoarse(Place, SearchNearbyRankPreference.DISTANCE, selected.slice(0, 48), unique);
}
