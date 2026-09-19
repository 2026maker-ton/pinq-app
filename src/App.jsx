import React, { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import MapView from "./MapView.jsx";
import { ORIGIN, createCourses, demoPlaces, validate, money, clock } from "./engine.mjs";
import { searchPlaces } from "./maps.js";
import { isInYongsan } from "./region.mjs";

const EMPTY = [];
const today = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const themes = { all: "전체", cafe: "카페·식사", culture: "문화·책방", nature: "공원·자연" };
const transports = { walk: "도보", bike: "자전거", transit: "대중교통" };
const kinds = { nature: "공원", culture: "문화", cafe: "카페", food: "식사" };

function App() {
  const [demo, setDemo] = useState(!process.env.REACT_APP_GOOGLE_MAPS_API_KEY?.trim());
  const [dark, setDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  const [sheet, setSheet] = useState("peek");
  const [sheetHeight, setSheetHeight] = useState(160);
  const [c, setC] = useState({
    origin: ORIGIN, people: 2, budget: 60000, radius: 3000, theme: "all",
    transport: "walk", date: today(), time: "13:00", keyword: "", verifiedOnly: false,
  });
  const [strategy, setStrategy] = useState("balanced");
  const [courses, setCourses] = useState([]);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selected, setSelected] = useState(0);
  const [focused, setFocused] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("지도를 누르거나 조건을 골라 코스를 찾아보세요.");
  const [dirty, setDirty] = useState(false);
  const generation = useRef(0);
  const cache = useRef(null);
  const abort = useRef(null);
  const sheetRef = useRef(null);
  const touchStart = useRef(null);
  const route = courses[selected];
  const night = Number(c.time.slice(0, 2)) >= 21 || Number(c.time.slice(0, 2)) < 6;

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#121b2b" : "#f5f8ff");
  }, [dark]);
  useEffect(() => {
    if (!sheetRef.current) return;
    const observer = new ResizeObserver(([entry]) => setSheetHeight(entry.contentRect.height));
    observer.observe(sheetRef.current);
    return () => observer.disconnect();
  }, []);

  function invalidate() {
    generation.current++;
    abort.current?.abort();
    setBusy(false);
    setCourses([]);
    setPlaces([]);
    setSelectedPlace(null);
    setFocused(null);
    setError("");
    setDirty(true);
    setNotice("조건이 바뀌었어요. 다시 탐색해주세요.");
  }
  function change(key, value) {
    invalidate();
    setC((old) => {
      const next = { ...old, [key]: value };
      if (key === "time" && (Number(value.slice(0, 2)) >= 21 || Number(value.slice(0, 2)) < 6))
        next.transport = "transit";
      return next;
    });
  }
  async function explore(event) {
    event?.preventDefault();
    const id = ++generation.current;
    abort.current?.abort();
    abort.current = new AbortController();
    setCourses([]);
    setPlaces([]);
    setSelected(0);
    setFocused(null);
    setError("");
    setBusy(true);
    setDirty(false);
    setSheet("half");
    setNotice("주변 장소를 조회하고 코스를 검증하고 있어요.");
    try {
      validate(c);
      let places, extra = "";
      if (demo) {
        places = demoPlaces(c.origin);
      } else {
        const key = JSON.stringify([c.origin, c.radius, c.theme]);
        try {
          places = await searchPlaces(c);
          if (id !== generation.current) return;
          cache.current = { key, places };
        } catch (err) {
          if (cache.current?.key === key) {
            places = cache.current.places;
            extra = "이전 조회 결과를 사용했어요. 최신 장소 정보는 확인되지 않았어요. ";
          } else throw Error(`장소 조회 실패: ${err.message}. 지도 키와 Places API 설정을 확인하거나 예시 모드를 사용해주세요.`);
        }
      }
      if (id !== generation.current) return;
      setPlaces(places);
      let result;
      const recommendationUrl = process.env.REACT_APP_RECOMMEND_API_URL || (Capacitor.isNativePlatform() ? null : "/api/recommend");
      try {
        if (!recommendationUrl) throw Error("no API endpoint");
        const response = await fetch(recommendationUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conditions: c, strategy, places, demo }),
          signal: AbortSignal.any([abort.current.signal, AbortSignal.timeout(20000)]),
        });
        if (!response.ok) throw Error("server");
        result = await response.json();
        if (!Array.isArray(result.courses)) throw Error("server");
      } catch {
        if (id !== generation.current) return;
        result = { courses: createCourses(places, c, strategy), notice: "추천 서버 미연결 · 규칙 기반으로 코스를 만들었어요. LLM 순위 선택은 사용하지 않았어요." };
      }
      if (id !== generation.current) return;
      setCourses(result.courses);
      setNotice(extra + result.notice);
      if (!result.courses.length) setError("조건에 맞는 3곳 코스가 없어요. 반경이나 예산을 늘리고, 키워드와 시간을 바꿔보세요.");
    } catch (err) {
      if (id === generation.current) {
        setError(err.message);
        setNotice("탐색을 완료하지 못했어요.");
      }
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  function focusStop(id) {
    setFocused(id);
    setSelectedPlace(null);
    setSheet("full");
    requestAnimationFrame(() => document.getElementById(`stop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }
  function cycleSheet() {
    setSheet((old) => old === "peek" ? "half" : old === "half" ? "full" : "peek");
  }
  function onSheetTouchEnd(event) {
    if (touchStart.current == null) return;
    const delta = event.changedTouches[0].clientY - touchStart.current;
    if (Math.abs(delta) > 48) setSheet((old) => delta < 0 ? (old === "peek" ? "half" : "full") : (old === "full" ? "half" : "peek"));
    touchStart.current = null;
  }
  const localPercent = route && demo ? Math.round((route.local / route.stops.length) * 100) : null;
  const activePlace = places.find((place) => place.id === selectedPlace);
  const costTotal = route?.total || 1;

  return <div className="app-shell" style={{ "--sheet-height": `${sheetHeight}px` }}>
    <div className="map-layer">
      <MapView demo={demo} dark={dark} origin={c.origin} radius={c.radius}
        stops={route?.stops ?? EMPTY} places={places} focused={focused ?? selectedPlace} bottomPadding={sheetHeight}
        onOrigin={(point) => {
          if (!isInYongsan(point)) { setError("출발점은 서울시 용산구 안에서 선택해주세요."); setSheet("half"); return; }
          change("origin", point); setSheet("peek");
        }}
        onFocus={focusStop}
        onPlace={(id) => { setSelectedPlace(id); setFocused(null); setSheet("half"); }} />
    </div>
    <header className="floating-header">
      <div className="top-row">
        <a className="brand" href="#" aria-label="PinQ 홈" onClick={() => setSheet("peek")}>
          <img src={`${process.env.PUBLIC_URL}/pinq-logo.png`} alt="PinQ" />
        </a>
        <span className="header-caption">내 주변의 새로운 코스</span>
        <button className="icon-button" type="button" onClick={() => setDark((old) => !old)} aria-label={dark ? "라이트 모드" : "다크 모드"} title={dark ? "라이트 모드" : "다크 모드"}>{dark ? "☀" : "☾"}</button>
      </div>
      <form className="search-bar" onSubmit={explore}>
        <span className="search-symbol" aria-hidden="true">⌕</span>
        <input aria-label="취향 키워드" placeholder="어떤 하루를 보내고 싶나요?" maxLength={60} value={c.keyword} onChange={(e) => change("keyword", e.target.value)} onFocus={() => setSheet("half")} />
        <button className="search-submit" type="submit" disabled={busy}>{busy ? "검색 중" : "코스 찾기"}</button>
      </form>
      <div className="filters" aria-label="빠른 조건 선택">
        <label className="filter-chip"><span>예산 <b>{c.budget === 0 ? "무료" : `${Math.round(c.budget / 10000)}만원`}</b> ⌄</span>
          <select className="filter-native" aria-label="전체 예산" value={c.budget} onChange={(e) => change("budget", Number(e.target.value))}>
            {[0, 20000, 40000, 60000, 80000, 100000, 150000, 200000].map((n) => <option key={n} value={n}>{n === 0 ? "무료" : money(n)}</option>)}
          </select></label>
        <label className="filter-chip"><span>인원 <b>{c.people}명</b> ⌄</span>
          <select className="filter-native" aria-label="인원" value={c.people} onChange={(e) => change("people", Number(e.target.value))}>
            {Array.from({ length: 30 }, (_, i) => <option key={i} value={i + 1}>{i + 1}명</option>)}
          </select></label>
        <label className="filter-chip"><span>이동 <b>{transports[c.transport]}</b> ⌄</span>
          <select className="filter-native" aria-label="이동 방법" value={c.transport} onChange={(e) => change("transport", e.target.value)}>
            <option value="walk" disabled={night}>도보</option><option value="bike" disabled={night}>자전거</option><option value="transit">대중교통</option>
          </select></label>
        <label className="filter-chip"><span>테마 <b>{themes[c.theme]}</b> ⌄</span>
          <select className="filter-native" aria-label="오늘의 테마" value={c.theme} onChange={(e) => change("theme", e.target.value)}>
            {Object.entries(themes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
      </div>
      {night && <div className="warning-banner" role="status">☀ 21시~06시에는 도보·자전거 코스를 제외합니다. 대중교통 운행은 확인이 필요해요.</div>}
    </header>
    <div className="map-tools">
        <span className="map-mode">서울 용산구 · {demo ? "예시 지도" : "Google 지도"}</span>
      <button type="button" onClick={() => setSheet("half")}>조건 조정 <span aria-hidden="true">↑</span></button>
    </div>
    <section ref={sheetRef} className={`bottom-sheet sheet-${sheet}`} aria-label="코스 탐색 패널">
      <div className="sheet-handle-zone" onTouchStart={(e) => { touchStart.current = e.touches[0].clientY; }} onTouchEnd={onSheetTouchEnd}>
        <button className="sheet-handle" onClick={cycleSheet} aria-label={`패널 ${sheet === "peek" ? "확장" : sheet === "half" ? "전체 보기" : "축소"}`}><span /></button>
      </div>
      <div className="sheet-scroll">
        <div className="sheet-heading">
          <div><span className="eyebrow">EXPLORE NEARBY</span><h1>{route ? "오늘의 코스" : "어디로 떠나볼까요?"}</h1></div>
          <span className="data-tag">{demo ? "가상 장소" : "실제 장소 · 추정 비용"}</span>
        </div>
        <p className="location-line">⌖ 서울 용산구 · 출발점 {c.origin.lat.toFixed(4)}, {c.origin.lng.toFixed(4)} <span>· 반경 {(c.radius / 1000).toFixed(1)}km</span></p>
        <p className="notice" role="status">{notice}</p>
        {error && <p className="error" role="alert">{error}</p>}
        {sheet !== "peek" && <div className={`sheet-expanded ${courses.length ? "has-results" : ""}`}>
          <div className="section-title"><h2>탐색 조건</h2><span>조건을 바꾸면 코스를 다시 찾을 수 있어요</span></div>
          <div className="settings-grid">
            <label>방문 날짜<input type="date" value={c.date} onChange={(e) => change("date", e.target.value)} /></label>
            <label>출발 시간<input type="time" value={c.time} onChange={(e) => change("time", e.target.value)} /></label>
            <label className="wide">용산구 내 탐색 반경 <b>{(c.radius / 1000).toFixed(1)}km</b><input type="range" min="300" max="8000" step="100" value={c.radius} onChange={(e) => change("radius", Number(e.target.value))} /></label>
            <label>추천 기준<select value={strategy} onChange={(e) => { invalidate(); setStrategy(e.target.value); }}><option value="balanced">균형 있게</option><option value="local">동네 가게 우선</option><option value="quiet">한적한 곳 우선</option></select></label>
            <label>지도 모드<select value={demo ? "demo" : "real"} onChange={(e) => { invalidate(); cache.current = null; setDemo(e.target.value === "demo"); }}><option value="demo">예시 지도</option><option value="real">Google 지도</option></select></label>
          </div>
          <label className="setting-check"><input type="checkbox" checked={c.verifiedOnly} onChange={(e) => change("verifiedOnly", e.target.checked)} /> 영업시간 미확인 장소 제외</label>
          <button className="primary-button" onClick={explore} disabled={busy}>{busy ? "코스 만드는 중…" : dirty ? "조건으로 다시 찾기" : "나의 코스 찾기"} <span>↗</span></button>
          {!route && !busy && !error && <div className="empty-state"><span className="empty-pin">⌖</span><h3>지도 위에서 하루를 시작해보세요</h3><p>출발점을 고른 뒤 코스 찾기를 누르면 가까운 세 곳을 이어드려요.</p></div>}
          {courses.length > 0 && <>
            <div className="section-title course-title"><h2>추천 코스 <span>{courses.length}</span></h2>{localPercent != null && <strong className="local-badge">✦ 로컬 {localPercent}%</strong>}</div>
            {!demo && <p className="data-caveat">실제 장소의 소상공인 여부는 확인되지 않았어요.</p>}
            <div className="course-list">
              {courses.map((r, i) => <button key={r.id} className={`course-card ${selected === i ? "is-selected" : ""}`} onClick={() => { setSelected(i); setFocused(null); setSheet("full"); }}>
                <span className="course-index">{String(i + 1).padStart(2, "0")}</span>
                <span className="course-copy"><strong>{r.stops.map((stop) => stop.name).join(" → ")}</strong><small>약 {r.duration}분 · {(r.distance / 1000).toFixed(1)}km · {r.stops.length}곳</small></span>
                <span className="course-price">{money(r.total)}<small>총 예상 비용</small></span>
              </button>)}
            </div>
            {route && <div className="route-detail">
              <div className="section-title"><h2>방문 순서</h2><span>도착 시간은 거리 기반 추정</span></div>
              <div className="timeline">{route.stops.map((p, i) => <article key={p.id} id={`stop-${p.id}`} className={`stop ${focused === p.id ? "focused" : ""}`}>
                <button className="stop-number" onClick={() => focusStop(p.id)} aria-label={`${p.name} 지도에서 보기`}>{i + 1}</button>
                <div className="stop-body"><small>{clock(p.arrival)} 도착 예상 · 약 {p.stay}분 머무름</small><h3><button onClick={() => focusStop(p.id)}>{p.name}</button>{demo && p.local && <span className="sparkle" aria-label="가상 로컬 장소">✦</span>}</h3><p>{p.demo ? "가상 예시 장소" : p.address}</p><span className="stop-meta">{kinds[p.type]} · 1인 {money(p.price)} 추정</span>{p.hours && <details><summary>참고 영업시간</summary>{p.hours}<p>방문 당일 영업 여부는 확인되지 않았어요.</p></details>}</div>
              </article>)}</div>
              <div className="cost-card"><div className="cost-heading"><div><small>{c.people}명 예상 총비용</small><strong>{money(route.total)}</strong></div><span>예산 {money(c.budget)}</span></div>
                <div className="cost-track" role="img" aria-label={`먹거리 ${money(route.food)}, 체험 ${money(route.play)}, 이동 ${money(route.transit)}`}>
                  {route.food > 0 && <i className="food" style={{ width: `${route.food / costTotal * 100}%` }} />}{route.play > 0 && <i className="play" style={{ width: `${route.play / costTotal * 100}%` }} />}{route.transit > 0 && <i className="move" style={{ width: `${route.transit / costTotal * 100}%` }} />}
                </div><div className="cost-legend"><span><i className="food" />먹거리 {money(route.food)}</span><span><i className="play" />체험 {money(route.play)}</span><span><i className="move" />이동 {money(route.transit)}</span></div>
              </div>
              <details className="audit"><summary><span className="shield">✓</span><span><strong>접근 권한 및 예산 점검</strong><small>이 코스의 계산과 권한 범위 확인</small></span><span aria-hidden="true">⌄</span></summary><ul><li>추정 비용은 선택한 전체 예산 이내입니다.</li><li>{demo ? "가상 영업시간과 정원을 기준으로 검증했어요." : "실제 영업시간과 수용 인원은 확인되지 않았어요."}</li><li>결제·예약·메시지 발송 권한은 사용하지 않습니다.</li><li>직선거리 기반 시간이며 실제 경로와 안전은 확인이 필요해요.</li></ul></details>
            </div>}
          </>}
          {places.length > 0 && <section className="discovered-places" aria-label="용산구 발견 장소">
            <div className="section-title"><h2>용산구에서 찾은 장소 <span>{places.length}</span></h2><span>지도의 점을 누르면 정보가 열려요</span></div>
            <div className="place-chips">{places.map((place) => <button key={place.id} className={selectedPlace === place.id ? "active" : ""} onClick={() => { setSelectedPlace(place.id); setFocused(null); }}>{place.name}</button>)}</div>
            {activePlace && <article className="place-detail"><small>{kinds[activePlace.type]} · {activePlace.demo ? "가상 장소" : "Google 장소"}</small><h3>{activePlace.name}</h3><p>{activePlace.demo ? "용산구 안에 배치한 예시 장소" : activePlace.address}</p>
              {activePlace.rating != null && <p>★ {activePlace.rating.toFixed(1)} {activePlace.ratingCount != null && `· 평가 ${activePlace.ratingCount.toLocaleString("ko-KR")}개`}</p>}
              {activePlace.hours && <details><summary>참고 영업시간</summary>{activePlace.hours}</details>}
              {activePlace.mapsUrl && <a href={activePlace.mapsUrl} target="_blank" rel="noopener noreferrer">Google 지도에서 보기 ↗</a>}
            </article>}
          </section>}
          <p className="fine-print">가격과 이동 시간은 추정치입니다. 실제 길찾기, 영업, 대중교통 운행과 안전 경로를 보장하지 않아요.</p>
        </div>}
      </div>
    </section>
  </div>;
}

export default App;
