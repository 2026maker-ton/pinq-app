import React, { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./maps.js";
import { YONGSAN_BOUNDS, YONGSAN_FEATURES } from "./region.mjs";

export default function MapView({
  demo,
  dark,
  origin,
  radius,
  stops,
  places,
  focused,
  bottomPadding,
  onOrigin,
  onFocus,
  onPlace,
}) {
  const host = useRef(null),
    instance = useRef(null),
    onOriginRef = useRef(onOrigin),
    onFocusRef = useRef(onFocus),
    onPlaceRef = useRef(onPlace);
  const [ready, setReady] = useState(0),
    [error, setError] = useState("");
  onOriginRef.current = onOrigin;
  onFocusRef.current = onFocus;
  onPlaceRef.current = onPlace;
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
          fullscreenControl: false,
          zoomControl: false,
          restriction: { latLngBounds: YONGSAN_BOUNDS, strictBounds: false },
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
    if (demo || !instance.current || !window.google?.maps?.Polygon) return;
    const maps = window.google.maps;
    const outlines = YONGSAN_FEATURES.flatMap((feature) => feature.geometry.coordinates.map((polygon) => new maps.Polygon({
      map: instance.current,
      paths: polygon.map((ring) => ring.map(([lng, lat]) => ({ lat, lng }))),
      strokeColor: "#4285f4", strokeOpacity: 0.48, strokeWeight: 1,
      fillColor: "#4285f4", fillOpacity: 0.025, clickable: false,
    })));
    return () => outlines.forEach((outline) => outline.setMap(null));
  }, [demo, ready]);
  useEffect(() => {
    if (demo || !instance.current) return;
    instance.current.setOptions({
      styles: dark ? [
        { elementType: "geometry", stylers: [{ color: "#1d2a40" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#a5b7d0" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1d2a40" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#344762" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#122b4b" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#234538" }] },
      ] : [],
    });
  }, [demo, dark, ready]);
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
      fillColor: "#4285f4",
      fillOpacity: 0.08,
      strokeColor: "#4285f4",
      strokeWeight: 1,
      clickable: false,
    });
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
          fillColor: focused === p.id ? "#f4a34e" : "#4285f4",
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
      strokeColor: "#4285f4",
      strokeOpacity: 0.6,
      strokeWeight: 3,
      clickable: false,
    });
    return () => {
      markers.forEach((m) => {
        maps.event.clearInstanceListeners(m);
        m.setMap(null);
      });
      line.setMap(null);
    };
  }, [demo, stops, focused, origin, ready]);
  useEffect(() => {
    if (demo || !instance.current || !window.google?.maps?.Marker) return;
    const maps = window.google.maps;
    const routeIds = new Set(stops.map((p) => p.id));
    const pins = places.filter((p) => !routeIds.has(p.id)).map((p) => {
      const pin = new maps.Marker({
        map: instance.current, position: { lat: p.lat, lng: p.lng }, title: p.name,
        icon: { path: maps.SymbolPath.CIRCLE, scale: focused === p.id ? 9 : 5,
          fillColor: focused === p.id ? "#f4a34e" : "#87aef2", fillOpacity: .9,
          strokeColor: "#ffffff", strokeWeight: 1.5 },
      });
      pin.addListener("click", () => onPlaceRef.current(p.id));
      return pin;
    });
    return () => pins.forEach((pin) => { maps.event.clearInstanceListeners(pin); pin.setMap(null); });
  }, [demo, places, stops, focused, ready]);
  useEffect(() => {
    if (demo || !instance.current || !window.google?.maps?.LatLngBounds) return;
    const maps = window.google.maps;
    const bounds = new maps.LatLngBounds();
    const selected = stops.find((p) => p.id === focused) ?? places.find((p) => p.id === focused);
    if (selected) bounds.extend({ lat: selected.lat, lng: selected.lng });
    else {
      bounds.extend(origin);
      (stops.length ? stops : places).forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    }
    const height = host.current?.clientHeight ?? window.innerHeight;
    const bottom = Math.min(bottomPadding + 20, height - 150);
    instance.current.fitBounds(bounds, { top: 190, bottom, left: 40, right: 40 });
    if (!stops.length || selected) instance.current.setZoom(15);
  }, [demo, stops, places, origin, focused, bottomPadding, ready]);
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
  const centerY = Math.max(23, Math.min(50, ((window.innerHeight - bottomPadding + 170) / 2 / window.innerHeight) * 100));
  const xy = (p) => ({
    x: 50 + (p.lng - origin.lng) * 6000,
    y: centerY - (p.lat - origin.lat) * 7000,
  });
  const paths = [{ x: 50, y: centerY }, ...stops.map(xy)];
  return (
    <div
      className="demo-map"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onOrigin({
          lat:
            origin.lat - ((100 * (e.clientY - r.top)) / r.height - centerY) / 7000,
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
          cy={centerY}
          rx={Math.min(43, radius / 30)}
          ry={Math.min(43, radius / 30)}
          fill="#4285f412"
          stroke="#4285f4"
          strokeDasharray="1 1"
          strokeWidth=".25"
        />
        {stops.length > 0 && (
          <polyline
            points={paths.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#4285f4"
            strokeWidth=".6"
            strokeDasharray="1 1"
          />
        )}
      </svg>
      <button
        className="origin-pin"
        style={{ left: "50%", top: `${centerY}%` }}
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
      {places.filter((p) => !stops.some((stop) => stop.id === p.id)).map((p) => {
        const pos = xy(p);
        return <button key={p.id} className={"browse-pin" + (focused === p.id ? " selected" : "")}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onClick={(e) => { e.stopPropagation(); onPlace(p.id); }} title={p.name} aria-label={`${p.name} 정보 보기`} />;
      })}
      <span className="map-caption">
        예시 지도 · 실제 지리와 무관 · 클릭해서 출발점 이동
      </span>
    </div>
  );
}
