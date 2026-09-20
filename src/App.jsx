import React, { useRef, useState } from "react";
import MapView from "./MapView.jsx";
import {
  ORIGIN,
  createCourses,
  demoPlaces,
  validate,
  money,
  clock,
} from "./engine.mjs";
import { searchPlaces } from "./maps.js";
const EMPTY = [];
const dateToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export default function App() {
  const [demo, setDemo] = useState(
    !process.env.REACT_APP_GOOGLE_MAPS_API_KEY?.trim(),
  );
  const [c, setC] = useState({
    origin: ORIGIN,
    people: 2,
    budget: 60000,
    radius: 1000,
    theme: "all",
    transport: "walk",
    date: dateToday(),
    time: "13:00",
    keyword: "",
    verifiedOnly: false,
  });
  const [strategy, setStrategy] = useState("balanced"),
    [courses, setCourses] = useState([]),
    [selected, setSelected] = useState(0),
    [focused, setFocused] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("조건을 고르고 첫 코스를 찾아보세요."),
    [fail, setFail] = useState(false),
    [dirty, setDirty] = useState(false);
  const generation = useRef(0),
    cache = useRef(null),
    abort = useRef(null);
  const route = courses[selected];
  function invalidate() {
    generation.current++;
    abort.current?.abort();
    setBusy(false);
    setCourses([]);
    setFocused(null);
    setError("");
    setDirty(true);
    setNotice("조건이 바뀌었어요. 다시 탐색해주세요.");
  }
  function change(key, value) {
    invalidate();
    setC((old) => {
      const next = { ...old, [key]: value };
      if (
        key === "time" &&
        (Number(value.slice(0, 2)) >= 21 || Number(value.slice(0, 2)) < 6)
      )
        next.transport = "transit";
      return next;
    });
  }
  async function explore(e) {
    e.preventDefault();
    const id = ++generation.current;
    abort.current?.abort();
    abort.current = new AbortController();
    setCourses([]);
    setSelected(0);
    setFocused(null);
    setError("");
    setBusy(true);
    setDirty(false);
    setNotice("주변 장소를 조회하고 코스를 검증하고 있어요.");
    try {
      validate(c);
      let places,
        extra = "";
      if (demo) {
        places = demoPlaces(c.origin);
        if (fail) extra = "조회 실패 시연: 가상 예시 데이터 사용. ";
      } else {
        const key = JSON.stringify([c.origin, c.radius, c.theme]);
        try {
          if (fail) throw Error("장소 조회 실패 시연");
          places = await searchPlaces(c);
          if (id !== generation.current) return;
          cache.current = { key, places };
        } catch (err) {
          if (cache.current?.key === key) {
            places = cache.current.places;
            extra =
              "장소 조회 실패 → 이번 세션의 동일 범위 결과로 대체. 최신 정보 미확인. ";
          } else
            throw Error(
              `장소 조회 실패: ${err.message}. 이전 조회 결과가 없어요. 키·Places API 설정을 확인하거나 예시 모드를 사용해주세요.`,
            );
        }
      }
      if (id !== generation.current) return;
      let result;
      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conditions: c, strategy, places, demo }),
          signal: AbortSignal.any([
            abort.current.signal,
            AbortSignal.timeout(20000),
          ]),
        });
        if (!response.ok) throw Error("server");
        result = await response.json();
        if (!Array.isArray(result.courses)) throw Error("server");
      } catch (err) {
        if (id !== generation.current) return;
        result = {
          courses: createCourses(places, c, strategy),
          notice: "추천 서버 미연결 → 브라우저 규칙 기반 추천 (LLM 미사용)",
        };
      }
      if (id !== generation.current) return;
      setCourses(result.courses);
      setNotice(extra + result.notice);
      if (!result.courses.length)
        setError(
          "조건에 맞는 3곳 코스가 없어요. 반경·예산을 늘리거나 키워드·테마·시간·영업시간 필터를 바꿔주세요.",
        );
    } catch (err) {
      if (id === generation.current) {
        setError(err.message);
        setNotice("탐색을 완료하지 못했어요.");
      }
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  const night =
    Number(c.time.slice(0, 2)) >= 21 || Number(c.time.slice(0, 2)) < 6;
  return (
    <div className="app">
      <header>
        <a className="brand" href="#">
          ↗ 동네 한 바퀴
        </a>
        <span className="sdg">SDG 11 · 우리 동네의 새로운 발견</span>
        <label className="mode">
          <input
            type="checkbox"
            checked={demo}
            onChange={(e) => {
              invalidate();
              cache.current = null;
              setDemo(e.target.checked);
            }}
          />
          예시 모드
        </label>
      </header>
      <div className="intro">
        <div>
          <p className="eyebrow">A LITTLE CLOSER, A LITTLE DIFFERENT</p>
          <h1>
            오늘은 어디서
            <br />
            <em>한 바퀴</em> 돌아볼까?
          </h1>
          <p>
            출발점을 찍고 취향을 알려주세요.
            <br />
            가까운 곳들을 이어 나만의 하루를 만들어봐요.
          </p>
        </div>
        <div className="intro-note">
          멀리 가지 않아도,
          <br />
          새로운 하루.
        </div>
      </div>
      <main>
        <aside className="panel">
          <form onSubmit={explore}>
            <h2>
              <span className="step">01</span> 나의 하루 설정
            </h2>
            <p className="location">
              출발점{" "}
              <b>
                {c.origin.lat.toFixed(4)}, {c.origin.lng.toFixed(4)}
              </b>
              <small>지도 클릭 또는 아래 좌표 입력</small>
            </p>
            <div className="row">
              <label>
                위도
                <input
                  aria-label="출발 위도"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  required
                  value={c.origin.lat}
                  onChange={(e) =>
                    change("origin", {
                      ...c.origin,
                      lat: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                경도
                <input
                  aria-label="출발 경도"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  required
                  value={c.origin.lng}
                  onChange={(e) =>
                    change("origin", {
                      ...c.origin,
                      lng: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label>
              오늘의 테마
              <select
                value={c.theme}
                onChange={(e) => change("theme", e.target.value)}
              >
                <option value="all">골고루 즐기기</option>
                <option value="cafe">카페·먹거리</option>
                <option value="culture">전시·문화·책방</option>
                <option value="nature">공원·자연</option>
              </select>
            </label>
            <label>
              취향 키워드
              <input
                value={c.keyword}
                maxLength={60}
                placeholder="예: 커피, 전시, 산책"
                onChange={(e) => change("keyword", e.target.value)}
              />
            </label>
            <div className="row">
              <label>
                인원
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={c.people}
                  onChange={(e) => change("people", Number(e.target.value))}
                />
              </label>
              <label>
                전체 예산 (원)
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  step="1000"
                  required
                  value={c.budget}
                  onChange={(e) => change("budget", Number(e.target.value))}
                />
              </label>
            </div>
            <div className="row">
              <label>
                날짜
                <input
                  type="date"
                  required
                  value={c.date}
                  onChange={(e) => change("date", e.target.value)}
                />
              </label>
              <label>
                출발 시간 (한국)
                <input
                  type="time"
                  required
                  value={c.time}
                  onChange={(e) => change("time", e.target.value)}
                />
              </label>
            </div>
            <label>
              탐색 반경 <b>{(c.radius / 1000).toFixed(1)} km</b>
              <input
                type="range"
                min="300"
                max="30000"
                step="100"
                value={c.radius}
                onChange={(e) => change("radius", Number(e.target.value))}
              />
            </label>
            <label>
              이동 방법
              <select
                value={c.transport}
                onChange={(e) => change("transport", e.target.value)}
              >
                <option value="walk" disabled={night}>
                  도보
                </option>
                <option value="bike" disabled={night}>
                  자전거
                </option>
                <option value="transit">대중교통 (운행 미확인)</option>
              </select>
            </label>
            {night && (
              <small>
                21시~06시에는 도보·자전거 코스를 제외해요. 대중교통 운행은 별도
                확인이 필요해요.
              </small>
            )}
            <label>
              추천 기준
              <select
                value={strategy}
                onChange={(e) => {
                  invalidate();
                  setStrategy(e.target.value);
                }}
              >
                <option value="balanced">균형 있게</option>
                <option value="local">동네 가게 우선</option>
                <option value="quiet">한적한 곳 우선</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={c.verifiedOnly}
                onChange={(e) => change("verifiedOnly", e.target.checked)}
              />
              영업시간 미확인 장소 제외
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={fail}
                onChange={(e) => {
                  invalidate();
                  setFail(e.target.checked);
                }}
              />
              장소 조회 실패 시연
            </label>
            <button className="primary" disabled={busy} type="submit">
              {busy
                ? "코스 만드는 중…"
                : dirty
                  ? "다시 탐색하기 ↗"
                  : "나의 코스 찾기 ↗"}
            </button>
          </form>
        </aside>
        <section className="workspace">
          <div className="map-head">
            <span>
              <span className="status-dot" />
              {demo ? "예시 동네 둘러보기" : "실제 동네 둘러보기"}
            </span>
            <small>지도 위에서 출발점을 골라보세요</small>
          </div>
          <MapView
            demo={demo}
            origin={c.origin}
            radius={c.radius}
            stops={route?.stops ?? EMPTY}
            focused={focused}
            onOrigin={(p) => change("origin", p)}
            onFocus={(id) => {
              setFocused(id);
              document
                .getElementById(`stop-${id}`)
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          />
          <div className="result-heading">
            <h2>
              <span className="step">02</span> 추천하는 한 바퀴
            </h2>
            <span className="pill">
              {demo ? "가상 데이터" : "실제 장소 · 비용 추정"}
            </span>
          </div>
          <p className="notice" role="status">
            {notice}
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {!route && !busy && !error && (
            <div className="empty">
              <span>⌁</span>
              <h3>작은 발견을 모으는 하루</h3>
              <p>왼쪽에서 조건을 고르면 최대 3개의 코스를 제안해요.</p>
            </div>
          )}
          {courses.length > 0 && (
            <>
              <div className="course-tabs">
                {courses.map((r, i) => (
                  <button
                    key={r.id}
                    className={selected === i ? "active" : ""}
                    onClick={() => {
                      setSelected(i);
                      setFocused(null);
                    }}
                  >
                    코스 {i + 1}
                    <strong>{money(r.total)}</strong>
                    <small>
                      약 {r.duration}분 · {(r.distance / 1000).toFixed(1)}km
                    </small>
                  </button>
                ))}
              </div>
              <div className="stops">
                {route.stops.map((p, i) => (
                  <article
                    key={p.id}
                    id={`stop-${p.id}`}
                    className={"stop " + (focused === p.id ? "focused" : "")}
                  >
                    <button
                      className="stop-number"
                      onClick={() => setFocused(p.id)}
                      aria-label={`${p.name} 지도에서 보기`}
                    >
                      {i + 1}
                    </button>
                    <div>
                      <small>
                        {clock(p.arrival)} 도착 예상 · 이동 약 {p.move}분
                      </small>
                      <h3>
                        <button
                          className="place-name"
                          onClick={() => setFocused(p.id)}
                        >
                          {p.name}
                        </button>
                      </h3>
                      <p>{p.demo ? "가상 예시 장소" : p.address}</p>
                      <span>
                        {money(p.price)} / 1인 추정 · 약 {p.stay}분 체류
                      </span>
                      {p.hours && (
                        <details>
                          <summary>참고 영업시간</summary>
                          {p.hours}
                          <p>예정 도착 시간의 실제 영업 여부는 미확인입니다.</p>
                        </details>
                      )}
                    </div>
                    <span className="tag">
                      {
                        {
                          nature: "공원",
                          culture: "문화",
                          cafe: "카페",
                          food: "식사",
                        }[p.type]
                      }
                    </span>
                  </article>
                ))}
              </div>
              <div className="cost">
                <div>
                  <small>{c.people}명 예상 총비용</small>
                  <strong>{money(route.total)}</strong>
                  <small>1인 {money(route.total / c.people)}</small>
                </div>
                <dl>
                  <div>
                    <dt>먹거리</dt>
                    <dd>{money(route.food)}</dd>
                  </div>
                  <div>
                    <dt>놀이·문화</dt>
                    <dd>{money(route.play)}</dd>
                  </div>
                  <div>
                    <dt>이동</dt>
                    <dd>{money(route.transit)}</dd>
                  </div>
                </dl>
              </div>
              <div className="audit">
                <h3>이번 코스 점검</h3>
                <ul>
                  <li>예산: 추정 비용 기준 범위 이내</li>
                  <li>
                    시간·인원:{" "}
                    {demo
                      ? "가상 영업시간·가상 정원으로 검증"
                      : "실제 영업·수용 인원 미확인"}
                  </li>
                  <li>이동: 21시~06시 도보·자전거 제외 규칙 적용</li>
                  <li>
                    안전·혼잡·소상공인 여부:{" "}
                    {demo
                      ? "가상 속성 사용, 실제 판단 불가"
                      : "미확인 · 우선순위에 가산하지 않음"}
                  </li>
                  <li>권한: 장소 조회와 추천만 · 결제·예약·메시지 발송 없음</li>
                </ul>
              </div>
            </>
          )}
          <p className="fine-print">
            비용은 유형별 가정, 이동 시간은 직선거리 보정치예요. 실제
            길찾기·대중교통 운행·안전 경로를 보장하지 않아요.{" "}
            {demo
              ? "예시 장소·가격·영업시간은 모두 가상이에요."
              : "Google Maps 장소 데이터 이용. 실제 방문 전 영업시간과 가격을 확인해주세요."}{" "}
            위치와 조회 결과는 앱의 세션 메모리에만 보관하며, 실제 조회 시
            Google로, LLM 설정 시 코스 이름과 취향이 해당 제공자로 전달돼요.
          </p>
        </section>
      </main>
      <footer>동네의 작은 장소가, 하루의 큰 발견이 되도록.</footer>
    </div>
  );
}
