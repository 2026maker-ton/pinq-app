import { isInYongsan, YONGSAN_CENTER } from "./region.mjs";

export const ORIGIN = YONGSAN_CENTER;
const rows = [
  [
    "골목 로스터리",
    "cafe",
    -0.0012,
    -0.0016,
    6000,
    40,
    10,
    10,
    20,
    1,
    1,
    "커피 디저트 조용한 곳",
  ],
  [
    "작은 책방",
    "culture",
    0.0011,
    -0.003,
    0,
    35,
    6,
    11,
    20,
    1,
    1,
    "책 독서 문화 조용한 곳",
  ],
  [
    "동네 쉼터",
    "nature",
    0.0024,
    -0.0014,
    0,
    30,
    30,
    8,
    20,
    0,
    1,
    "공원 산책 휴식 조용한 곳",
  ],
  [
    "시장 한 끼",
    "food",
    -0.0025,
    0.0021,
    11000,
    50,
    12,
    11,
    21,
    1,
    0,
    "식사 밥 먹거리 로컬",
  ],
  [
    "작은 전시실",
    "culture",
    0.0021,
    0.0026,
    5000,
    45,
    8,
    10,
    18,
    1,
    1,
    "전시 문화 미술 조용한 곳",
  ],
  [
    "수변 산책길",
    "nature",
    -0.0045,
    -0.0005,
    0,
    40,
    30,
    8,
    20,
    0,
    1,
    "산책 자연 공원 휴식",
  ],
  [
    "구움과자 가게",
    "cafe",
    -0.0001,
    0.0039,
    7000,
    35,
    8,
    10,
    20,
    1,
    0,
    "커피 디저트 빵",
  ],
  [
    "마을 자료실",
    "culture",
    0.0032,
    -0.0046,
    0,
    40,
    12,
    9,
    18,
    0,
    1,
    "책 독서 문화 조용한 곳",
  ],
  [
    "손끝 공방",
    "culture",
    -0.0016,
    -0.005,
    18000,
    60,
    4,
    11,
    19,
    1,
    1,
    "체험 공방 만들기 문화",
  ],
  [
    "동네 국수집",
    "food",
    0.0039,
    0.0007,
    9000,
    45,
    10,
    11,
    20,
    1,
    0,
    "식사 밥 국수 먹거리",
  ],
  [
    "골목 작은 정원",
    "nature",
    0.0047,
    0.0039,
    0,
    30,
    20,
    8,
    19,
    0,
    1,
    "산책 자연 공원 휴식 조용한 곳",
  ],
  [
    "밤의 찻집",
    "cafe",
    0.0008,
    0.0053,
    7000,
    40,
    6,
    12,
    23,
    1,
    1,
    "차 커피 조용한 곳",
  ],
];
export const DEMO = rows.map((r, i) => ({
  id: "demo" + i,
  name: r[0],
  type: r[1],
  lat: ORIGIN.lat + r[2],
  lng: ORIGIN.lng + r[3],
  price: r[4],
  stay: r[5],
  capacity: r[6],
  open: r[7] * 60,
  close: r[8] * 60,
  local: !!r[9],
  quiet: !!r[10],
  keywords: r[11],
  closedDays: i === 4 ? [1] : i === 7 ? [0] : [],
  demo: true,
  wheelchairEntrance: i % 2 === 0,
  wheelchairParking: i % 3 === 0,
  wheelchairRestroom: i === 0 || i === 5,
  elevation: 19 + (i % 3),
  originElevation: 20,
}));
export const money = (n) => Math.round(n).toLocaleString("ko-KR") + "원";
const GOOGLE_MAPS_HOST = /^(www\.|maps\.)?google\.[a-z.]+$/i;
export function placeMapsUrl(place) {
  const raw = typeof place?.mapsUrl === "string" ? place.mapsUrl.trim() : "";
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "https:" && GOOGLE_MAPS_HOST.test(parsed.hostname))
        return raw.slice(0, 500);
    } catch {
      // Fall through to a coordinate search URL.
    }
  }
  const lat = Number(place?.lat), lng = Number(place?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", `${lat},${lng}`);
  const id = typeof place?.id === "string" && !place.id.startsWith("demo") && place.id.length > 8 ? place.id : "";
  if (id) url.searchParams.set("query_place_id", id);
  return url.toString().slice(0, 500);
}
export const STYLE_ENUM = ["relaxed", "tight", "eager", "play", "exhibit", "food", "hidden", "access"];
const ACCESS_GRADE_LIMIT = 0.08;
const STYLE_WHY = {
  relaxed: "한가함",
  tight: "빡빡함",
  eager: "열정적",
  play: "놀이",
  exhibit: "관람",
  food: "먹거리",
  hidden: "숨은명소",
  access: "교통약자",
};
function hasStyle(c, id) {
  return Array.isArray(c?.styles) && c.styles.includes(id);
}
function isMealPlace(place) {
  return place?.type === "cafe" || place?.type === "food";
}
function isExhibitPlace(place) {
  const types = Array.isArray(place?.types) ? place.types : [];
  return place?.type === "culture" || types.some((t) => t === "museum" || t === "art_gallery");
}
function accessFlags(place) {
  return {
    entrance: place?.wheelchairEntrance === true || place?.barrierFree === true,
    parking: place?.wheelchairParking === true,
    restroom: place?.wheelchairRestroom === true,
    seating: place?.wheelchairSeating === true,
  };
}
export function isAccessFriendly(place) {
  const flags = accessFlags(place);
  return flags.entrance || flags.parking || flags.restroom || flags.seating;
}
export function isUnevenPlace(place) {
  const types = Array.isArray(place?.types) ? place.types : [];
  return place?.rough === true || types.includes("playground") || types.includes("campground") || types.includes("hiking_area");
}
function pointElevation(point, place) {
  if (Number.isFinite(point?.elevation)) return Number(point.elevation);
  if (Number.isFinite(place?.originElevation)) return Number(place.originElevation);
  return null;
}
export function pathGrade(from, to) {
  const start = pointElevation(from, to);
  const end = Number.isFinite(to?.elevation) ? Number(to.elevation) : null;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const meters = Math.max(distance(from, to) * 1.3, 1);
  return Math.abs(end - start) / meters;
}
function isHiddenGem(place) {
  const rating = Number(place?.rating);
  const count = Number(place?.ratingCount);
  const high = !Number.isFinite(rating) || rating >= 4;
  const few = !Number.isFinite(count) || count <= 250;
  if (place?.demo) return !!place.quiet && few;
  return high && few && !(Number.isFinite(count) && count > 250);
}
function hoursKnown(place) {
  if (place.demo && Number.isFinite(place.open) && Number.isFinite(place.close))
    return true;
  if (Array.isArray(place.periods) && place.periods.length) return true;
  return place.openNow === true || place.openNow === false;
}
function weekMinutes(day, hour, minute) {
  return day * 1440 + Number(hour) * 60 + Number(minute || 0);
}
function isOpenDuring(periods, weekday, startMin, endMin) {
  if (!Array.isArray(periods) || !periods.length) return null;
  const start = weekday * 1440 + startMin;
  const end = weekday * 1440 + endMin;
  let sawPeriod = false;
  for (const period of periods) {
    const open = period?.open;
    if (!open || !Number.isInteger(open.day) || !Number.isFinite(open.hour))
      continue;
    sawPeriod = true;
    const openAt = weekMinutes(open.day, open.hour, open.minute);
    let closeAt = period.close
      ? weekMinutes(period.close.day, period.close.hour, period.close.minute)
      : openAt + 1440;
    if (closeAt <= openAt) closeAt += 7 * 1440;
    for (const offset of [0, 7 * 1440, -7 * 1440]) {
      if (start + offset >= openAt && end + offset <= closeAt) return true;
    }
  }
  return sawPeriod ? false : null;
}
export function placeBusinessStatus(place, arrival, weekday) {
  const stay = Number.isFinite(place.stay) ? place.stay : 0;
  if (place.demo && Number.isFinite(place.open) && Number.isFinite(place.close))
    return arrival >= place.open && arrival + stay <= place.close
      ? "open"
      : "closed";
  if (Array.isArray(place.periods) && place.periods.length) {
    const open = isOpenDuring(place.periods, weekday, arrival, arrival + stay);
    if (open === true) return "open";
    if (open === false) return "closed";
  }
  if (place.openNow === true) return "open";
  if (place.openNow === false) return "closed";
  return "unknown";
}
export function courseBusinessStatus(stops) {
  const statuses = stops.map((stop) => stop.business_status);
  if (statuses.includes("closed")) return "closed";
  if (statuses.length && statuses.every((status) => status === "open"))
    return "open";
  return "unknown";
}
export function parseClock(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    return NaN;
  return value.split(":").reduce((sum, part, i) => sum + Number(part) * (i ? 1 : 60), 0);
}
export function timeWindow(c) {
  const start = parseClock(c.time);
  const end = Math.min(
    1439,
    c.timeMode === "duration"
      ? start + Math.round((Number(c.playHours) || 0) * 60)
      : parseClock(c.endTime),
  );
  return { start, end };
}
export function travelMinutes(meters, transport) {
  return (
    Math.max(
      3,
      Math.ceil(meters / (transport === "walk" ? 70 : transport === "bike" ? 180 : 240)),
    ) + (transport === "transit" ? 8 : 0)
  );
}
export const UNIT_PRICE = { nature: 0, culture: 10000, cafe: 8000, food: 15000 };
export const TRANSIT_FARE = 1600;
export function unitPrice(place) {
  if (place?.demo && Number.isFinite(place.price) && place.price >= 0) return place.price;
  return UNIT_PRICE[place?.type] ?? UNIT_PRICE.culture;
}
export function partyCost(unit, people) {
  const n = Number.isInteger(people) && people > 0 ? people : 1;
  return Math.max(0, Number(unit) || 0) * n;
}
export function transitCost(people, legs, transport) {
  if (transport !== "transit") return 0;
  return partyCost(TRANSIT_FARE, people) * Math.max(0, Number(legs) || 0);
}
export function estimateCourseCost(stops, c) {
  const people = c.people;
  let food = 0, play = 0, shop = 0, publicCost = 0;
  const lines = [];
  for (const stop of stops || []) {
    const unit = unitPrice(stop);
    const amount = partyCost(unit, people);
    const kind = ["cafe", "food"].includes(stop.type) ? "food" : "play";
    if (kind === "food") food += amount;
    else play += amount;
    const who = payee(stop);
    if (who === "public") publicCost += amount;
    else shop += amount;
    lines.push({ id: stop.id, unit, people, amount, kind, payee: who });
  }
  const transit = transitCost(people, (stops || []).length, c.transport);
  const places = food + play;
  return { food, play, transit, shop, public: publicCost, places, total: places + transit, people, lines };
}
function stopCost(place, c) {
  return partyCost(unitPrice(place), c.people) + transitCost(c.people, 1, c.transport);
}
const PUBLIC_TYPES = [
  "park",
  "library",
  "museum",
  "city_hall",
  "local_government_office",
  "visitor_center",
  "playground",
  "garden",
  "plaza",
];
const SHOP_TYPES = [
  "cafe",
  "bakery",
  "restaurant",
  "book_store",
  "art_gallery",
  "meal_takeaway",
  "meal_delivery",
];
const KIND_WHY = { nature: "공원", culture: "문화", cafe: "카페", food: "식사" };
export function fame(place) {
  const n = Number(place?.ratingCount);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.log10(1 + n);
}
export function typicalStay(place) {
  if (place?.demo && Number.isFinite(place.stay) && place.stay > 0) return place.stay;
  const types = Array.isArray(place?.types) ? place.types : [];
  if (types.includes("book_store")) return 35;
  if (types.some((t) => t === "museum" || t === "art_gallery")) return 70;
  if (place?.type === "cafe") return 45;
  if (place?.type === "food") return 60;
  return 40;
}
export function stayMinutes(place, c) {
  const base = typicalStay(place);
  if (hasStyle(c, "relaxed")) return Math.round(base * 1.45);
  if (hasStyle(c, "eager")) return Math.max(18, Math.round(base * 0.65));
  if (hasStyle(c, "tight")) return Math.max(20, Math.round(base * 0.85));
  return base;
}
export function moveMinutes(meters, c) {
  const base = travelMinutes(meters, c?.transport);
  let minutes = base;
  if (hasStyle(c, "relaxed")) minutes = Math.round(base * 1.5);
  else if (hasStyle(c, "eager")) minutes = Math.max(2, Math.round(base * 0.8));
  if (hasStyle(c, "access") && c?.transport !== "transit")
    minutes = Math.max(3, Math.round(minutes * 1.25));
  return minutes;
}
export function payee(place) {
  const types = Array.isArray(place?.types) ? place.types : [];
  const name = place?.name || "";
  if (/국립|시립|구립|용산구청|서울특별시/.test(name)) return "public";
  if (types.some((t) => PUBLIC_TYPES.includes(t)) || place?.type === "nature")
    return "public";
  if (types.some((t) => SHOP_TYPES.includes(t))) return "shop";
  if (place?.type === "cafe" || place?.type === "food") return "shop";
  if (place?.demo && place.local) return "shop";
  return "shop";
}
export function placeWhy(place, c, arrival) {
  const why = [];
  const tokens = (c.keyword || "")
    .trim()
    .split(/[,，\s]+/)
    .filter((t) => t && !["곳", "한적한", "조용한"].includes(t));
  const hay = `${place.name || ""} ${place.keywords || ""}`;
  for (const token of tokens) {
    if (hay.includes(token) && !why.includes(token)) why.push(token);
    if (why.length >= 2) return why;
  }
  if (["cafe", "food"].includes(place.type) && Number.isFinite(arrival)) {
    if (arrival >= 690 && arrival <= 810) why.push("점심");
    else if (arrival >= 1050 && arrival <= 1170) why.push("저녁");
  }
  if (why.length >= 2) return why.slice(0, 2);
  if (hasStyle(c, "access")) {
    if (place.wheelchairParking && !why.includes("휠체어주차")) why.push("휠체어주차");
    if (why.length < 2 && (place.wheelchairEntrance || place.barrierFree) && !why.includes("입구접근"))
      why.push("입구접근");
    if (why.length < 2 && Number.isFinite(place.grade) && place.grade <= 0.03 && !why.includes("완만"))
      why.push("완만");
    if (why.length >= 2) return why.slice(0, 2);
  }
  for (const style of c.styles || []) {
    if (why.length >= 2) break;
    const tag = STYLE_WHY[style];
    if (tag && !why.includes(tag)) why.push(tag);
  }
  if (!why.length) why.push(KIND_WHY[place.type] || "추천");
  return why.slice(0, 2);
}
export function styleSearchGroups(styles = []) {
  if (styles.includes("food")) return ["food"];
  if (styles.includes("exhibit")) return ["culture"];
  if (styles.includes("play")) return ["nature", "culture"];
  return ["food", "culture", "nature"];
}
export function coursesFocus(origin, courses = []) {
  const points = [origin];
  for (const course of courses)
    for (const stop of course.stops || []) points.push(stop);
  return {
    lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
  };
}
export function normalizeConditions(input = {}) {
  const origin = input.origin ?? input.departure_location;
  const styles = Array.isArray(input.styles)
    ? input.styles
    : Array.isArray(input.recommendation_style)
      ? input.recommendation_style
      : [];
  const budget =
    input.budget ??
    input.total_budget?.amount ??
    (Number.isFinite(input.total_budget) ? input.total_budget : undefined);
  return {
    origin: origin
      ? {
          lat: origin.lat,
          lng: origin.lng,
          ...(Number.isFinite(origin.elevation)
            ? { elevation: origin.elevation }
            : {}),
        }
      : origin,
    radius: input.radius ?? input.search_radius,
    transport: input.transport ?? input.transportation,
    people: input.people ?? input.party_size,
    styles: [...new Set(styles)],
    budget,
    date: input.date,
    time: input.time,
    timeMode: input.timeMode === "duration" ? "duration" : "end",
    endTime: typeof input.endTime === "string" ? input.endTime : "17:00",
    playHours: Number.isFinite(Number(input.playHours))
      ? Number(input.playHours)
      : 4,
    keyword: typeof input.keyword === "string" ? input.keyword : "",
    verifiedOnly: !!input.verifiedOnly,
  };
}
export function toAgentConditions(input) {
  const c = normalizeConditions(input);
  return {
    departure_location: c.origin,
    search_radius: c.radius,
    transportation: c.transport,
    party_size: c.people,
    recommendation_style: c.styles,
    budget: c.budget,
    date: c.date,
    time: c.time,
    timeMode: c.timeMode,
    endTime: c.endTime,
    playHours: c.playHours,
    keyword: c.keyword,
    verifiedOnly: c.verifiedOnly,
  };
}
export function shapeCourse(route, c) {
  const stops = route.stops;
  const legs = [];
  let prev = { name: "출발점", lat: c.origin.lat, lng: c.origin.lng };
  for (const stop of stops) {
    legs.push({
      from: prev.name,
      to: stop.name,
      minutes: stop.move,
      meters: Math.round(stop.meters ?? distance(prev, stop) * 1.3),
    });
    prev = stop;
  }
  const realtime = courseBusinessStatus(stops);
  return {
    ...route,
    course_id_or_name: route.id,
    recommended_places: stops,
    realtime_business_status: realtime,
    estimated_cost: {
      currency: "KRW",
      food: route.food,
      play: route.play,
      transit: route.transit,
      places: route.food + route.play,
      total: route.total,
      shop: route.shop,
      public: route.public,
      people: c.people,
      formula: "unit * people + transit",
    },
    route_info: {
      estimated: true,
      transportation: c.transport,
      duration_min: route.duration,
      distance_m: route.distance,
      legs,
    },
    unknown: stops.some((stop) => stop.business_status === "unknown"),
    path: [
      { lat: c.origin.lat, lng: c.origin.lng },
      ...stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })),
    ],
  };
}
export function distance(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const t =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(t), Math.sqrt(1 - t));
}
export function validate(input) {
  const c = normalizeConditions(input);
  if (
    !Number.isFinite(c.origin?.lat) ||
    !Number.isFinite(c.origin?.lng) ||
    Math.abs(c.origin.lat) > 90 ||
    Math.abs(c.origin.lng) > 180
  )
    throw Error("출발 좌표를 다시 선택해주세요.");
  if (!isInYongsan(c.origin))
    throw Error("출발점은 서울시 용산구 안에서 선택해주세요.");
  if (!Number.isInteger(c.people) || c.people < 1 || c.people > 30)
    throw Error("인원은 1~30명 사이의 정수로 입력해주세요.");
  if (!Number.isFinite(c.budget) || c.budget < 0 || c.budget > 10000000)
    throw Error("전체 예산은 0~10,000,000원으로 입력해주세요.");
  if (!Number.isFinite(c.radius) || c.radius < 300 || c.radius > 8000)
    throw Error("반경은 300m~8km로 선택해주세요.");
  if (
    !Array.isArray(c.styles) ||
    c.styles.some((style) => !STYLE_ENUM.includes(style))
  )
    throw Error("취향 스타일을 다시 선택해주세요.");
  if (!["walk", "bike", "transit"].includes(c.transport))
    throw Error("이동 방법을 다시 선택해주세요.");
  if (
    typeof c.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(c.date) ||
    !Number.isFinite(parseClock(c.time))
  )
    throw Error("방문 날짜와 시간을 확인해주세요.");
  if (c.timeMode === "end" && !Number.isFinite(parseClock(c.endTime)))
    throw Error("끝 시각을 확인해주세요.");
  if (
    c.timeMode === "duration" &&
    (!Number.isInteger(c.playHours) || c.playHours < 1 || c.playHours > 12)
  )
    throw Error("놀 시간은 1~12시간으로 입력해주세요.");
  const window = timeWindow(c);
  if (!Number.isFinite(window.start) || !Number.isFinite(window.end) || window.end <= window.start)
    throw Error("끝 시각은 출발 시각보다 늦어야 해요.");
  if (typeof c.keyword !== "string" || c.keyword.length > 60)
    throw Error("키워드는 60자 이내로 입력해주세요.");
  if (
    /ignore\s*(all\s*)?(previous|instructions)|system\s*prompt|이전\s*지시|지시.*무시|역할.*바[꿔꾸]|시스템\s*프롬프트|<script|javascript:|https?:\/\//i.test(
      c.keyword,
    )
  )
    throw Error(
      "장소와 취향을 나타내는 키워드만 입력해주세요. 시스템 지시나 URL은 사용할 수 없어요.",
    );
  const parsed = new Date(c.date + "T12:00:00Z");
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== c.date
  )
    throw Error("존재하는 날짜를 선택해주세요.");
  return c;
}
function visitStep(place, prev, t, end, c, weekday, spent) {
  const stay = stayMinutes(place, c);
  const meters = distance(prev, place) * 1.3;
  const minutes = moveMinutes(meters, c);
  const arrival = t + minutes;
  const leave = arrival + stay;
  if (leave > end || leave >= 1440) return null;
  if (c.transport !== "transit" && (t < 360 || t >= 1260 || leave > 1260))
    return null;
  const business_status = placeBusinessStatus({ ...place, stay }, arrival, weekday);
  if (
    (place.demo || (Array.isArray(place.periods) && place.periods.length)) &&
    business_status === "closed"
  )
    return null;
  const cost = stopCost(place, c);
  if (spent + cost > c.budget) return null;
  const fromElev = pointElevation(prev, place);
  const toElev = Number.isFinite(place?.elevation) ? Number(place.elevation) : null;
  const rise = Number.isFinite(fromElev) && Number.isFinite(toElev) ? toElev - fromElev : null;
  const grade = Number.isFinite(rise) ? (meters >= 12 ? Math.abs(rise) / meters : 0) : null;
  if (hasStyle(c, "access")) {
    if (isUnevenPlace(place) && !accessFlags(place).parking) return null;
    if (Number.isFinite(grade) && grade > ACCESS_GRADE_LIMIT) return null;
  }
  return { meters, minutes, arrival, leave, business_status, cost, stay, rise, grade };
}
function skipPlace(place, c) {
  const count = Number(place?.ratingCount);
  if (hasStyle(c, "hidden") && Number.isFinite(count) && count > 400) return true;
  if (hasStyle(c, "access") && isUnevenPlace(place) && !accessFlags(place).parking) return true;
  return false;
}
function packCourse(seed, candidates, c, start, end, weekday, required = []) {
  const used = new Set();
  const stops = [];
  let prev = c.origin,
    t = start,
    totalMeters = 0,
    spent = 0;
  const cap = hasStyle(c, "relaxed") ? 4 : hasStyle(c, "tight") ? 6 : 8;
  const add = (place, step) => {
    used.add(place.id);
    stops.push({
      ...place,
      stay: step.stay,
      arrival: step.arrival,
      move: step.minutes,
      meters: step.meters,
      business_status: step.business_status,
      payee: payee(place),
      unitPrice: unitPrice(place),
      partyCost: partyCost(unitPrice(place), c.people),
      grade: step.grade,
      rise: step.rise,
      why: placeWhy({ ...place, grade: step.grade }, c, step.arrival),
    });
    t = step.leave;
    totalMeters += step.meters;
    spent += step.cost;
    prev = place;
  };
  const requiredList = [...required].filter(Boolean).sort(
    (a, b) => distance(c.origin, a) - distance(c.origin, b),
  );
  for (const place of requiredList) {
    if (used.has(place.id)) continue;
    if (skipPlace(place, c)) return null;
    const step = visitStep(place, prev, t, end, c, weekday, spent);
    if (!step) return null;
    add(place, step);
  }
  if (seed && !used.has(seed.id)) {
    if (skipPlace(seed, c)) return null;
    const step = visitStep(seed, prev, t, end, c, weekday, spent);
    if (!step) return null;
    add(seed, step);
  }
  while (stops.length < cap) {
    let best = null;
    for (const place of candidates) {
      if (used.has(place.id) || skipPlace(place, c)) continue;
      const step = visitStep(place, prev, t, end, c, weekday, spent);
      if (!step) continue;
      const typeBonus = stops.some((s) => s.type === place.type) ? 0 : 80;
      const hiddenBias = hasStyle(c, "hidden")
        ? (isHiddenGem(place) ? -160 : fame(place) * 40)
        : fame(place) * 90;
      const eagerBias = hasStyle(c, "eager") ? step.stay : 0;
      const flags = accessFlags(place);
      const accessBias = hasStyle(c, "access")
        ? (flags.parking ? -160 : 0)
          + (flags.entrance ? -80 : 0)
          + (flags.restroom ? -40 : 0)
          + (Number.isFinite(step.grade) ? step.grade * 4000 : 0)
          + (place.type === "nature" && !flags.parking ? 90 : 0)
        : 0;
      const rank = step.meters - typeBonus + hiddenBias + eagerBias + accessBias;
      if (!best || rank < best.rank) best = { place, step, rank };
    }
    if (!best) break;
    add(best.place, best.step);
  }
  if (!stops.length) return null;
  if (requiredList.some((place) => !used.has(place.id))) return null;
  const last = stops[stops.length - 1];
  const duration = last.arrival + last.stay - start;
  const cost = estimateCourseCost(stops, c);
  if (cost.total > c.budget) return null;
  const { food, play, transit, shop, public: publicCost, total } = cost;
  const local = stops.filter((p) => p.local).length,
    quiet = stops.filter((p) => p.quiet).length,
    diversity = new Set(stops.map((p) => p.type)).size;
  const fill = end > start ? duration / (end - start) : 0;
  const fameSum = stops.reduce((sum, stop) => sum + fame(stop), 0);
  const gems = stops.filter(isHiddenGem).length;
  return {
    id: stops.map((p) => p.id).join("-"),
    stops,
    food,
    play,
    transit,
    total,
    shop,
    public: publicCost,
    duration,
    slack: 0,
    distance: totalMeters,
    local,
    quiet,
    score:
      fill * (hasStyle(c, "tight") ? 40 : 24) +
      (hasStyle(c, "eager") ? stops.length * 18 : 0) +
      (hasStyle(c, "relaxed") ? (1 - fill) * 16 : 0) +
      (hasStyle(c, "hidden") ? gems * 14 : 0) +
      diversity * 8 +
      local * 2 +
      quiet -
      fameSum * (hasStyle(c, "hidden") ? 14 : 8) -
      totalMeters / 2000 -
      total / 100000,
  };
}
function sectorSeeds(origin, candidates) {
  const sectors = [[], [], []];
  for (const place of candidates) {
    const angle = Math.atan2(place.lng - origin.lng, place.lat - origin.lat);
    const index = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 3) % 3;
    sectors[index].push(place);
  }
  return sectors
    .map((list) =>
      [...list].sort(
        (a, b) => fame(a) - fame(b) || distance(origin, a) - distance(origin, b),
      )[0],
    )
    .filter(Boolean);
}
function usedNearby(place, takenStops, meters = 200) {
  return takenStops.some((stop) => distance(place, stop) < meters);
}
function majoritySame(a, b, ignore = new Set()) {
  const left = new Set(
    (a?.stops || []).map((stop) => stop.id).filter((id) => !ignore.has(id)),
  );
  const right = new Set(
    (b?.stops || []).map((stop) => stop.id).filter((id) => !ignore.has(id)),
  );
  if (!left.size || !right.size) return false;
  const overlap = [...left].filter((id) => right.has(id)).length;
  return overlap / new Set([...left, ...right]).size >= 0.5;
}
export function uniqueCourses(courses, limit = 3, ignoreIds = []) {
  const ignore = new Set(ignoreIds);
  const kept = [];
  for (const course of courses || []) {
    if (!course?.stops?.length) continue;
    if (kept.some((other) => majoritySame(other, course, ignore))) continue;
    kept.push(course);
    if (kept.length === limit) break;
  }
  return kept;
}
function splitMustInclude(places, origin, count) {
  const n = Math.min(3, Math.max(2, count));
  if (!places.length) return [];
  if (places.length <= n) return places.map((place) => [place]);
  const buckets = Array.from({ length: n }, () => []);
  for (const place of places) {
    const angle = Math.atan2(place.lng - origin.lng, place.lat - origin.lat);
    buckets[Math.floor(((angle + Math.PI) / (2 * Math.PI)) * n) % n].push(place);
  }
  const filled = buckets.filter((bucket) => bucket.length);
  if (filled.length >= 2) return filled;
  const ordered = [...places].sort(
    (a, b) => distance(origin, a) - distance(origin, b),
  );
  const size = Math.ceil(ordered.length / n);
  return Array.from({ length: n }, (_, i) =>
    ordered.slice(i * size, (i + 1) * size),
  ).filter((group) => group.length);
}
export function createCourses(raw, input) {
  let c = validate(input);
  let candidates = raw.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      Number.isFinite(p.price) &&
      p.price >= 0 &&
      Number.isFinite(p.stay) &&
      p.stay > 0 &&
      isInYongsan(p) &&
      (!c.verifiedOnly || hoursKnown(p)) &&
      distance(c.origin, p) <= c.radius &&
      (p.capacity == null || p.capacity >= c.people),
  );
  if (hasStyle(c, "food"))
    candidates = candidates.filter(isMealPlace);
  else if (hasStyle(c, "play"))
    candidates = candidates.filter((p) => !isMealPlace(p));
  if (hasStyle(c, "exhibit"))
    candidates = candidates.filter(isExhibitPlace);
  if (hasStyle(c, "hidden")) {
    const gems = candidates.filter(isHiddenGem);
    if (gems.length >= 4) candidates = gems;
  }
  if (hasStyle(c, "access")) {
    candidates = candidates.filter((p) => !isUnevenPlace(p) || accessFlags(p).parking);
    const friendly = candidates.filter(isAccessFriendly);
    if (friendly.length >= 4) candidates = friendly;
    const sample = candidates.find((p) => Number.isFinite(p.originElevation));
    if (sample && !Number.isFinite(c.origin.elevation))
      c = { ...c, origin: { ...c.origin, elevation: sample.originElevation } };
  }
  const tokens = c.keyword
    .trim()
    .split(/[,，\s]+/)
    .filter(Boolean);
  const meaningful = tokens.filter(
    (t) => !["곳", "한적한", "조용한"].includes(t),
  );
  if (meaningful.length)
    candidates = candidates.filter((p) =>
      meaningful.some((t) => (p.name + " " + p.keywords).includes(t)),
    );
  if (
    tokens.some((t) => ["조용한", "한적한"].includes(t)) &&
    candidates.some((p) => p.demo)
  )
    candidates = candidates.filter((p) => p.quiet);
  const weekday = new Date(c.date + "T12:00:00").getDay();
  candidates = candidates.filter((p) => !p.closedDays?.includes(weekday));
  candidates = candidates.map((p) => ({ ...p, stay: typicalStay(p) }));
  const { start, end: rawEnd } = timeWindow(c);
  const end =
    c.transport === "transit"
      ? Math.min(rawEnd, 1439)
      : Math.min(rawEnd, 1260);
  if (end <= start) return [];
  const span = end - start;
  const slackReserve = hasStyle(c, "tight") || hasStyle(c, "eager")
    ? 0
    : hasStyle(c, "relaxed")
      ? Math.min(Math.max(25, Math.round(span * 0.22)), Math.max(0, Math.floor(span / 2)))
      : Math.min(
          Math.max(15, Math.round(span * 0.1)),
          Math.max(0, Math.floor(span / 3)),
        );
  const packEnd = end - slackReserve > start ? end - slackReserve : end;
  const tryPack = (seed, pool, required = []) =>
    packCourse(seed, pool, c, start, packEnd, weekday, required) ||
    (packEnd < end
      ? packCourse(seed, pool, c, start, end, weekday, required)
      : null);
  const ordered = [...candidates].sort(
    (a, b) => fame(a) - fame(b) || distance(c.origin, a) - distance(c.origin, b),
  );
  const seedList = [];
  const seenSeed = new Set();
  for (const place of [...sectorSeeds(c.origin, candidates), ...ordered]) {
    if (!place || seenSeed.has(place.id)) continue;
    seenSeed.add(place.id);
    seedList.push(place);
  }
  const mustIds = Array.isArray(input.mustInclude)
    ? [
        ...new Set(
          input.mustInclude.filter(
            (id) => typeof id === "string" && id.length > 0 && id.length < 200,
          ),
        ),
      ].slice(0, 24)
    : [];
  const limit =
    Number.isInteger(input.limit) && input.limit >= 2 && input.limit <= 3
      ? input.limit
      : 3;
  const mustPlaces = mustIds
    .map((id) => candidates.find((place) => place.id === id))
    .filter(Boolean);
  const sharedRequired = mustPlaces.length > 0 && mustPlaces.length < 3;
  const groups =
    mustPlaces.length >= 3
      ? splitMustInclude(mustPlaces, c.origin, limit)
      : mustPlaces.length
        ? [mustPlaces]
        : [[]];
  const sharedIds = new Set(
    sharedRequired ? mustPlaces.map((place) => place.id) : [],
  );
  const packed = [];
  const taken = new Set();
  const takenStops = [];
  const poolFor = (allowOverlap, extraIds = []) => {
    const keep = new Set([...sharedIds, ...extraIds]);
    return candidates.filter((place) => {
      if (keep.has(place.id)) return true;
      if (taken.has(place.id)) return allowOverlap > 0;
      if (allowOverlap === 0 && usedNearby(place, takenStops)) return false;
      return true;
    });
  };
  const pushRoute = (route, allowOverlap) => {
    if (!route || packed.some((r) => r.id === route.id || majoritySame(r, route, sharedIds)))
      return false;
    const overlap = route.stops.filter((stop) => {
      if (sharedIds.has(stop.id)) return false;
      return taken.has(stop.id) || usedNearby(stop, takenStops);
    }).length;
    if (overlap > allowOverlap) return false;
    const last = route.stops[route.stops.length - 1];
    route.slack = Math.max(0, end - (last.arrival + last.stay));
    route.score -= overlap * 25;
    packed.push(route);
    for (const stop of route.stops) {
      if (sharedIds.has(stop.id)) continue;
      taken.add(stop.id);
      takenStops.push(stop);
    }
    return true;
  };
  if (mustPlaces.length >= 3) {
    for (const allowOverlap of [0, 1]) {
      for (const group of groups) {
        if (packed.length === limit) break;
        pushRoute(
          tryPack(null, poolFor(allowOverlap, group.map((place) => place.id)), group),
          allowOverlap,
        );
      }
      if (packed.length === limit) break;
    }
    if (packed.length < 2) {
      for (const group of groups) {
        for (const seed of seedList) {
          if (packed.length === limit) break;
          pushRoute(tryPack(seed, candidates, group), 1);
        }
      }
    }
    const uncovered = () =>
      mustPlaces.filter(
        (place) => !packed.some((route) => route.stops.some((stop) => stop.id === place.id)),
      );
    for (const allowOverlap of [0, 1, 8]) {
      const missing = uncovered();
      if (!missing.length || packed.length === limit) break;
      for (const place of missing) {
        if (packed.length === limit) break;
        pushRoute(
          tryPack(place, poolFor(allowOverlap, [place.id]), [place]),
          allowOverlap,
        );
      }
    }
    for (const place of uncovered()) {
      const extra = tryPack(place, candidates, [place]);
      if (!extra) continue;
      if (packed.length < limit) {
        pushRoute(extra, 8);
        continue;
      }
      const drop = packed.findIndex((route) => {
        const uniqueMust = mustPlaces.filter(
          (must) =>
            route.stops.some((stop) => stop.id === must.id) &&
            !packed.some(
              (other) =>
                other !== route && other.stops.some((stop) => stop.id === must.id),
            ),
        );
        return uniqueMust.length === 0;
      });
      if (drop < 0) break;
      packed.splice(drop, 1);
      taken.clear();
      takenStops.length = 0;
      for (const route of packed) {
        for (const stop of route.stops) {
          taken.add(stop.id);
          takenStops.push(stop);
        }
      }
      pushRoute(extra, 8);
    }
  } else {
    for (const allowOverlap of [0, 1]) {
      for (const seed of [null, ...seedList]) {
        if (packed.length === limit) break;
        if (
          seed &&
          allowOverlap === 0 &&
          !sharedIds.has(seed.id) &&
          (taken.has(seed.id) || usedNearby(seed, takenStops))
        )
          continue;
        const route = tryPack(
          seed && (sharedIds.has(seed.id) || allowOverlap > 0 || !taken.has(seed.id))
            ? seed
            : null,
          poolFor(allowOverlap),
          mustPlaces,
        );
        if (
          mustPlaces.length &&
          route &&
          !mustPlaces.every((place) => route.stops.some((stop) => stop.id === place.id))
        )
          continue;
        pushRoute(route, allowOverlap);
      }
      if (packed.length === limit) break;
    }
  }
  packed.sort((a, b) => b.score - a.score);
  const kept = uniqueCourses(
    packed.map((route) => shapeCourse(route, c)),
    limit,
    [...sharedIds],
  );
  if (mustPlaces.length < 3) return kept;
  const missing = () =>
    mustPlaces.filter(
      (place) => !kept.some((route) => route.stops.some((stop) => stop.id === place.id)),
    );
  for (const place of missing()) {
    const extra = tryPack(place, candidates, [place]);
    if (!extra) continue;
    const shaped = shapeCourse(extra, c);
    if (kept.some((route) => route.id === shaped.id)) continue;
    if (kept.length < limit) {
      kept.push(shaped);
      continue;
    }
    const drop = kept.findIndex((route) => {
      const uniqueMust = mustPlaces.filter(
        (must) =>
          route.stops.some((stop) => stop.id === must.id) &&
          !kept.some(
            (other) =>
              other !== route && other.stops.some((stop) => stop.id === must.id),
          ),
      );
      return uniqueMust.length === 0;
    });
    kept.splice(drop < 0 ? kept.length - 1 : drop, 1, shaped);
  }
  return kept;
}
// Demonstration coordinates are generated around the selected origin; these are fictional places.
export function demoPlaces(origin) {
  return DEMO.map((p) => ({
    ...p,
    lat: origin.lat + p.lat - ORIGIN.lat,
    lng: origin.lng + p.lng - ORIGIN.lng,
  })).filter(isInYongsan);
}
export function clock(n) {
  return (
    String(Math.floor(n / 60) % 24).padStart(2, "0") +
    ":" +
    String(n % 60).padStart(2, "0")
  );
}
