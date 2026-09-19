import { YONGSAN_BOUNDARY } from "./yongsan-boundary.mjs";

export const YONGSAN_CENTER = Object.freeze({ lat: 37.5326, lng: 126.9905 });
export const YONGSAN_BOUNDS = Object.freeze({
  south: 37.50649, north: 37.55539, west: 126.94467, east: 127.02093,
});
export const YONGSAN_FEATURES = YONGSAN_BOUNDARY.features;

function inRing(point, ring) {
  const x = point.lng, y = point.lat;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
    if (Math.abs(cross) < 1e-10 && x >= Math.min(xi, xj) - 1e-10 &&
        x <= Math.max(xi, xj) + 1e-10 && y >= Math.min(yi, yj) - 1e-10 &&
        y <= Math.max(yi, yj) + 1e-10) return true;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

export function isInYongsan(point) {
  if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng)) return false;
  if (point.lat < YONGSAN_BOUNDS.south || point.lat > YONGSAN_BOUNDS.north ||
      point.lng < YONGSAN_BOUNDS.west || point.lng > YONGSAN_BOUNDS.east) return false;
  return YONGSAN_FEATURES.some((feature) => feature.geometry.coordinates.some(
    (polygon) => inRing(point, polygon[0]) && !polygon.slice(1).some((hole) => inRing(point, hole)),
  ));
}

function metersBetween(a, b) {
  const lat = (a.lat + b.lat) * Math.PI / 360;
  const dy = (a.lat - b.lat) * 111195;
  const dx = (a.lng - b.lng) * 111195 * Math.cos(lat);
  return Math.hypot(dx, dy);
}

// At most five centers: the origin plus one distant sample in each quadrant.
// Nearby Search has a 20-result ceiling per request, so these centers widen coverage.
export function coverageCenters(origin, radius) {
  const centers = [origin];
  if (radius <= 1800) return centers;
  const best = new Map();
  for (let lat = YONGSAN_BOUNDS.south + .006; lat < YONGSAN_BOUNDS.north; lat += .012)
    for (let lng = YONGSAN_BOUNDS.west + .007; lng < YONGSAN_BOUNDS.east; lng += .014) {
      const point = { lat, lng };
      const distance = metersBetween(origin, point);
      if (!isInYongsan(point) || distance > radius || distance < 900) continue;
      const sector = `${lat >= origin.lat ? "N" : "S"}${lng >= origin.lng ? "E" : "W"}`;
      if (!best.has(sector) || distance > best.get(sector).distance)
        best.set(sector, { point, distance });
    }
  for (const { point } of best.values()) centers.push(point);
  return centers;
}
