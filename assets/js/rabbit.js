// 작업 중에 화면을 뛰어다니는 픽셀 토끼
// - rabbitStart()/rabbitStop()을 짝으로 부르면, 기다리는 작업이 있는 동안 토끼가 나온다
// - 깡충 동작과 이동을 같은 시계로 움직인다: 6장(웅크림→준비→박차기→공중→착지 준비→착지) 중
//   발이 땅에서 떨어진 3장(박차기·공중·착지 준비)에서만 앞으로 나아감 → 미끄러지지 않음
// - 처음엔 느긋하게(느린 박자, 작은 깡충, 쉬었다 가기). 마우스가 토끼에 닿거나 토끼를 누르면
//   깜짝 높이 뛴 뒤 그때부터 도망다님 (클릭은 닿지 않아 절대 못 잡음)
// - GIF를 굽는 동안은 화면이 잠깐 멈추므로, 굽기 직전에 rabbitDuck()으로 발밑 굴에 숨고
//   다 구우면 rabbitResume()으로 다시 나온다. 작업이 모두 끝나면 굴로 쏙 들어가고 굴이 닫힘
// - '동작 줄이기' 설정을 켠 사람에게는 나오지 않는다

const PX = 3; // 그림 한 칸 = 3px
const W = 20 * PX; // 60
const H = 26 * PX; // 78 (위쪽은 점프 공간)
const FEET = 24 * PX; // 상자 위에서 발바닥까지 (72)
const HOLE_W = 24 * PX; // 72
const HOLE_H = 10 * PX; // 30
const SINK = 21 * PX; // 굴로 내려가는 깊이 (63)
const AIR = [2, 3, 4]; // 발이 떨어진 장면
const MODES = {
  calm: { fps: 7, hop: 6 * PX, restMin: 3, restMax: 12 }, // 느긋하게: 한 번에 18px, 자주 쉼
  flee: { fps: 14, hop: 30 * PX, restMin: 0, restMax: 1 }, // 도망: 한 번에 90px, 거의 안 쉼
};
const IS_EN = (document.documentElement.lang || "").toLowerCase().startsWith("en");
const TAUNTS = IS_EN ? ["Can't catch me!", "Too slow!", "Nope!"] : ["못 잡지롱~", "메롱~", "어림없지!"];
const STARTLE = "!";

let busy = 0;
let el = null;
let sprite = null;
let sink = null;
let bubble = null;
let hole = null;
let phase = "hidden"; // hidden | live | ducking | under | emerging | leaving
let mode = "calm";
let tickTimer = null;
let seqTimer = null;
let hideTimer = null;
let duckWaiters = [];
let frame = 0;
let hopping = false;
let rest = 0;
let x = 0;
let y = 0;
let tx = 0;
let ty = 0;
let lastTaunt = 0;
let shownAt = 0;

const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const snap = (v) => Math.round(v / PX) * PX;
const maxX = () => Math.max(0, window.innerWidth - W);
const maxY = () => Math.max(0, window.innerHeight - H);

function build() {
  el = document.createElement("div");
  el.className = "pixel-rabbit";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<div class="pr-flip"><div class="pr-sink"><span class="pr-sprite"></span></div></div><div class="pr-bubble"></div>';
  sprite = el.querySelector(".pr-sprite");
  sink = el.querySelector(".pr-sink");
  bubble = el.querySelector(".pr-bubble");
  hole = document.createElement("div");
  hole.className = "pixel-hole";
  hole.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  document.body.appendChild(hole);
}

function render(lift = 0) {
  sprite.style.backgroundPosition = `${-frame * W}px 0`;
  el.style.transform = `translate(${x}px, ${y}px)`;
  sink.style.transform = lift ? `translateY(${lift}px)` : "";
}

function face(dx) {
  if (dx) el.querySelector(".pr-flip").classList.toggle("left", dx < 0);
}

function say(text, ms = 900) {
  bubble.textContent = text;
  el.classList.add("talk");
  setTimeout(() => el && el.classList.remove("talk"), ms);
}

function pickCalmTarget() {
  // 느긋할 때는 근처를 어슬렁
  tx = snap(clamp(x + (Math.random() * 2 - 1) * 180, 0, maxX()));
  ty = snap(clamp(y + (Math.random() * 2 - 1) * 90, 0, maxY()));
}

function pickFleeTarget(px, py) {
  const cx = x + W / 2;
  const cy = y + FEET / 2;
  let dx = cx - px;
  let dy = cy - py;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  const reach = 260 + Math.random() * 140;
  let nx = cx + dx * reach - W / 2;
  let ny = cy + dy * reach - FEET / 2;
  // 벽에 막히면 옆으로 비켜 감
  if (nx < 0 || nx > maxX()) nx = cx + (Math.random() < 0.5 ? -1 : 1) * reach - W / 2;
  if (ny < 0 || ny > maxY()) ny = cy + (Math.random() < 0.5 ? -1 : 1) * reach * 0.6 - FEET / 2;
  tx = snap(clamp(nx, 0, maxX()));
  ty = snap(clamp(ny, 0, maxY()));
}

// ---- 한 박자씩: 장면 바꿈과 이동을 같이 처리
function tick() {
  if (phase !== "live") return;
  const m = MODES[mode];
  if (!hopping) {
    if (rest > 0) {
      rest -= 1;
      frame = 0;
      render();
      return schedule();
    }
    if (Math.hypot(tx - x, ty - y) < PX) {
      if (mode === "calm") pickCalmTarget();
      else tx = snap(Math.random() * maxX()), ty = snap(Math.random() * maxY());
    }
    hopping = true;
    frame = 0;
  }
  frame += 1;
  if (AIR.includes(frame)) {
    // 공중에 뜬 3장 동안만 한 번 깡충 거리의 1/3씩 전진
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.hypot(dx, dy);
    const step = Math.min(d, m.hop / 3);
    if (d > 0) {
      face(dx);
      x = snap(x + (dx / d) * step);
      y = snap(y + (dy / d) * step);
    }
  }
  if (frame > 5) {
    frame = 0;
    hopping = false;
    rest = m.restMin + Math.floor(Math.random() * (m.restMax - m.restMin + 1));
  }
  render();
  schedule();
}

function schedule() {
  clearTimeout(tickTimer);
  tickTimer = setTimeout(tick, 1000 / MODES[mode].fps);
}

// 정해진 장면들을 차례로 재생 (깜짝 뛰기, 굴에 들어가기·나오기). steps: [{frame, lift, sink, dx}]
function play(steps, fps, done) {
  clearTimeout(tickTimer);
  clearTimeout(seqTimer);
  let i = 0;
  const step = () => {
    const s = steps[i];
    if (s.frame !== undefined) frame = s.frame;
    if (s.dx) x = snap(clamp(x + s.dx, 0, maxX()));
    render(s.lift || 0);
    if (s.sink !== undefined) sink.style.transform = `translateY(${s.sink}px)`;
    i += 1;
    if (i < steps.length) seqTimer = setTimeout(step, 1000 / fps);
    else if (done) seqTimer = setTimeout(done, 1000 / fps);
  };
  step();
}

// 마우스가 닿거나 누르면: 깜짝 높이 뛰고 → 도망 모드
function startle(px, py) {
  if (phase !== "live" || mode !== "calm") return;
  mode = "flee";
  say(STARTLE, 700);
  const up = [-6, -15, -24, -27, -24, -15, -6].map((v) => v * 1); // 그림 장면 위로 더 높이
  play(
    [{ frame: 1 }, { frame: 2, lift: up[0] }, { frame: 3, lift: up[1] }, { frame: 3, lift: up[2] }, { frame: 3, lift: up[3] },
     { frame: 3, lift: up[4] }, { frame: 4, lift: up[5] }, { frame: 4, lift: up[6] }, { frame: 5 }, { frame: 0 }],
    14,
    () => {
      pickFleeTarget(px, py);
      hopping = false;
      rest = 0;
      schedule();
    }
  );
}

function onPointer(e, isDown) {
  if (!el || phase !== "live") return;
  const r = el.getBoundingClientRect();
  const inside = e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top + 18 && e.clientY <= r.bottom + 6;
  if (mode === "calm") {
    if (inside) startle(e.clientX, e.clientY);
    return;
  }
  // 도망 모드: 가까이 오면 바로 도망
  const d = Math.hypot(x + W / 2 - e.clientX, y + FEET / 2 - e.clientY);
  if (d < 170 || isDown) {
    const now = performance.now();
    if ((isDown || now - lastTaunt > 1800) && Math.random() < (isDown ? 1 : 0.4)) {
      lastTaunt = now;
      say(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
    }
    pickFleeTarget(e.clientX, e.clientY);
    if (!hopping) {
      rest = 0;
      schedule();
    }
  }
}
const onMove = (e) => onPointer(e, false);
const onDown = (e) => onPointer(e, true);

function listen(on) {
  document[on ? "addEventListener" : "removeEventListener"]("pointermove", onMove, { passive: true });
  document[on ? "addEventListener" : "removeEventListener"]("pointerdown", onDown, { passive: true });
}

// ---- 굴: 발밑에 열고 닫기
function openHole() {
  const hx = snap(clamp(x + W / 2 - HOLE_W / 2, 0, window.innerWidth - HOLE_W));
  const hy = snap(clamp(y + FEET - HOLE_H / 2, 0, window.innerHeight - HOLE_H));
  hole.style.left = `${hx}px`;
  hole.style.top = `${hy}px`;
  hole.className = "pixel-hole open";
}
function closeHole(done) {
  hole.className = "pixel-hole closing";
  seqTimer = setTimeout(() => {
    hole.className = "pixel-hole";
    if (done) done();
  }, 260);
}
const diveSteps = () => [0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ frame: 0, sink: (SINK * k) / 7 }));
const riseSteps = () => [7, 6, 5, 4, 3, 2, 1, 0].map((k) => ({ frame: k > 3 ? 0 : 1, sink: (SINK * k) / 7 }));

function dive(done) {
  el.classList.add("clip");
  openHole();
  play([{ frame: 0 }, { frame: 1 }, ...diveSteps()], 14, done);
}

function show() {
  if (reduced()) return;
  if (!el) build();
  phase = "live";
  mode = "calm";
  shownAt = performance.now();
  // 화면 아래쪽 왼편에서 시작해 느긋하게 돌아다님
  x = snap(window.innerWidth * (0.08 + Math.random() * 0.2));
  y = snap(maxY() * (0.6 + Math.random() * 0.3));
  frame = 0;
  hopping = false;
  rest = 2;
  el.classList.remove("clip");
  sink.style.transform = "";
  el.style.display = "block";
  pickCalmTarget();
  render();
  listen(true);
  schedule();
}

function hideNow() {
  clearTimeout(tickTimer);
  clearTimeout(seqTimer);
  listen(false);
  phase = "hidden";
  if (el) {
    el.style.display = "none";
    el.classList.remove("clip");
  }
  if (hole) hole.className = "pixel-hole";
  duckWaiters.splice(0).forEach((r) => r());
}

// 작업이 모두 끝나면: 발밑에 굴 → 쏙 → 굴 닫힘
function leave() {
  if (phase !== "live") return;
  phase = "leaving";
  listen(false);
  dive(() => closeHole(hideNow));
}

// 굴에서 나오기: 쏙 올라온 뒤, 아직 작업 중이면 다시 뛰어다니고, 다 끝났으면 한 번 깡충 하고 다시 들어감
function emerge() {
  phase = "emerging";
  play(riseSteps(), 14, () => {
    el.classList.remove("clip");
    sink.style.transform = "";
    if (busy > 0) {
      closeHole();
      phase = "live";
      listen(true);
      hopping = false;
      rest = 1;
      schedule();
    } else {
      // 고개를 내밀고 제자리에서 한 번 깡충 → 다시 쏙
      play([1, 2, 3, 4, 5, 0].map((f) => ({ frame: f })), 12, () => {
        el.classList.add("clip");
        play(diveSteps(), 14, () => closeHole(hideNow));
      });
    }
  });
}

export function rabbitStart() {
  busy += 1;
  clearTimeout(hideTimer);
  if (phase === "hidden") show();
  else if (phase === "leaving") {
    // 들어가던 중에 새 작업이 시작되면 다시 나옴
    clearTimeout(seqTimer);
    emerge();
  }
}

export function rabbitStop() {
  busy = Math.max(0, busy - 1);
  if (busy > 0) return;
  clearTimeout(hideTimer);
  // 너무 잠깐 보였다 사라지지 않게 최소 1.2초는 보여 줌
  const wait = Math.max(300, 1200 - (performance.now() - shownAt));
  hideTimer = setTimeout(() => {
    if (busy > 0) return;
    if (phase === "live") leave();
    else if (phase === "under") emerge(); // 굴에 숨은 채 끝났으면 나와서 인사하고 들어감
    // emerging 중이면 emerge()가 끝에서 알아서 들어감
  }, wait);
}

// 화면이 잠깐 멈추는 일(GIF 굽기) 직전에 부름: 발밑 굴로 숨을 때까지 기다림
export function rabbitDuck() {
  if (phase !== "live" && phase !== "emerging") return Promise.resolve();
  return new Promise((resolve) => {
    duckWaiters.push(resolve);
    if (phase === "ducking") return;
    phase = "ducking";
    listen(false);
    clearTimeout(tickTimer);
    clearTimeout(seqTimer);
    dive(() => {
      phase = "under";
      duckWaiters.splice(0).forEach((r) => r());
      // 숨는 사이 작업이 다 끝났으면(오류 등) 나와서 인사하고 들어감
      if (busy === 0) setTimeout(() => phase === "under" && busy === 0 && emerge(), 300);
    });
    // 혹시 늦어져도 1.5초 넘게 붙잡지 않음
    setTimeout(() => duckWaiters.splice(0).forEach((r) => r()), 1500);
  });
}

// 멈춤이 끝난 뒤 부름: 굴에서 다시 나옴
export function rabbitResume() {
  if (phase === "under") emerge();
}
