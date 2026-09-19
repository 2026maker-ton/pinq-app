import React, { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import MapView from "./MapView.jsx";
import { ORIGIN, createCourses, validate, money, clock, parseClock, toAgentConditions, styleSearchGroups, uniqueCourses, placeMapsUrl } from "./engine.mjs";
import { searchPlaces } from "./maps.js";
import { isInYongsan } from "./region.mjs";

const EMPTY = [];
const today = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const keywordOptions = [
  { id: "relaxed", label: "한가함" },
  { id: "tight", label: "빡빡함" },
  { id: "eager", label: "열정적" },
  { id: "play", label: "놀것만" },
  { id: "exhibit", label: "관람" },
  { id: "food", label: "먹거리" },
  { id: "hidden", label: "숨은명소" },
];
const PACING = new Set(["relaxed", "tight", "eager"]);
const transports = { walk: "도보", bike: "자전거", transit: "대중교통" };
const kinds = { nature: "공원", culture: "문화", cafe: "카페", food: "식사" };
const ROUTE_COLORS = ["#2563eb", "#e11d48", "#059669"];
const statusCopy = { open: "영업 중", closed: "영업 종료", unknown: "영업 미확인" };
function placeQueryStatus(place, time = "13:00") {
  if (place?.business_status) return place.business_status;
  if (place?.openNow === true) return "open";
  if (place?.openNow === false) return "closed";
  return "unknown";
}
function showStopPrice(place) {
  return place.price > 0 && place.payee !== "public" && place.type !== "nature";
}
function MapsLink({ place }) {
  const href = placeMapsUrl(place);
  if (!href) return null;
  return <a className="maps-link" href={href} target="_blank" rel="noopener noreferrer">Google 지도에서 보기 ↗</a>;
}

function App() {
  const [dark, setDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  const [sheet, setSheet] = useState("peek");
  const [sheetHeight, setSheetHeight] = useState(160);
  const [mode, setMode] = useState("compose");
  const [c, setC] = useState({
    origin: ORIGIN, people: 2, budget: 60000, radius: 3000, styles: [],
    transport: "walk", date: today(), time: "13:00", timeMode: "end", endTime: "17:00", playHours: 4, keyword: "", verifiedOnly: false,
  });
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
  const results = mode === "results";

  useEffect(() => {
    const timer = window.setTimeout(() => document.getElementById("launch-splash")?.remove(), 1400);
    return () => window.clearTimeout(timer);
  }, []);
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
      if ((key === "time" || key === "endTime") && next.timeMode !== "duration") {
        const start = parseClock(next.time);
        const finish = parseClock(next.endTime);
        if (Number.isFinite(start) && Number.isFinite(finish) && finish <= start)
          next.endTime = clock(Math.min(start + 240, 1439));
      }
      return next;
    });
  }
  function toggleStyle(id) {
    const on = c.styles.includes(id);
    let next = on ? c.styles.filter((style) => style !== id) : [...c.styles, id];
    if (!on) {
      if (PACING.has(id)) next = next.filter((style) => !PACING.has(style) || style === id);
      if (id === "food") next = next.filter((style) => style !== "play" && style !== "exhibit");
      if (id === "play" || id === "exhibit") next = next.filter((style) => style !== "food");
    }
    change("styles", next);
  }
  function backToFilters() {
    setMode("compose");
    setSheet("half");
    setFocused(null);
    setSelectedPlace(null);
    setNotice(dirty ? "조건이 바뀌었어요. 다시 탐색해주세요." : "찾은 경로는 지도에 남겨 두었어요. 조건을 바꿔 다시 찾을 수 있어요.");
  }
  async function explore(event) {
    event?.preventDefault();
    const id = ++generation.current;
    abort.current?.abort();
    abort.current = new AbortController();
    setSelected(0);
    setFocused(null);
    setError("");
    setBusy(true);
    setDirty(false);
    setNotice("주변 장소를 조회하고 코스를 검증하고 있어요.");
    try {
      validate(c);
      let found, extra = "";
      const key = JSON.stringify([c.origin, c.radius, styleSearchGroups(c.styles)]);
      try {
        found = await searchPlaces(c);
        if (id !== generation.current) return;
        cache.current = { key, places: found };
      } catch (err) {
        if (cache.current?.key === key) {
          found = cache.current.places;
          extra = "이전 조회 결과를 사용했어요. 최신 장소 정보는 확인되지 않았어요. ";
        } else throw Error(`장소 조회 실패: ${err.message}. 지도 키와 Places API 설정을 확인해주세요.`);
      }
      if (id !== generation.current) return;
      setPlaces(found);
      let result;
      const recommendationUrl = process.env.REACT_APP_RECOMMEND_API_URL || (Capacitor.isNativePlatform() ? null : "/api/recommend");
      try {
        if (!recommendationUrl) throw Error("no API endpoint");
        const response = await fetch(recommendationUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conditions: toAgentConditions(c), places: found, demo: false }),
          signal: AbortSignal.any([abort.current.signal, AbortSignal.timeout(20000)]),
        });
        if (!response.ok) throw Error("server");
        result = await response.json();
        if (!Array.isArray(result.courses)) throw Error("server");
      } catch {
        if (id !== generation.current) return;
        result = { courses: createCourses(found, c), notice: "추천 서버 미연결 · 규칙 기반으로 코스를 만들었어요. LLM 순위 선택은 사용하지 않았어요." };
      }
      if (id !== generation.current) return;
      const nextCourses = uniqueCourses(result.courses);
      setCourses(nextCourses);
      setNotice(extra + result.notice);
      if (!nextCourses.length) {
        setError("조건에 맞는 코스가 없어요. 끝 시각을 늦추거나 반경·예산을 늘려보세요.");
        setMode("compose");
        setSheet("half");
      } else {
        setMode("results");
        setSheet("half");
      }
    } catch (err) {
      if (id === generation.current) {
        setError(err.message);
        setNotice("탐색을 완료하지 못했어요.");
        setMode("compose");
        setSheet("half");
      }
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  function selectRoute(index) {
    setSelected(index);
    setFocused(null);
    setSelectedPlace(null);
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
  const activePlace = places.find((place) => place.id === selectedPlace);
  const cost = route?.estimated_cost ?? { food: route?.food || 0, play: route?.play || 0, transit: route?.transit || 0, total: route?.total || 0, shop: route?.shop || 0, public: route?.public || 0 };
  const costTotal = cost.total || 1;
  const activeStatus = placeQueryStatus(activePlace, c.time);
  const routeColor = ROUTE_COLORS[selected] || ROUTE_COLORS[0];
  const searchValue = results && route ? route.stops.map((stop) => stop.name).join(" → ") : c.keyword;

  return <div className={`app-shell ${results ? "mode-results" : "mode-compose"}`} style={{ "--sheet-height": `${sheetHeight}px`, "--route-color": routeColor }}>
    <div className="map-layer">
      <MapView demo={false} dark={dark} origin={c.origin} radius={c.radius}
        courses={courses} selected={selected} routeColors={ROUTE_COLORS}
        stops={route?.stops ?? EMPTY} places={results ? EMPTY : places} focused={focused ?? selectedPlace} bottomPadding={sheetHeight}
        onOrigin={(point) => {
          if (results) return;
          if (!isInYongsan(point)) { setError("출발점은 서울시 용산구 안에서 선택해주세요."); setSheet("half"); return; }
          change("origin", point); setSheet("peek");
        }}
        onFocus={focusStop}
        onPlace={(id) => {
          if (results) return;
          setSelectedPlace(id); setFocused(null); setSheet("half");
        }} />
    </div>
    <header className="floating-header">
      <div className="top-row">
        <span className="header-caption">서울 용산구의 새로운 코스</span>
        <button className="icon-button" type="button" onClick={() => setDark((old) => !old)} aria-label={dark ? "라이트 모드" : "다크 모드"} title={dark ? "라이트 모드" : "다크 모드"}>{dark ? "☀" : "☾"}</button>
      </div>
      <form className="search-bar" onSubmit={results ? (event) => event.preventDefault() : explore}>
        {results && <button className="search-back" type="button" onClick={backToFilters} aria-label="돌아가기">←</button>}
        <span className="search-symbol" aria-hidden="true">⌕</span>
        <input
          aria-label={results ? "선택한 경로 장소" : "취향 키워드"}
          placeholder="어떤 하루를 보내고 싶나요?"
          maxLength={results ? 200 : 60}
          readOnly={results}
          value={searchValue}
          onChange={(e) => { if (!results) change("keyword", e.target.value); }}
          onFocus={() => { if (!results) setSheet("half"); }}
        />
        {!results && <button className="search-submit" type="submit" disabled={busy}>{busy ? <><span className="spinner" aria-hidden="true" /> 검색 중</> : "코스 찾기"}</button>}
      </form>
      {!results && <div className="filters" aria-label="코스 키워드">
        {keywordOptions.map((style) => <button key={style.id} type="button" className={`filter-toggle ${c.styles.includes(style.id) ? "is-on" : ""}`} aria-pressed={c.styles.includes(style.id)} onClick={() => toggleStyle(style.id)}>{style.label}</button>)}
      </div>}
    </header>
    <div className="map-tools">
      {courses.length > 0 && <div className="route-chips" role="tablist" aria-label="추천 경로">
        {courses.map((course, i) => <button key={course.id} type="button" role="tab" aria-selected={selected === i} className={`route-chip ${selected === i ? "is-on" : ""}`} style={{ "--chip-color": ROUTE_COLORS[i] }} onClick={() => selectRoute(i)}>
          <i aria-hidden="true" /><span>경로 {i + 1}</span><small>{Math.round(course.duration)}분</small>
        </button>)}
      </div>}
      {!results && <div className="map-tools-row">
        <span className="map-mode">서울 용산구 · Google 지도</span>
        <button type="button" onClick={() => setSheet("half")}>조건 조정 <span aria-hidden="true">↑</span></button>
      </div>}
    </div>
    <section ref={sheetRef} className={`bottom-sheet sheet-${sheet}`} aria-label={results ? "경로 정보" : "코스 탐색 패널"}>
      <div className="sheet-handle-zone" onTouchStart={(e) => { touchStart.current = e.touches[0].clientY; }} onTouchEnd={onSheetTouchEnd}>
        <button className="sheet-handle" onClick={cycleSheet} aria-label={`패널 ${sheet === "peek" ? "확장" : sheet === "half" ? "전체 보기" : "축소"}`}><span /></button>
      </div>
      <div className="sheet-scroll">
        <div className="sheet-heading">
          <div><span className="eyebrow">{results ? "YOUR ROUTE" : "EXPLORE NEARBY"}</span><h1>{results && route ? `경로 ${selected + 1}` : "어디로 떠나볼까요?"}</h1></div>
          <span className="data-tag">{results ? "실제 장소 · 추정 비용" : "용산구 탐색"}</span>
        </div>
        <p className="location-line">⌖ 서울 용산구 · 출발점 {c.origin.lat.toFixed(4)}, {c.origin.lng.toFixed(4)} <span>· 반경 {(c.radius / 1000).toFixed(1)}km</span></p>
        <p className="notice" role="status">{notice}</p>
        {error && <p className="error" role="alert">{error}</p>}
        {sheet !== "peek" && !results && <div className="sheet-expanded">
          <div className="section-title"><h2>탐색 조건</h2><span>조건을 바꾸면 코스를 다시 찾을 수 있어요</span></div>
          <div className="settings-grid">
            <label>전체 예산<select aria-label="전체 예산" value={c.budget} onChange={(e) => change("budget", Number(e.target.value))}>
              {[0, 20000, 40000, 60000, 80000, 100000, 150000, 200000].map((n) => <option key={n} value={n}>{n === 0 ? "무료" : money(n)}</option>)}
            </select></label>
            <label>인원<select aria-label="인원" value={c.people} onChange={(e) => change("people", Number(e.target.value))}>
              {Array.from({ length: 30 }, (_, i) => <option key={i} value={i + 1}>{i + 1}명</option>)}
            </select></label>
            <label>이동 방법<select aria-label="이동 방법" value={c.transport} onChange={(e) => change("transport", e.target.value)}>
              <option value="walk" disabled={night}>도보</option><option value="bike" disabled={night}>자전거</option><option value="transit">대중교통</option>
            </select></label>
            <div className="style-chip-row" role="radiogroup" aria-label="시간 설정 방식">
              <button type="button" className={`filter-toggle ${c.timeMode !== "duration" ? "is-on" : ""}`} aria-pressed={c.timeMode !== "duration"} onClick={() => change("timeMode", "end")}>출발·끝 시각</button>
              <button type="button" className={`filter-toggle ${c.timeMode === "duration" ? "is-on" : ""}`} aria-pressed={c.timeMode === "duration"} onClick={() => change("timeMode", "duration")}>출발·놀 시간</button>
            </div>
            <label>방문 날짜<input type="date" value={c.date} onChange={(e) => change("date", e.target.value)} /></label>
            <label>출발 시간<input type="time" value={c.time} onChange={(e) => change("time", e.target.value)} /></label>
            {c.timeMode === "duration" ? (
              <label>놀 시간<select aria-label="놀 시간" value={c.playHours} onChange={(e) => change("playHours", Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}시간</option>)}
              </select></label>
            ) : (
              <label>끝 시각<input type="time" value={c.endTime} onChange={(e) => change("endTime", e.target.value)} /></label>
            )}
            <label className="wide">용산구 내 탐색 반경 <b>{(c.radius / 1000).toFixed(1)}km</b><input type="range" min="300" max="8000" step="100" value={c.radius} onChange={(e) => change("radius", Number(e.target.value))} /></label>
          </div>
          {night && <div className="warning-banner" role="status">☀ 21시~06시에는 도보·자전거 코스를 제외합니다. 대중교통 운행은 확인이 필요해요.</div>}
          <label className="setting-check"><input type="checkbox" checked={c.verifiedOnly} onChange={(e) => change("verifiedOnly", e.target.checked)} /> 영업시간 미확인 장소 제외</label>
          <button className="primary-button" onClick={explore} disabled={busy}>{busy ? "코스 만드는 중…" : dirty ? "조건으로 다시 찾기" : "나의 코스 찾기"} <span>↗</span></button>
          {!courses.length && !busy && !error && <div className="empty-state"><span className="empty-pin pulse-pin">📍</span><h3>지도 위에서 하루를 시작해보세요</h3><p>지도를 눌러 출발점을 고르고 <b>코스 찾기</b>를 눌러보세요.</p><button type="button" className="empty-cta" onClick={explore}>지금 바로 시작하기 ↗</button></div>}
          {places.length > 0 && <section className="discovered-places" aria-label="용산구 발견 장소">
            <div className="section-title"><h2>용산구에서 찾은 장소 <span>{places.length}</span></h2><span>지도의 점을 누르면 정보가 열려요</span></div>
            <div className="place-chips">{places.map((place) => <button key={place.id} className={selectedPlace === place.id ? "active" : ""} onClick={() => { setSelectedPlace(place.id); setFocused(null); }}>{place.name}</button>)}</div>
            {activePlace && <article className="place-detail"><small>{kinds[activePlace.type]} · Google 장소 · {statusCopy[activeStatus]}</small><h3>{activePlace.name}</h3><p>{activePlace.address}</p>
              {activePlace.hours && <details><summary>참고 영업시간</summary>{activePlace.hours}</details>}
              <MapsLink place={activePlace} />
            </article>}
          </section>}
          <p className="fine-print">가격은 추정치입니다. 동네/공공 나눔은 장소 유형 추정이며 실제 입금처가 아닙니다. 지도 경로는 장소를 이은 직선이며 영업·운행·안전은 방문 전 확인이 필요해요.</p>
        </div>}
        {sheet !== "peek" && results && route && <div className="sheet-expanded route-sheet">
          <p className="selected-route-summary">{route.stops.map((stop) => stop.name).join(" → ")}<small>약 {route.duration}분 · 여유 {route.slack ?? 0}분 · {(route.distance / 1000).toFixed(1)}km · {route.stops.length}곳 · {statusCopy[route.realtime_business_status] || "영업 미확인"} · {money(route.estimated_cost?.total ?? route.total)}</small></p>
          <p className="data-caveat">영업상태와 동네/공공 비용 나눔은 조회 시점 또는 장소 유형 추정이며 실제 입금처가 아닙니다.</p>
          <div className="route-detail">
            <div className="section-title"><h2>방문 순서</h2><span>도착 시간은 직선거리 추정</span></div>
            <div className="timeline">{route.stops.map((p, i) => <React.Fragment key={p.id}>
              {i > 0 && <p className="move-leg">{transports[c.transport]} {p.move}분</p>}
              <article id={`stop-${p.id}`} className={`stop ${focused === p.id ? "focused" : ""}`}>
                <button className="stop-number" onClick={() => focusStop(p.id)} aria-label={`${p.name} 지도에서 보기`}>{i + 1}</button>
                <div className="stop-body">
                  <small>{clock(p.arrival)}–{clock(p.arrival + p.stay)}</small>
                  <div className="stay-bar" title={`${p.stay}분 머무름`}><span className="stay-track"><i style={{ width: `${Math.min(100, Math.round((p.stay / 90) * 100))}%` }} /></span><em>{p.stay}분</em></div>
                  <h3><button onClick={() => focusStop(p.id)}>{p.name}</button></h3>
                  {Array.isArray(p.why) && p.why.length > 0 && <div className="why-chips">{p.why.map((tag) => <span key={tag}>{tag}</span>)}</div>}
                  <p>{p.address}</p>
                  <span className="stop-meta">{kinds[p.type]}{showStopPrice(p) ? ` · 1인 ${money(p.price)} 추정` : ""} · {statusCopy[p.business_status] || "영업 미확인"}</span>
                  {p.hours && <details><summary>참고 영업시간</summary>{p.hours}<p>조회 시점 또는 주간 시간표 추정이며 방문 당일 영업은 확인이 필요해요.</p></details>}
                  <MapsLink place={p} />
                </div>
              </article>
            </React.Fragment>)}</div>
            <div className="cost-card"><div className="cost-heading"><div><small>{c.people}명 예상 총비용</small><strong>{money(cost.total)}<span className="cost-payee">동네 {money(cost.shop ?? 0)} · 공공 {money(cost.public ?? 0)}</span></strong></div><span>예산 {money(c.budget)}</span></div>
              <div className="cost-track" role="img" aria-label={`먹거리 ${money(cost.food)}, 체험 ${money(cost.play)}, 이동 ${money(cost.transit)}`}>
                {cost.food > 0 && <i className="food" style={{ width: `${cost.food / costTotal * 100}%` }} />}{cost.play > 0 && <i className="play" style={{ width: `${cost.play / costTotal * 100}%` }} />}{cost.transit > 0 && <i className="move" style={{ width: `${cost.transit / costTotal * 100}%` }} />}
              </div><div className="cost-legend"><span><i className="food" />먹거리 {money(cost.food)}</span><span><i className="play" />체험 {money(cost.play)}</span><span><i className="move" />이동 {money(cost.transit)}</span></div>
              <p className="route-estimate-note">장소 사이를 직선으로 이었으며 실제 도로·대중교통과 다를 수 있어요.</p>
            </div>
          </div>
          <p className="fine-print">가격은 추정치입니다. 동네/공공 나눔은 장소 유형 추정이며 실제 입금처가 아닙니다. 지도 경로는 장소를 이은 직선이며 영업·운행·안전은 방문 전 확인이 필요해요.</p>
        </div>}
      </div>
    </section>
  </div>;
}

export default App;
