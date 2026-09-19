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
}));
export const money = (n) => Math.round(n).toLocaleString("ko-KR") + "원";
export const STYLE_ENUM = ["cafe", "culture", "nature", "local", "quiet"];
const PLACE_STYLES = ["cafe", "culture", "nature"];
function matchesPlaceStyle(place, style) {
  return place.type === style || (style === "cafe" && place.type === "food");
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
function travelMinutes(meters, transport) {
  return (
    Math.max(
      3,
      Math.ceil(meters / (transport === "walk" ? 70 : transport === "bike" ? 180 : 240)),
    ) + (transport === "transit" ? 8 : 0)
  );
}
function stopCost(place, c) {
  return place.price * c.people + (c.transport === "transit" ? c.people * 1600 : 0);
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
export function typicalStay(place) {
  if (place?.demo && Number.isFinite(place.stay) && place.stay > 0) return place.stay;
  const types = Array.isArray(place?.types) ? place.types : [];
  if (types.includes("book_store")) return 35;
  if (types.some((t) => t === "museum" || t === "art_gallery")) return 70;
  if (place?.type === "cafe") return 45;
  if (place?.type === "food") return 60;
  return 40;
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
  for (const style of c.styles || []) {
    if (why.length >= 2) break;
    if (style === "cafe" && matchesPlaceStyle(place, "cafe") && !why.includes("카페"))
      why.push("카페");
    else if (style === "culture" && place.type === "culture" && !why.includes("문화"))
      why.push("문화");
    else if (style === "nature" && place.type === "nature" && !why.includes("공원"))
      why.push("공원");
    else if (style === "local" && place.local && !why.includes("동네")) why.push("동네");
    else if (style === "quiet" && place.quiet && !why.includes("한적")) why.push("한적");
  }
  if (!why.length) why.push(KIND_WHY[place.type] || "추천");
  return why.slice(0, 2);
}
export function styleSearchGroups(styles = []) {
  const groups = [];
  if (styles.includes("cafe")) groups.push("food");
  if (styles.includes("culture")) groups.push("culture");
  if (styles.includes("nature")) groups.push("nature");
  return groups.length ? groups : ["food", "culture", "nature"];
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
    origin: origin ? { lat: origin.lat, lng: origin.lng } : origin,
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
      total: route.total,
      shop: route.shop,
      public: route.public,
    },
    route_info: {
      estimated: true,
      transportation: c.transport,
      duration_min: route.duration,
      distance_m: route.distance,
      legs,
    },
    unknown: stops.some((stop) => stop.business_status === "unknown"),
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
  const stay = typicalStay(place);
  const meters = distance(prev, place) * 1.3;
  const minutes = travelMinutes(meters, c.transport);
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
  return { meters, minutes, arrival, leave, business_status, cost, stay };
}
function packCourse(seed, candidates, c, start, end, weekday, preferLocal, preferQuiet) {
  const used = new Set();
  const stops = [];
  let prev = c.origin,
    t = start,
    totalMeters = 0,
    spent = 0;
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
      why: placeWhy(place, c, step.arrival),
    });
    t = step.leave;
    totalMeters += step.meters;
    spent += step.cost;
    prev = place;
  };
  if (seed) {
    const step = visitStep(seed, prev, t, end, c, weekday, spent);
    if (!step) return null;
    add(seed, step);
  }
  while (stops.length < 8) {
    let best = null;
    for (const place of candidates) {
      if (used.has(place.id)) continue;
      const step = visitStep(place, prev, t, end, c, weekday, spent);
      if (!step) continue;
      const typeBonus = stops.some((s) => s.type === place.type) ? 0 : 80;
      const rank = step.meters - typeBonus;
      if (!best || rank < best.rank) best = { place, step, rank };
    }
    if (!best) break;
    add(best.place, best.step);
  }
  if (!stops.length) return null;
  const last = stops[stops.length - 1];
  const duration = last.arrival + last.stay - start;
  const food =
    stops
      .filter((p) => ["cafe", "food"].includes(p.type))
      .reduce((s, p) => s + p.price, 0) * c.people;
  const play =
    stops
      .filter((p) => !["cafe", "food"].includes(p.type))
      .reduce((s, p) => s + p.price, 0) * c.people;
  const transit = c.transport === "transit" ? c.people * 1600 * stops.length : 0;
  const total = food + play + transit;
  if (total > c.budget) return null;
  const shop =
    stops.filter((p) => p.payee === "shop").reduce((s, p) => s + p.price, 0) *
    c.people;
  const publicCost =
    stops.filter((p) => p.payee === "public").reduce((s, p) => s + p.price, 0) *
    c.people;
  const local = stops.filter((p) => p.local).length,
    quiet = stops.filter((p) => p.quiet).length,
    diversity = new Set(stops.map((p) => p.type)).size;
  const fill = end > start ? duration / (end - start) : 0;
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
      fill * 24 +
      (preferLocal ? local * 12 : 0) +
      (preferQuiet ? quiet * 12 : 0) +
      (preferLocal || preferQuiet ? 0 : diversity * 12) +
      local * 2 +
      quiet -
      totalMeters / 2000 -
      total / 100000,
  };
}
export function createCourses(raw, input) {
  const c = validate(input);
  const typeStyles = c.styles.filter((style) => PLACE_STYLES.includes(style));
  const preferLocal = c.styles.includes("local");
  const preferQuiet = c.styles.includes("quiet");
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
  if (typeStyles.length)
    candidates = candidates.filter((p) =>
      typeStyles.some((style) => matchesPlaceStyle(p, style)),
    );
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
  const slackReserve = Math.min(
    Math.max(15, Math.round(span * 0.1)),
    Math.max(0, Math.floor(span / 3)),
  );
  const packEnd = end - slackReserve > start ? end - slackReserve : end;
  const ordered = [...candidates].sort(
    (a, b) => distance(c.origin, a) - distance(c.origin, b),
  );
  const packed = [];
  for (const seed of [null, ...ordered]) {
    const route =
      packCourse(
        seed,
        candidates,
        c,
        start,
        packEnd,
        weekday,
        preferLocal,
        preferQuiet,
      ) ||
      (packEnd < end
        ? packCourse(
            seed,
            candidates,
            c,
            start,
            end,
            weekday,
            preferLocal,
            preferQuiet,
          )
        : null);
    if (!route || packed.some((r) => r.id === route.id)) continue;
    const last = route.stops[route.stops.length - 1];
    route.slack = Math.max(0, end - (last.arrival + last.stay));
    packed.push(route);
    if (packed.length === 3) break;
  }
  packed.sort((a, b) => b.score - a.score);
  return packed.map((route) => shapeCourse(route, c));
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
