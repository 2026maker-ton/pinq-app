import React, { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./maps.js";

export default function MapView({
  demo,
  origin,
  radius,
  stops,
  focused,
  onOrigin,
  onFocus,
}) {
  const host = useRef(null),
    instance = useRef(null),
    onOriginRef = useRef(onOrigin),
    onFocusRef = useRef(onFocus);
  const [ready, setReady] = useState(0),
    [error, setError] = useState("");
  onOriginRef.current = onOrigin;
  onFocusRef.current = onFocus;
  const originRef = useRef(origin);
  originRef.current = origin;
  useEffect(() => {
    if (demo) return;
    let cancelled = false,
      map,
      listener;
    setError("");
    loadGoogleMaps()
      .then(async (maps) => {
        const { Map } = await maps.importLibrary("maps");
        if (cancelled) return;
        map = new Map(host.current, {
          center: originRef.current,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
        });
        instance.current = map;
        listener = map.addListener("click", (e) => {
          e.stop?.();
          if (e.latLng) onOriginRef.current(e.latLng.toJSON());
        });
        setReady((v) => v + 1);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
      listener?.remove();
      if (map) window.google.maps.event.clearInstanceListeners(map);
      instance.current = null;
    };
  }, [demo]);
  useEffect(() => {
    if (demo || !instance.current || !window.google?.maps?.Marker) return;
    const map = instance.current,
      maps = window.google.maps;
    const pin = new maps.Marker({
      map,
      position: origin,
      title: "선택한 출발점",
    });
    const circle = new maps.Circle({
      map,
      center: origin,
      radius,
      fillColor: "#297658",
      fillOpacity: 0.08,
      strokeColor: "#297658",
      strokeWeight: 1,
      clickable: false,
    });
    map.panTo(origin);
    return () => {
      pin.setMap(null);
      circle.setMap(null);
    };
  }, [demo, origin, radius, ready]);
  useEffect(() => {
    if (demo || !instance.current || !window.google?.maps?.Marker) return;
    const map = instance.current,
      maps = window.google.maps;
    const markers = stops.map((p, i) => {
      const marker = new maps.Marker({
        map,
        position: { lat: p.lat, lng: p.lng },
        title: p.name,
        label: { text: String(i + 1), color: "white", fontWeight: "700" },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: focused === p.id ? 19 : 16,
          fillColor: focused === p.id ? "#c8873d" : "#286247",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 3,
        },
      });
      marker.addListener("click", () => onFocusRef.current(p.id));
      return marker;
    });
    // Straight connections only, not navigable roads or turn-by-turn routes.
    const line = new maps.Polyline({
      map,
      path: stops.length
        ? [origin, ...stops.map((p) => ({ lat: p.lat, lng: p.lng }))]
        : [],
      strokeColor: "#296f56",
      strokeOpacity: 0.6,
      strokeWeight: 3,
      clickable: false,
    });
    const selected = stops.find((p) => p.id === focused);
    if (selected) map.panTo({ lat: selected.lat, lng: selected.lng });
    return () => {
      markers.forEach((m) => {
        maps.event.clearInstanceListeners(m);
        m.setMap(null);
      });
      line.setMap(null);
    };
  }, [demo, stops, focused, origin, ready]);
  if (!demo)
    return (
      <div className="map-wrap">
        <div className="real-map" ref={host} />
        {error && (
          <div className="map-error" role="alert">
            {error}
            <br />
            예시 모드로 전환해서 먼저 실행해볼 수 있어요.
          </div>
        )}
        <span className="map-caption">
          지도를 클릭해 출발점 선택 · 연결선은 방문 순서 표시
        </span>
      </div>
    );
  const xy = (p) => ({
    x: 50 + (p.lng - origin.lng) * 6000,
    y: 50 - (p.lat - origin.lat) * 7000,
  });
  const paths = [{ x: 50, y: 50 }, ...stops.map(xy)];
  return (
    <div
      className="demo-map"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onOrigin({
          lat:
            origin.lat - ((100 * (e.clientY - r.top)) / r.height - 50) / 7000,
          lng:
            origin.lng + ((100 * (e.clientX - r.left)) / r.width - 50) / 6000,
        });
      }}
    >
      <div className="park p1">작은 쉼터</div>
      <div className="park p2">우리 동네 공원</div>
      <div className="river" />
      <span className="street s1">느긋한 골목</span>
      <span className="street s2">새로운 발견이 있는 길</span>
      <svg
        className="route-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <ellipse
          cx="50"
          cy="50"
          rx={Math.min(43, radius / 30)}
          ry={Math.min(43, radius / 30)}
          fill="#28755212"
          stroke="#287552"
          strokeDasharray="1 1"
          strokeWidth=".25"
        />
        {stops.length > 0 && (
          <polyline
            points={paths.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#257154"
            strokeWidth=".6"
            strokeDasharray="1 1"
          />
        )}
      </svg>
      <button
        className="origin-pin"
        style={{ left: "50%", top: "50%" }}
        onClick={(e) => e.stopPropagation()}
        title="출발점"
      >
        출발
      </button>
      {stops.map((p, i) => {
        const pos = xy(p);
        return (
          <button
            key={p.id}
            className={"demo-pin" + (focused === p.id ? " selected" : "")}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onClick={(e) => {
              e.stopPropagation();
              onFocus(p.id);
            }}
            title={p.name}
          >
            {i + 1}
          </button>
        );
      })}
      <span className="map-caption">
        예시 지도 · 실제 지리와 무관 · 클릭해서 출발점 이동
      </span>
    </div>
  );
}
