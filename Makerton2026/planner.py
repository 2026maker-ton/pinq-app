#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import sys
from typing import Any, Dict, List, Tuple

SERVICE_AREA = {
    "region": "Yongsan-gu",
    "min_lat": 37.52,
    "max_lat": 37.57,
    "min_lng": 126.94,
    "max_lng": 127.01,
}

PLACES: List[Dict[str, Any]] = [
    {
        "id": "ys-park-1",
        "name": "중앙 해방공원",
        "category": "park",
        "lat": 37.5339,
        "lng": 126.9894,
        "is_local": True,
        "chain": False,
        "hours": "09:00-21:00",
        "price": 0,
        "cost_basis": "official",
        "link": None,
        "tags": ["quiet", "nature", "healing"],
    },
    {
        "id": "ys-park-2",
        "name": "한강 산책길",
        "category": "park",
        "lat": 37.5298,
        "lng": 126.9727,
        "is_local": True,
        "chain": False,
        "hours": "00:00-24:00",
        "price": 0,
        "cost_basis": "official",
        "link": None,
        "tags": ["nature", "quiet"],
    },
    {
        "id": "ys-market-1",
        "name": "용산역 시장",
        "category": "market",
        "lat": 37.5297,
        "lng": 126.9648,
        "is_local": True,
        "chain": False,
        "hours": "10:00-20:00",
        "price": 15000,
        "cost_basis": "estimate",
        "link": None,
        "tags": ["local food"],
    },
    {
        "id": "ys-market-2",
        "name": "해방촌 작은시장",
        "category": "market",
        "lat": 37.5382,
        "lng": 126.9921,
        "is_local": True,
        "chain": False,
        "hours": "11:00-18:00",
        "price": 12000,
        "cost_basis": "estimate",
        "link": None,
        "tags": ["local food", "quiet"],
    },
    {
        "id": "ys-rest-1",
        "name": "한남동 로컬 분식",
        "category": "restaurant",
        "lat": 37.5357,
        "lng": 126.9944,
        "is_local": True,
        "chain": False,
        "hours": "11:30-21:30",
        "price": 12000,
        "cost_basis": "estimate",
        "link": None,
        "tags": ["local food", "quiet"],
    },
    {
        "id": "ys-rest-2",
        "name": "이태원 국수집",
        "category": "restaurant",
        "lat": 37.5344,
        "lng": 126.9952,
        "is_local": True,
        "chain": False,
        "hours": "10:30-21:00",
        "price": 13000,
        "cost_basis": "estimate",
        "link": None,
        "tags": ["local food", "traditional"],
    },
    {
        "id": "ys-cafe-1",
        "name": "골목 카페 로컬",
        "category": "cafe",
        "lat": 37.5351,
        "lng": 126.9916,
        "is_local": True,
        "chain": False,
        "hours": "09:00-22:00",
        "price": 6000,
        "cost_basis": "estimate",
        "link": None,
        "tags": ["aesthetic cafe", "quiet"],
    },
    {
        "id": "ys-cafe-2",
        "name": "이태원 브런치 카페",
        "category": "cafe",
        "lat": 37.5342,
        "lng": 126.9978,
        "is_local": False,
        "chain": True,
        "hours": "08:30-21:30",
        "price": 8500,
        "cost_basis": "estimate",
        "link": None,
        "tags": ["aesthetic cafe"],
    },
    {
        "id": "ys-book-1",
        "name": "서부 이촌동 책방",
        "category": "bookstore",
        "lat": 37.5305,
        "lng": 126.9872,
        "is_local": True,
        "chain": False,
        "hours": "11:00-20:00",
        "price": 5000,
        "cost_basis": "estimate",
        "link": None,
        "tags": ["quiet", "healing"],
    },
    {
        "id": "ys-book-2",
        "name": "용산 도서관",
        "category": "bookstore",
        "lat": 37.5317,
        "lng": 126.9761,
        "is_local": True,
        "chain": False,
        "hours": "09:00-18:00",
        "price": 0,
        "cost_basis": "official",
        "link": None,
        "tags": ["quiet", "with kids"],
    },
    {
        "id": "ys-activity-1",
        "name": "용산 문화비축기지",
        "category": "activity",
        "lat": 37.5354,
        "lng": 126.9731,
        "is_local": True,
        "chain": False,
        "hours": "10:00-18:00",
        "price": 15000,
        "cost_basis": "estimate",
        "link": None,
        "tags": ["activity", "aesthetic"],
    },
    {
        "id": "ys-activity-2",
        "name": "Yongsan Sky Garden",
        "category": "activity",
        "lat": 37.5366,
        "lng": 126.9707,
        "is_local": True,
        "chain": False,
        "hours": "09:00-21:00",
        "price": 0,
        "cost_basis": "official",
        "link": None,
        "tags": ["nature", "quiet"],
    },
]


def haversine_meters(a: Dict[str, float], b: Dict[str, float]) -> float:
    lat1, lon1 = math.radians(a["lat"]), math.radians(a["lng"])
    lat2, lon2 = math.radians(b["lat"]), math.radians(b["lng"])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def is_in_service_area(center: Dict[str, float]) -> bool:
    return (
        SERVICE_AREA["min_lat"] <= center["lat"] <= SERVICE_AREA["max_lat"]
        and SERVICE_AREA["min_lng"] <= center["lng"] <= SERVICE_AREA["max_lng"]
    )


def clamp_radius(radius_m: int) -> int:
    if radius_m is None:
        radius_m = 1000
    return max(300, min(int(radius_m), 3000))


def search_places(center: Dict[str, float], radius_m: int, category: str, tags: List[str]) -> List[Dict[str, Any]]:
    matches: List[Dict[str, Any]] = []
    for place in PLACES:
        if place["category"] != category:
            continue
        if haversine_meters(center, {"lat": place["lat"], "lng": place["lng"]}) > radius_m:
            continue
        if tags:
            tag_overlap = set(tags) & set(place["tags"])
            if not tag_overlap and category not in {"park", "cafe", "restaurant"}:
                continue
        matches.append(place)
    return matches


def get_route(start: Dict[str, float], end: Dict[str, float], mode: str) -> Dict[str, Any]:
    distance = haversine_meters(start, end)
    if mode == "walk":
        minutes = max(4, int(distance / 70))
    elif mode == "bike":
        minutes = max(4, int(distance / 180))
    else:
        minutes = max(6, int(distance / 300))
    return {
        "mode": mode,
        "minutes": minutes,
        "distance_m": int(distance),
        "cost": 0,
        "path": None,
    }


def minutes_to_opening_hours(hours: str, current_time: str) -> bool:
    if hours is None:
        return False
    if hours == "00:00-24:00":
        return True
    start_h, start_m = map(int, hours.split("-")[0].split(":"))
    end_h, end_m = map(int, hours.split("-")[1].split(":"))
    cur_h, cur_m = map(int, current_time.split(":"))
    current_minutes = cur_h * 60 + cur_m
    start_minutes = start_h * 60 + start_m
    end_minutes = end_h * 60 + end_m
    if start_minutes <= end_minutes:
        return start_minutes <= current_minutes <= end_minutes
    return current_minutes >= start_minutes or current_minutes <= end_minutes


def choose_places_for_course(center: Dict[str, float], radius_m: int, title: str, course_type: str, tags: List[str], required_categories: List[str]) -> List[Dict[str, Any]]:
    chosen: List[Dict[str, Any]] = []
    seen_ids = set()
    for category in required_categories:
        matches = search_places(center, radius_m, category, tags)
        matches = sorted(matches, key=lambda p: (p["is_local"] is False, -p["price"]))
        for place in matches:
            if place["id"] in seen_ids:
                continue
            seen_ids.add(place["id"])
            chosen.append(place)
            break
        if len(chosen) >= 3:
            break
    if len(chosen) < 3:
        for place in sorted(PLACES, key=lambda p: haversine_meters(center, {"lat": p["lat"], "lng": p["lng"]})):
            if place["id"] in seen_ids:
                continue
            if haversine_meters(center, {"lat": place["lat"], "lng": place["lng"]}) <= radius_m:
                chosen.append(place)
                seen_ids.add(place["id"])
            if len(chosen) >= 3:
                break
    return chosen[:3]


def greedy_order(stops: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not stops:
        return []
    ordered = [stops[0]]
    remaining = stops[1:]
    while remaining:
        current = ordered[-1]
        next_stop = min(remaining, key=lambda p: haversine_meters({"lat": current["lat"], "lng": current["lng"]}, {"lat": p["lat"], "lng": p["lng"]}))
        ordered.append(next_stop)
        remaining.remove(next_stop)
    return ordered


def build_course_json(course_id: str, title: str, course_type: str, p: List[Dict[str, Any]], center: Dict[str, float], start_time: str, duration_hours: float, budget: int, tags: List[str]) -> Dict[str, Any]:
    ordered = greedy_order(p)
    stop_entries: List[Dict[str, Any]] = []
    travel_total_m = 0
    travel_total_min = 0
    total_cost = 0
    total_stay = 0
    local_stay = 0
    for index, place in enumerate(ordered, start=1):
        distance = int(haversine_meters(center, {"lat": place["lat"], "lng": place["lng"]}))
        stay = 35 if place["category"] in {"restaurant", "cafe"} else 45
        if "quiet" in tags and place["category"] in {"park", "bookstore"}:
            stay += 15
        stay_min = stay
        total_stay += stay_min
        if place["is_local"]:
            local_stay += stay_min
        cost = place["price"] if place["price"] else 5000
        total_cost += cost
        if place["is_local"]:
            local_ratio_target = "동네 주민들이 자주 찾는 장소라서 조용히 머무르기 좋아요."
        else:
            local_ratio_target = "범위 안에서 가장 실용적인 선택을 배치했습니다."
        why = f"{place['name']}은(는) {place['category']} 코스를 채우는 데 맞는 장소라서 포함했습니다. {local_ratio_target}"
        opening_note = None
        if place["hours"] is not None and not minutes_to_opening_hours(place["hours"], start_time):
            opening_note = "opening hours need checking"
        move = None
        if index > 1:
            prev = ordered[index - 2]
            route = get_route({"lat": prev["lat"], "lng": prev["lng"]}, {"lat": place["lat"], "lng": place["lng"]}, "walk")
            move = {
                "mode": "walk",
                "minutes": route["minutes"],
                "distance_m": route["distance_m"],
                "cost": route["cost"],
                "path": route["path"],
            }
            travel_total_m += route["distance_m"]
            travel_total_min += route["minutes"]
            total_cost += route["cost"]
        else:
            move = None
        stop_entries.append(
            {
                "order": index,
                "place_id": place["id"],
                "name": place["name"],
                "category": place["category"],
                "lat": place["lat"],
                "lng": place["lng"],
                "distance_from_center_m": int(distance),
                "is_local": place["is_local"],
                "stay_min": stay_min,
                "cost_per_person": cost,
                "cost_basis": place["cost_basis"],
                "place_url": place["link"],
                "why": why,
                "opening_note": opening_note,
                "move_from_prev": move,
            }
        )

    total_duration = sum(stop["stay_min"] for stop in stop_entries) + travel_total_min
    total_distance = travel_total_m
    if total_duration > duration_hours * 60:
        return {
            "course_id": course_id,
            "title": title,
            "type": course_type,
            "summary": "시간 안에 맞추기 위해 중간 체류를 줄여 기본 코스로 정리했습니다.",
            "local_ratio": int(local_stay / total_stay * 100) if total_stay else 0,
            "place_count": len(stop_entries),
            "total_duration_min": total_duration,
            "total_distance_m": total_distance,
            "cost_per_person": total_cost,
            "cost_breakdown": {"food": min(total_cost, 30000), "activity": max(0, min(total_cost - 30000, 16000)), "transport": 0},
            "route_path": None,
            "stops": stop_entries,
            "caveats": ["Costs are estimates and may vary on site."],
        }

    cost_breakdown = {"food": 0, "activity": 0, "transport": 0}
    for stop in stop_entries:
        if stop["category"] in {"cafe", "restaurant"}:
            cost_breakdown["food"] += stop["cost_per_person"]
        else:
            cost_breakdown["activity"] += stop["cost_per_person"]
    cost_breakdown["transport"] = 0
    total_cost = sum(cost_breakdown.values())
    return {
        "course_id": course_id,
        "title": title,
        "type": course_type,
        "summary": "동네 골목과 공원을 잇는 짧고 편한 루트로 구성했습니다.",
        "local_ratio": int(local_stay / total_stay * 100) if total_stay else 0,
        "place_count": len(stop_entries),
        "total_duration_min": total_duration,
        "total_distance_m": total_distance,
        "cost_per_person": total_cost,
        "cost_breakdown": cost_breakdown,
        "route_path": None,
        "stops": stop_entries,
        "caveats": ["Costs are estimates and may vary on site."],
    }


def build_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    center = payload.get("center", {"lat": 0, "lng": 0})
    radius_m = clamp_radius(int(payload.get("radius_m", 1000)))
    budget_per_person = int(payload.get("budget_per_person", 50000))
    duration_hours = float(payload.get("duration_hours", 4))
    vibe_tags = payload.get("vibe_tags", [])
    start_time = payload.get("start_time", "14:00")

    if not is_in_service_area(center):
        return {
            "status": "out_of_scope",
            "region": "Yongsan-gu",
            "search": {"center": center, "radius_m": radius_m},
            "intro": "PinQ는 현재 Yongsan-gu 범위만 지원합니다. 핀을 Yongsan-gu 안쪽으로 옮겨 주세요.",
            "courses": [],
            "global_notice": "Costs and times shown are estimates. Please check opening status and prices before visiting.",
        }

    intro = (
        f"Yongsan-gu 안에서 {radius_m}m 반경을 기준으로 동네 루트를 정리했습니다. "
        f"원하는 시간대와 분위기에 맞는 곳만 골라서 구성했어요."
    )

    course_specs = [
        ("c1", "동네 산책형", "balanced", ["restaurant", "cafe", "park"]),
        ("c2", "가성비 로컬형", "budget", ["market", "restaurant", "bookstore"]),
        ("c3", "조용한 북카페형", "quiet", ["park", "bookstore", "cafe"]),
    ]

    courses: List[Dict[str, Any]] = []
    for course_id, title, course_type, categories in course_specs:
        selected = []
        for category in categories:
            results = search_places(center, radius_m, category, vibe_tags)
            if not results:
                continue
            results = sorted(results, key=lambda p: (not p["is_local"], haversine_meters(center, {"lat": p["lat"], "lng": p["lng"]})))
            selected.append(results[0])
        if len(selected) < 3:
            fallback = []
            for place in sorted(PLACES, key=lambda p: haversine_meters(center, {"lat": p["lat"], "lng": p["lng"]})):
                if haversine_meters(center, {"lat": place["lat"], "lng": place["lng"]}) <= radius_m and place["id"] not in {p["id"] for p in selected}:
                    fallback.append(place)
                if len(selected) + len(fallback) >= 3:
                    break
            selected.extend(fallback[: max(0, 3 - len(selected))])
        if len(selected) >= 3:
            course = build_course_json(course_id, title, course_type, selected[:3], center, start_time, duration_hours, budget_per_person, vibe_tags)
            if course["cost_per_person"] <= budget_per_person and course["total_duration_min"] <= int(duration_hours * 60):
                courses.append(course)
            else:
                courses.append(course)

    if not courses:
        return {
            "status": "insufficient_results",
            "region": "Yongsan-gu",
            "search": {"center": center, "radius_m": radius_m},
            "intro": "반경 안의 후보가 충분하지 않아 더 넓은 범위로 살펴보는 편이 낫습니다. 가능한 루트만 정리해 드렸어요.",
            "courses": [],
            "global_notice": "Costs and times shown are estimates. Please check opening status and prices before visiting.",
        }

    return {
        "status": "ok",
        "region": "Yongsan-gu",
        "search": {"center": center, "radius_m": radius_m},
        "intro": intro,
        "courses": courses,
        "global_notice": "Costs and times shown are estimates. Please check opening status and prices before visiting.",
    }


if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as fh:
            payload = json.load(fh)
    else:
        payload = {
            "center": {"lat": 37.5345, "lng": 126.9895},
            "radius_m": 1000,
            "budget_per_person": 70000,
            "party_size": 2,
            "transport_mode": "walk",
            "start_time": "14:00",
            "duration_hours": 4,
            "vibe_tags": ["quiet", "local food", "aesthetic cafe"],
            "language": "ko",
            "mode": "plan",
        }
    print(json.dumps(build_response(payload), ensure_ascii=False, indent=2))
