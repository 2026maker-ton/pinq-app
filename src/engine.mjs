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
export function distance(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const t =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(t), Math.sqrt(1 - t));
}
export function validate(c) {
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
    !["all", "cafe", "culture", "nature"].includes(c.theme) ||
    !["walk", "bike", "transit"].includes(c.transport)
  )
    throw Error("테마와 이동 방법을 다시 선택해주세요.");
  if (
    typeof c.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(c.date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(c.time)
  )
    throw Error("방문 날짜와 시간을 확인해주세요.");
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
export function createCourses(raw, c, strategy = "balanced") {
  validate(c);
  if (!["balanced", "local", "quiet"].includes(strategy))
    throw Error("추천 기준을 확인해주세요.");
  let candidates = raw.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      Number.isFinite(p.price) &&
      p.price >= 0 &&
      Number.isFinite(p.stay) &&
      p.stay > 0 &&
      isInYongsan(p) &&
      (!c.verifiedOnly || p.demo) &&
      distance(c.origin, p) <= c.radius &&
      (p.capacity == null || p.capacity >= c.people),
  );
  if (c.theme !== "all")
    candidates = candidates.filter(
      (p) => p.type === c.theme || (c.theme === "cafe" && p.type === "food"),
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
  const start = c.time
    .split(":")
    .reduce((a, v, i) => a + Number(v) * (i ? 1 : 60), 0);
  const courses = [];
  for (let a = 0; a < candidates.length; a++)
    for (let b = a + 1; b < candidates.length; b++)
      for (let d = b + 1; d < candidates.length; d++) {
        let remaining = [candidates[a], candidates[b], candidates[d]],
          prev = c.origin,
          t = start,
          totalMeters = 0,
          stops = [],
          valid = true;
        while (remaining.length) {
          remaining.sort((x, y) => distance(prev, x) - distance(prev, y));
          const p = remaining.shift();
          const meters = distance(prev, p) * 1.3;
          const minutes =
            Math.max(
              3,
              Math.ceil(
                meters /
                  (c.transport === "walk"
                    ? 70
                    : c.transport === "bike"
                      ? 180
                      : 240),
              ),
            ) + (c.transport === "transit" ? 8 : 0);
          const arrival = t + minutes;
          if (
            c.transport !== "transit" &&
            (t < 360 || t >= 1260 || arrival + p.stay > 1260)
          )
            valid = false;
          if (p.demo && (arrival < p.open || arrival + p.stay > p.close))
            valid = false;
          if (arrival + p.stay >= 1440) valid = false;
          stops.push({ ...p, arrival, move: minutes });
          t = arrival + p.stay;
          totalMeters += meters;
          prev = p;
        }
        const food =
          stops
            .filter((p) => ["cafe", "food"].includes(p.type))
            .reduce((s, p) => s + p.price, 0) * c.people;
        const play =
          stops
            .filter((p) => !["cafe", "food"].includes(p.type))
            .reduce((s, p) => s + p.price, 0) * c.people;
        const transit =
          c.transport === "transit" ? c.people * 1600 * stops.length : 0;
        const total = food + play + transit;
        if (!valid || total > c.budget) continue;
        const local = stops.filter((p) => p.local).length,
          quiet = stops.filter((p) => p.quiet).length,
          diversity = new Set(stops.map((p) => p.type)).size;
        const score =
          (strategy === "local"
            ? local * 12
            : strategy === "quiet"
              ? quiet * 12
              : diversity * 12) +
          local * 2 +
          quiet -
          totalMeters / 2000 -
          total / 100000;
        courses.push({
          id: stops.map((p) => p.id).join("-"),
          stops,
          food,
          play,
          transit,
          total,
          duration: t - start,
          distance: totalMeters,
          local,
          quiet,
          score,
          unknown: !stops.every((p) => p.demo),
        });
      }
  courses.sort((a, b) => b.score - a.score);
  const result = [];
  for (const route of courses) {
    if (
      result.every(
        (r) =>
          r.stops.filter((p) => route.stops.some((q) => q.id === p.id)).length <
          3,
      )
    ) {
      result.push(route);
      if (result.length === 3) break;
    }
  }
  return result;
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
