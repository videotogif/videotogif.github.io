// 작업 중에 화면을 뛰어다니는 픽셀 토끼
// - rabbitStart()/rabbitStop()을 짝으로 부르면, 기다리는 작업이 있는 동안 토끼가 굴에서 튀어나와 돌아다님
// - 옆·앞·뒤 세 방향 모습: 화면 아래로 갈 땐 앞모습, 위로 갈 땐 뒷모습, 옆으로 갈 땐 옆모습(왼쪽은 뒤집어 씀)
// - 처음엔 느긋하게 깡충. 마우스가 닿으면 깜짝 뛰고 도망. 마우스를 빨리 움직일수록 더 빨리, 더 멀리서부터 도망감
//   도망 달리기는 6장(쭉 뻗기→앞발 착지→몸 말기→뒷발 착지→박차기→떠오름). 발이 땅에 붙은 구간은 미끄러지지 않게
//   정해진 거리만 가고 나머지는 공중에서 나눠 감
// - 화면 모서리에 몰리면 굴을 파고 숨음. 마우스가 그 모서리에서 1초 넘게 벗어나 있으면 빼꼼 나옴
// - 숨어 있는 굴 둘레를 누르면 그쪽 흙이 구덩이로 밀려 들어가 메워짐(매번 다른 모양). 세 번이면 다 메워지고,
//   토끼는 마우스에서 먼 곳에 새 굴을 파고 튀어나옴. 메워진 흙더미는 가장자리부터 부서지며 사라짐
// - 도망칠 때 토끼를 누르면 방문자마다 딱 한 번 잡힘(브라우저에 기억). 한마디 하고 그 자리 굴로 들어감
// - 광고 영역(.ad-unit)과 그 둘레 24px에는 들어가지 않음: 토끼를 잡으려던 클릭이 광고에 닿지 않게
// - GIF를 굽는 동안은 화면이 잠깐 멈추므로, 굽기 직전에 rabbitDuck()으로 발밑 굴에 숨고
//   다 구우면 rabbitResume()으로 다시 나옴. 작업이 모두 끝나면 굴로 쏙 들어가고 굴은 부서지며 사라짐
// - '동작 줄이기' 설정을 켠 사람에게는 나오지 않음

const PX = 2; // 그림 한 칸 = 2px
const CW = 40 * PX; // 장면 한 칸 80px
const CH = 34 * PX; // 68px
const FEET = 33 * PX; // 상자 위에서 발밑 선까지
const SPEEDK = PX / 3; // 크기를 줄인 만큼 속도도 같은 비율로
const SHEET = "/assets/img/rabbit-sheet-2x.png"; // 36장: 옆 깡충 8 · 옆 달리기 6 · 앞모습/잡힘 3 · 앞 깡충 5 · 앞 달리기 4 · 뒷모습 1 · 뒤 깡충 5 · 뒤 달리기 4
const SHADOW = "/assets/img/rabbit-shadow-2x.png"; // 그림자 폭 10~32칸, 12가지
const FRAMES = 36;
const SHW = 34 * PX;
// 장면마다 [땅에서 뜬 칸, 몸 가운데(칸), 몸 폭(칸)] — 그림자 위치·크기
const META = [[0,21,28],[0,21.5,29],[0,20,26],[3,19.5,29],[0,21.5,29],[0,21.5,29],[0,21,28],[0,21,28],[4,18.5,33],[0,18,28],[0,21.5,23],[0,20.5,23],[0,20,22],[3,19.5,29],[0,20.5,17],[0,20.5,17],[0,20.5,17],[0,20.5,19],[0,20.5,17],[2,20.5,17],[0,20.5,17],[0,20.5,19],[1,20.5,17],[0,20.5,17],[0,20.5,19],[1,20.5,17],[0,20.5,17],[0,20.5,19],[0,20.5,17],[2,20.5,17],[0,20.5,17],[0,20.5,19],[2,20.5,17],[0,20.5,17],[0,20.5,19],[0,20.5,17]];
const HOPSEQ = { side: [0, 1, 2, 3, 4, 5], front: [14, 17, 18, 19, 20, 21], back: [26, 27, 28, 29, 30, 31] };
const IDLE = { side: [0, 6, 7], front: [14], back: [26] };
const RUNSEQ = { side: [8, 9, 10, 11, 12, 13], front: [22, 23, 24, 25], back: [32, 33, 34, 35] };
const APEX = { side: [8, 13], front: [22], back: [32] };
const CONTACT = { 9: 3, 10: 5, 11: 5 }; // 발이 땅에 붙은 구간의 이동 칸 수
const HOP_AIR = [2, 3, 4];
const CALM = { fps: 10, hop: 9 * PX, restMin: 2, restMax: 7 };
const KEY = "vtg-rabbit-caught";
const IS_EN = (document.documentElement.lang || "").toLowerCase().startsWith("en");
const T = IS_EN
  ? { taunts: ["Can't catch me!", "Too slow!", "Nope!"], caught: "You got me!", once: "Just this once~" }
  : { taunts: ["못 잡지롱~", "메롱~", "어림없지!"], caught: "잡혔다!", once: "이번 한 번만이야~" };
const LIVE = ["calm", "startle", "flee", "stopping"];

let busy = 0;
let built = false;
let el, hit, sheet, flip, sinkEl, bubble, shadow, shimg, hole, B;
let mode = "off"; // off | calm | startle | flee | stopping | caught | diving | hidden | ducking | ducked | emerging | buried | leaving
let frame = 0, x = 0, y = 0, faceDir = 1, wantDir = 1, lift = 0, sink = 0;
let view = "side", hopI = 0, hopping = false, rest = 2, calmTarget = null, runI = 2;
let speed = 0, target = 0, dirX = 1, dirY = 0, lastThreat = 0;
let timer = null, seq = null, watchTimer = null, finishTimer = null, zone = null, awaySince = 0, holeLevel = 0;
let shownAt = 0;
const duckWaiters = [];
let caughtOnce = false;
try { caughtOnce = localStorage.getItem(KEY) === "1"; } catch (_) { /* 저장 안 되는 브라우저 */ }
const ptr = { x: -9999, y: -9999, t: 0, v: 0, on: false };

const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const snap = (v) => Math.round(v / PX) * PX;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const maxX = () => Math.max(0, window.innerWidth - CW);
const maxY = () => Math.max(0, window.innerHeight - CH);
const isSide = (f) => f < 14;
const center = () => ({ cx: x + CW / 2, cy: y + CH * 0.62 });

// 광고 영역(둘레 24px 포함). 스크롤하면 바뀌므로 0.5초마다 다시 잼
let adRects = [];
let adAt = -1e9;
function ads() {
  const now = performance.now();
  if (now - adAt > 500) {
    adAt = now;
    adRects = [...document.querySelectorAll(".ad-unit")]
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ l: r.left - 24, t: r.top - 24, r: r.right + 24, b: r.bottom + 24 }));
  }
  return adRects;
}
const onAd = (px, py) => ads().some((a) => px + CW > a.l && px < a.r && py + CH * 0.3 + CH * 0.7 > a.t && py + CH * 0.3 < a.b);
function freeSpot(pick, tries = 12) {
  let p = pick();
  for (let i = 0; i < tries && onAd(p.x, p.y); i++) p = pick();
  return p;
}

function build() {
  el = document.createElement("div");
  el.className = "pixel-rabbit";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<div class="pr-clip"><div class="pr-sink"><div class="pr-flip"><div class="pr-cell"><img src="${SHEET}" alt="" width="${CW * FRAMES}" height="${CH}" draggable="false"></div></div></div></div><span class="pr-hit"></span><span class="pr-bubble"></span>`;
  hit = el.querySelector(".pr-hit");
  sheet = el.querySelector(".pr-cell img");
  flip = el.querySelector(".pr-flip");
  sinkEl = el.querySelector(".pr-sink");
  bubble = el.querySelector(".pr-bubble");
  shadow = document.createElement("div");
  shadow.className = "pr-shadow";
  shadow.setAttribute("aria-hidden", "true");
  shadow.innerHTML = `<img src="${SHADOW}" alt="" width="${SHW * 12}" height="${4 * PX}" draggable="false">`;
  shimg = shadow.querySelector("img");
  hole = document.createElement("canvas");
  hole.className = "pixel-hole";
  hole.width = 32 * PX;
  hole.height = 13 * PX;
  hole.setAttribute("aria-hidden", "true");
  document.body.append(hole, shadow, el);
  B = newBurrow(hole);
  hit.addEventListener("pointerdown", onRabbitDown);
  hole.addEventListener("pointerdown", onHoleDown);
  window.addEventListener("resize", () => {
    if (mode === "off") return;
    x = clamp(x, 0, maxX());
    y = clamp(y, 0, maxY());
    render();
  });
  built = true;
}

const feetCx = () => {
  const m = META[frame];
  return (faceDir < 0 && isSide(frame) ? 40 - m[1] : m[1]) * PX;
};
function pickView(dx, dy, cur) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (cur === "side") return ay > ax * 1.4 ? (dy > 0 ? "front" : "back") : "side";
  if (ay < ax) return "side";
  return dy > 0 ? "front" : "back";
}
function render() {
  sheet.style.transform = `translateX(${-frame * CW}px)`;
  el.style.transform = `translate(${x}px, ${y + lift}px)`;
  sinkEl.style.transform = sink ? `translateY(${sink}px)` : "";
  flip.classList.toggle("left", faceDir < 0 && isSide(frame));
  const under = el.classList.contains("clip");
  el.classList.toggle("touchable", !under && LIVE.includes(mode));
  shadow.style.display = under || mode === "off" ? "none" : "block";
  if (!under) {
    // 그림자: 땅(발밑 선)에 고정, 높이 뜰수록 작고 옅게
    const m = META[frame], alt = m[0] * PX - lift;
    const w = clamp(Math.round((m[2] * (1 - alt / 90)) / 2) * 2, 10, 32);
    shimg.style.transform = `translateX(${-((w - 10) / 2) * SHW}px)`;
    shadow.style.transform = `translate(${x + feetCx() - SHW / 2}px, ${y + FEET - 4 * PX}px)`;
    shadow.style.opacity = String(clamp(1 - alt / 50, 0.35, 1));
  }
}
function say(text, ms = 900) {
  bubble.textContent = text;
  el.classList.add("talk");
  clearTimeout(say.t);
  say.t = setTimeout(() => el && el.classList.remove("talk"), ms);
}
const runFps = () => clamp(13 + ((speed / SPEEDK - 220) / 380) * 11, 13, 24);
function later(fn, fps) {
  clearTimeout(timer);
  timer = setTimeout(fn, 1000 / fps);
}
// 장면 차례 재생. 단계: {frame, lift, sink, dx, dy, face, clip, dirt}. abort()가 참이면 중간에 멈추고 onAbort
function play(steps, fps, done, abort, onAbort) {
  clearTimeout(timer);
  clearTimeout(seq);
  let i = 0;
  const step = () => {
    if (abort && abort()) return onAbort();
    const s = steps[i];
    if (s.frame !== undefined) frame = s.frame;
    lift = s.lift || 0;
    if (s.sink !== undefined) sink = s.sink;
    if (s.face) faceDir = s.face;
    if (s.clip === true) el.classList.add("clip");
    if (s.clip === false) el.classList.remove("clip");
    if (s.dx) x = snap(clamp(x + s.dx, 0, maxX()));
    if (s.dy) y = snap(clamp(y + s.dy, 0, maxY()));
    if (s.dirt) dirt();
    render();
    if (s.fn) s.fn();
    i += 1;
    if (i < steps.length) seq = setTimeout(step, 1000 / fps);
    else if (done) seq = setTimeout(done, 1000 / fps);
  };
  step();
}

// ---- 마우스
function onMove(e) {
  const now = performance.now();
  if (ptr.on && now > ptr.t) ptr.v = ptr.v * 0.7 + Math.min((Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) / (now - ptr.t)) * 1000, 4000) * 0.3;
  ptr.x = e.clientX;
  ptr.y = e.clientY;
  ptr.t = now;
  ptr.on = true;
  if (mode === "calm") {
    const { cx, cy } = center(), d = Math.hypot(ptr.x - cx, ptr.y - cy);
    if (d < 50 || (ptr.v > 700 && d < 170)) startle();
  }
}
function onLeave(e) {
  if (!e.relatedTarget) {
    ptr.on = false;
    ptr.x = ptr.y = -9999;
  }
}
function listen(on) {
  const f = on ? "addEventListener" : "removeEventListener";
  document[f]("pointermove", onMove, { passive: true });
  document.documentElement[f]("mouseleave", onLeave);
  clearInterval(watchTimer);
  if (on) watchTimer = setInterval(watch, 100);
}
function watch() {
  if (performance.now() - ptr.t > 60) ptr.v *= 0.85;
  // 숨어 있을 때: 마우스가 그 굴(모서리) 근처를 1초 넘게 벗어나 있으면 나옴
  if (mode === "hidden" && zone) {
    const away = !ptr.on || Math.hypot(ptr.x - zone.x, ptr.y - zone.y) > zone.r;
    if (!away) awaySince = 0;
    else if (!awaySince) awaySince = performance.now();
    else if (performance.now() - awaySince > 1000) emerge();
  }
}

// ---- 느긋한 깡충
function calmTick() {
  if (mode !== "calm") return;
  if (!hopping) {
    if (rest > 0) {
      rest -= 1;
      const r = Math.random(), idle = IDLE[view];
      frame = idle.length > 1 ? (r < 0.3 ? idle[1] : r < 0.38 ? idle[2] : idle[0]) : idle[0];
      lift = 0;
      render();
      return later(calmTick, CALM.fps);
    }
    if (!calmTarget || Math.hypot(calmTarget.x - x, calmTarget.y - y) < PX) {
      calmTarget = freeSpot(() => {
        const ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 110;
        return { x: snap(clamp(x + Math.cos(ang) * dist, 20, maxX() - 20)), y: snap(clamp(y + Math.sin(ang) * dist * 0.8, 20, maxY() - 20)) };
      });
    }
    const dx = calmTarget.x - x, dy = calmTarget.y - y;
    view = pickView(dx, dy, view);
    if (view === "side" && Math.abs(dx) > 1) faceDir = Math.sign(dx);
    hopping = true;
    hopI = 0;
  }
  hopI += 1;
  if (HOP_AIR.includes(hopI)) {
    const dx = calmTarget.x - x, dy = calmTarget.y - y, d = Math.hypot(dx, dy), st = Math.min(d, CALM.hop / 3);
    if (d > 0) {
      const nx = snap(x + (dx / d) * st), ny = snap(y + (dy / d) * st * (view === "side" ? 1 : 0.8));
      if (onAd(nx, ny) && !onAd(x, y)) calmTarget = null; // 광고 쪽이면 거기서 멈추고 다음에 다른 곳으로
      else { x = nx; y = ny; }
    }
  }
  if (hopI > 5) {
    hopI = 0;
    hopping = false;
    rest = CALM.restMin + Math.floor(Math.random() * (CALM.restMax - CALM.restMin + 1));
  }
  frame = HOPSEQ[view][hopI];
  lift = 0;
  render();
  later(calmTick, CALM.fps);
}

// ---- 도망
function aimAway() {
  const { cx, cy } = center();
  let dx = cx - ptr.x, dy = cy - ptr.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  if ((x < 30 && dx < 0) || (x > maxX() - 30 && dx > 0)) { dx = 0; dy = dy >= 0 ? 1 : -1; }
  if ((y < 24 && dy < 0) || (y > maxY() - 24 && dy > 0)) {
    dy = 0;
    dx = dx >= 0 ? 1 : -1;
    if ((x < 30 && dx < 0) || (x > maxX() - 30 && dx > 0)) dx = -dx;
  }
  const n = Math.hypot(dx, dy) || 1;
  dirX = dx / n;
  dirY = (dy / n) * 0.7;
  if (Math.abs(dirX) > 0.2) wantDir = Math.sign(dirX);
}
function startle() {
  mode = "startle";
  say("!", 700);
  aimAway();
  faceDir = wantDir;
  calmTarget = null;
  view = pickView(dirX, dirY / 0.7, "side");
  const H = HOPSEQ[view], up = [-4, -10, -16, -18, -16, -10, -4];
  const dx = view === "side" ? 4 * faceDir : 0, dy = view === "side" ? 0 : view === "front" ? 3 : -3;
  play(
    [{ frame: H[1] }, { frame: H[2], lift: up[0] }, { frame: H[3], lift: up[1], dx, dy }, { frame: H[3], lift: up[2], dx, dy }, { frame: H[3], lift: up[3], dx, dy },
     { frame: H[3], lift: up[4], dx, dy }, { frame: H[4], lift: up[5] }, { frame: H[4], lift: up[6] }, { frame: H[5] }],
    18,
    () => {
      mode = "flee";
      speed = 340 * SPEEDK;
      target = speed;
      runI = 2;
      lastThreat = performance.now();
      fleeTick();
    }
  );
}
function fleeTick() {
  if (mode !== "flee") return;
  const now = performance.now(), { cx, cy } = center();
  const R = 140 + Math.min(ptr.v, 1500) * 0.1;
  const d = ptr.on ? Math.hypot(ptr.x - cx, ptr.y - cy) : Infinity;
  if (d < R) {
    lastThreat = now;
    target = clamp(220 + ptr.v * 0.5, 220, 600) * SPEEDK;
    aimAway();
  } else if (now - lastThreat > 2000) target = 0;
  speed += (target - speed) * 0.3;
  const seqv = RUNSEQ[view];
  if (target === 0 && speed < 100 * SPEEDK && runI === 2) return stopRunning();
  const fps = runFps();
  const from = seqv[runI];
  runI = (runI + 1) % seqv.length;
  frame = seqv[runI];
  // 가장 높이 뜬 장면에서만 방향·모습을 바꿈
  if (APEX[view].includes(frame)) {
    faceDir = wantDir;
    const nv = pickView(dirX, dirY / 0.7, view);
    if (nv !== view) {
      view = nv;
      runI = 0;
      frame = RUNSEQ[view][0];
    }
  }
  let step;
  if (view === "side") step = CONTACT[from] ? CONTACT[from] * PX : Math.max(2 * PX, snap(((Math.max(speed, 100 * SPEEDK) * 6) / fps - 13 * PX) / 3));
  else step = Math.max(2 * PX, snap(Math.max(speed, 100 * SPEEDK) / fps));
  const k = view === "side" ? 1 : 0.8 / 0.7;
  let nx = snap(clamp(x + dirX * step, 0, maxX())), ny = snap(clamp(y + dirY * step * k, 0, maxY()));
  if (onAd(nx, ny) && !onAd(x, y)) {
    // 광고에 닿으면 옆으로 비켜 감, 양쪽 다 막히면 이번 박자는 제자리
    const turns = [[-dirY / 0.7, dirX * 0.7], [dirY / 0.7, -dirX * 0.7]];
    let moved = false;
    for (const [tx, ty] of turns) {
      const ax = snap(clamp(x + tx * step, 0, maxX())), ay = snap(clamp(y + ty * step, 0, maxY()));
      if (!onAd(ax, ay)) { nx = ax; ny = ay; dirX = tx; dirY = ty; moved = true; break; }
    }
    if (!moved) { nx = x; ny = y; }
  }
  x = nx;
  y = ny;
  lift = APEX[view].includes(frame) ? -snap(clamp((speed / SPEEDK - 220) / 380, 0, 1) * 6) : 0;
  render();
  const m = 40; // 두 벽에 모두 40px 안으로 들어오면 모서리
  if ((x <= m || x >= maxX() - m) && (y <= m || y >= maxY() - m)) return dive("corner");
  later(fleeTick, fps);
}
function stopRunning() {
  mode = "stopping";
  const H = HOPSEQ[view];
  play([{ frame: H[5] }, { frame: H[1] }, { frame: H[0] }], 12, () => {
    mode = "calm";
    hopping = false;
    rest = 6;
    speed = 0;
    calmTick();
  });
}

// ---- 굴: 32x13칸을 직접 찍는 작은 캔버스. 열 때마다 가장자리가 다르고, 메워지고 부서지는 모양도 매번 무작위
const HC = 32, HR = 13, COVER_STEPS = 3;
const DIRT = { top: "#be9a70", mid: "#a8845e", low: "#80603f", fill: "#96724f", fillHi: "#b6926a", fillLo: "#7e5e40", mouth: "#342822", mouthIn: "#1e1816" };
const bk = (cx, cy) => cy * HC + cx, bx = (k) => k % HC, by = (k) => Math.floor(k / HC);
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function newBurrow(canvas) {
  return { el: canvas, ctx: canvas.getContext("2d"), cells: new Map(), mouth: new Set(), total: 0, level: 0, gen: 0 };
}
function bdraw(b) {
  b.ctx.clearRect(0, 0, HC * PX, HR * PX);
  for (const [k, c] of b.cells) {
    b.ctx.fillStyle = c;
    b.ctx.fillRect(bx(k) * PX, by(k) * PX, PX, PX);
  }
}
function bbuild(b) {
  b.cells.clear();
  b.mouth.clear();
  b.level = 0;
  const rx = 14.4 + Math.random() * 0.8, ry = 4.8 + Math.random() * 0.3;
  for (let yy = 0; yy < HR; yy++) {
    for (let xx = 0; xx < HC; xx++) {
      const v = ((xx + 0.5 - 16) / rx) ** 2 + ((yy + 0.5 - 7.3) / ry) ** 2;
      if (v > 1 + (Math.random() - 0.5) * 0.3) continue; // 가장자리 들쭉날쭉
      const t = (yy + 0.5 - (7.3 - ry)) / (2 * ry);
      let c = t < 0.3 ? DIRT.top : t < 0.62 ? DIRT.mid : DIRT.low;
      if (((xx + 0.5 - 16) / 10.6) ** 2 + ((yy + 0.5 - 7.0) / 3.0) ** 2 <= 1) {
        c = ((xx + 0.5 - 16) / 9) ** 2 + ((yy + 0.5 - 7.6) / 2.2) ** 2 <= 1 ? DIRT.mouthIn : DIRT.mouth;
        b.mouth.add(bk(xx, yy));
      }
      b.cells.set(bk(xx, yy), c);
    }
  }
  b.total = b.cells.size - b.mouth.size;
  bdraw(b);
}
const fillColor = (yy) => {
  const r = Math.random();
  return yy <= 6 ? (r < 0.25 ? DIRT.fill : DIRT.fillHi) : yy <= 8 ? (r < 0.2 ? DIRT.fillHi : DIRT.fill) : DIRT.fillLo;
};
const nb = (b, k) => N4.filter(([a, c]) => b.cells.has(bk(bx(k) + a, by(k) + c))).length;
const isEdge = (b, k) =>
  N4.some(([a, c]) => {
    const X = bx(k) + a, Y = by(k) + c;
    return X < 0 || Y < 0 || X >= HC || Y >= HR || !b.cells.has(bk(X, Y));
  });
// 홀로 떨어진 칸(이웃 0~1개)은 지워서 지저분한 점이 남지 않게
function tidy(b) {
  for (let r = 0; r < 2; r++) for (const k of [...b.cells.keys()]) if (!b.mouth.has(k) && nb(b, k) <= 1) b.cells.delete(k);
}
// 한 번 누르기: 누른 쪽(각도 th) 둘레 흙을 무작위로 뜯어내고, 그쪽부터 구덩이를 메움
function bcover(b, th) {
  const left = COVER_STEPS - b.level;
  const ms = [...b.mouth].map((k) => ({ k, d: -((Math.cos(th) * (bx(k) + 0.5 - 16)) / 10.6 + (Math.sin(th) * (by(k) + 0.5 - 7)) / 3) + Math.random() * 0.15 }));
  ms.sort((a, c) => a.d - c.d);
  for (const { k } of ms.slice(0, left <= 1 ? ms.length : Math.ceil(ms.length / left))) {
    b.mouth.delete(k);
    b.cells.set(k, fillColor(by(k)));
  }
  const cut = Math.round(b.total * (0.25 + Math.random() * 0.07));
  for (let i = 0; i < cut; i++) {
    const edges = [...b.cells.keys()].filter((k) => !b.mouth.has(k) && isEdge(b, k));
    if (!edges.length) break;
    let best = edges[0], bw = -1e9;
    for (let j = 0; j < 6; j++) {
      const k = edges[Math.floor(Math.random() * edges.length)], X = bx(k) + 0.5 - 16, Y = (by(k) + 0.5 - 7.3) * 3;
      const w = (Math.cos(th) * X + Math.sin(th) * Y) / (Math.hypot(X, Y) || 1) + (4 - nb(b, k)) * 0.45 + Math.random() * 0.5;
      if (w > bw) { bw = w; best = k; }
    }
    b.cells.delete(best);
  }
  tidy(b);
  b.level += 1;
  bdraw(b);
}
// 부서지기: 장면마다 가장자리 칸을 무작위로 떼어 내 들쭉날쭉 작아지다 사라짐(투명도 안 씀)
function bcrumble(b, frames, ms, done) {
  for (const k of b.mouth) b.cells.set(k, fillColor(by(k)));
  b.mouth.clear();
  b.gen += 1;
  const gen = b.gen;
  if (reduced()) {
    b.cells.clear();
    bdraw(b);
    return done();
  }
  const per = Math.ceil(b.cells.size / frames);
  let f = 0;
  const step = () => {
    if (b.gen !== gen) return;
    f += 1;
    if (f >= frames) {
      b.cells.clear();
      bdraw(b);
      return setTimeout(() => { if (b.gen === gen) done(); }, ms);
    }
    const n = per * (0.7 + Math.random() * 0.6);
    for (let i = 0; i < n; i++) {
      const edges = [...b.cells.keys()].filter((k) => isEdge(b, k));
      if (!edges.length) break;
      let best = edges[0], bw = -1e9;
      for (let j = 0; j < 4; j++) {
        const k = edges[Math.floor(Math.random() * edges.length)], w = 4 - nb(b, k) + Math.random() * 1.5;
        if (w > bw) { bw = w; best = k; }
      }
      b.cells.delete(best);
    }
    bdraw(b);
    setTimeout(step, ms);
  };
  bdraw(b);
  setTimeout(step, ms);
}
const holeX = () => parseFloat(hole.style.left) + 16 * PX;
const holeY = () => parseFloat(hole.style.top) + 7 * PX;
function openHole() {
  B.gen += 1; // 부서지던 중이면 멈춤
  hole.style.left = `${snap(x + feetCx() - 16 * PX)}px`;
  hole.style.top = `${snap(y + FEET - 15)}px`;
  holeLevel = 0;
  bbuild(B);
  hole.className = "pixel-hole open";
}
function closeHole(done) {
  hole.className = "pixel-hole shown";
  bcrumble(B, 5, 80, () => {
    hole.className = "pixel-hole";
    holeLevel = 0;
    if (done) done();
  });
}
// 흙 부스러기: 굴 입구에서 픽셀 조각이 튀어 오름
function dirt(big) {
  const hx = holeX(), hy = holeY() - 2;
  const bits = [[-18, -16], [-9, -24], [5, -21], [14, -14], [20, -9]];
  if (big) bits.push([-26, -12], [-14, -30], [0, -34], [10, -28], [26, -14], [-4, -18]);
  bits.forEach(([dx, up], k) => {
    const b = document.createElement("span");
    b.className = `pixel-dirt${k % 2 ? " dark" : ""}`;
    b.style.left = `${hx}px`;
    b.style.top = `${hy}px`;
    b.style.setProperty("--dx", `${dx}px`);
    b.style.setProperty("--up", `${up}px`);
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 700);
  });
}
// ---- 하트: 빵 하고 떠올랐다가 뿅 터짐
const HEART = [
  "..LLLLL...LLLRR..",
  ".LHHLLLR.LhLLRRR.",
  "LHHhLLRRRLLLRRRRD",
  "LHhLLRRRRRRRRRRDD",
  "LhLLRRRRRRRRRRRDD",
  "LLRRRRRRRRRRRRDDE",
  ".LRRRRRRRRRRRRDE.",
  "..RRRRRRRRRRRDE..",
  "...RRRRRRRRRDE...",
  "....RRRRRRRDE....",
  ".....RRRRRDE.....",
  "......RRRDE......",
  ".......RDE.......",
  "........E........",
];
const MINI = [".L.R.", "LhRRD", ".RRD.", "..D.."];
const HCOL = { H: "#ffffff", h: "#ffbec8", L: "#ff5c70", R: "#e2263e", D: "#aa1630", E: "#780c24" };
function pixCanvas(rows, outline) {
  const pad = outline ? 1 : 0;
  const w = rows[0].length, h = rows.length;
  const cv = document.createElement("canvas");
  cv.width = (w + pad * 2) * PX;
  cv.height = (h + pad * 2) * PX;
  cv.setAttribute("aria-hidden", "true");
  const g = cv.getContext("2d");
  const on = (cx, cy) => cy >= 0 && cy < h && cx >= 0 && cx < w && rows[cy][cx] !== ".";
  for (let cy = -pad; cy < h + pad; cy++) {
    for (let cx = -pad; cx < w + pad; cx++) {
      const col = on(cx, cy) ? HCOL[rows[cy][cx]] : outline && N4.some(([a, b]) => on(cx + a, cy + b)) ? "#2b2d38" : null;
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect((cx + pad) * PX, (cy + pad) * PX, PX, PX);
    }
  }
  return cv;
}
function heartPop(cx, cy) {
  cx = Math.round(clamp(cx, 30, window.innerWidth - 30));
  cy = Math.round(Math.max(cy, 44));
  const hv = pixCanvas(HEART, true);
  hv.className = "pixel-heart";
  hv.style.left = `${cx}px`;
  hv.style.top = `${cy}px`;
  document.body.appendChild(hv);
  setTimeout(() => {
    hv.classList.add("burst");
    setTimeout(() => hv.remove(), 70);
    const top = cy - 22; // 떠오른 자리에서 터짐
    for (let k = 0; k < 12; k++) {
      const big = k % 2 === 0;
      const a = (k / 12) * Math.PI * 2 - Math.PI / 2 + (Math.random() - 0.5) * 0.45;
      const d = (big ? 34 : 22) + Math.random() * 12;
      const b = big ? pixCanvas(MINI, false) : document.createElement("span");
      b.className = big ? "pixel-bit" : `pixel-bit sq c${k % 3}`;
      b.setAttribute("aria-hidden", "true");
      b.style.left = `${cx}px`;
      b.style.top = `${top}px`;
      b.style.setProperty("--dx", `${snap(Math.cos(a) * d)}px`);
      b.style.setProperty("--dy", `${snap(Math.sin(a) * d)}px`);
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 620);
    }
  }, 640);
}
// 굴로 쏙. kind: corner(모서리로 몰림) · caught(잡힌 뒤) · duck(굽기 직전) · leave(작업 끝)
function dive(kind, done) {
  mode = kind === "duck" ? "ducking" : kind === "leave" ? "leaving" : "diving";
  clearTimeout(timer);
  speed = 0;
  openHole();
  if (kind === "corner") zone = { x: x < window.innerWidth / 2 ? 0 : window.innerWidth, y: y < window.innerHeight / 2 ? 0 : window.innerHeight, r: 180 };
  else zone = { x: holeX(), y: holeY(), r: 150 };
  if (kind === "caught") {
    play([{ frame: 16, clip: true, sink: 0 }, { frame: 14, sink: 10 }, { frame: 14, sink: 22 }, { frame: 14, sink: 34 }, { frame: 14, sink: 46 }, { frame: 14, sink: 58 }, { frame: 14, sink: 72 }], 12, done || hide);
  } else {
    const H = HOPSEQ[view];
    play([{ frame: H[1] }, { frame: H[3], lift: -8 }, { frame: H[0], clip: true, sink: 8 }, { frame: H[0], sink: 20 }, { frame: H[0], sink: 34 }, { frame: H[0], sink: 48 }, { frame: H[0], sink: 60 }, { frame: H[0], sink: 72 }], 16, done || hide);
  }
}
function hide() {
  mode = "hidden";
  awaySince = 0;
  view = "side";
  frame = 0;
  sink = 72;
  hole.className = "pixel-hole shown diggable";
  render();
}
// 굴에서 나오기: 귀 끝 빼꼼 → 눈까지 → 두리번 → 코 씰룩 → 흙을 튀기며 뛰어나옴. 나오는 중에 마우스가 다시 오면 쏙 들어감
function emerge() {
  mode = "emerging";
  awaySince = 0;
  hole.className = "pixel-hole shown";
  if (holeLevel > 0) {
    dirt(true); // 덜 메워졌으면 흙을 밀어내고 나옴
    holeLevel = 0;
    bbuild(B);
  }
  const toward = holeX() < window.innerWidth / 2 ? 1 : -1, c = PX;
  const near = () => ptr.on && zone && Math.hypot(ptr.x - zone.x, ptr.y - zone.y) < zone.r * 0.75;
  play(
    [
      { frame: 14, sink: 22 * c }, { frame: 14, sink: 18 * c }, { frame: 14, sink: 18 * c }, { frame: 14, sink: 11 * c }, { frame: 14, sink: 11 * c },
      { frame: 0, sink: 15 * c, face: -toward }, { frame: 0, sink: 15 * c, face: -toward }, { frame: 0, sink: 15 * c, face: toward }, { frame: 6, sink: 15 * c, face: toward },
      { frame: 1, sink: 8 * c }, { frame: 2, sink: 4 * c, dirt: true },
      { frame: 3, sink: 0, clip: false, lift: -6 * c, dx: 4 * c * toward }, { frame: 3, lift: -8 * c, dx: 4 * c * toward }, { frame: 4, lift: -3 * c, dx: 3 * c * toward }, { frame: 5 },
    ],
    12,
    () => {
      closeHole();
      view = "side";
      mode = "calm";
      hopping = false;
      rest = 4;
      calmTarget = null;
      calmTick();
    },
    () => mode === "emerging" && sink >= 11 * c && near(),
    () => play([{ frame: 14, sink: 40 }, { frame: 14, sink: 56 }, { frame: 14, sink: 72 }], 14, hide)
  );
}
// 새 굴을 파고 튀어나오기(처음 나올 때, 흙에 다 덮였을 때)
function popOut(p) {
  x = p.x;
  y = p.y;
  view = "side";
  frame = 14;
  sink = 72;
  el.classList.add("clip");
  render();
  openHole();
  const toward = x + CW / 2 < window.innerWidth / 2 ? 1 : -1, c = PX;
  mode = "emerging";
  seq = setTimeout(() => {
    dirt(true);
    play(
      [{ frame: 14, sink: 16 * c }, { frame: 1, sink: 8 * c, face: toward }, { frame: 2, sink: 4 * c, dirt: true },
       { frame: 3, sink: 0, clip: false, lift: -7 * c, dx: 4 * c * toward }, { frame: 3, lift: -9 * c, dx: 4 * c * toward }, { frame: 4, lift: -3 * c, dx: 3 * c * toward }, { frame: 5 }],
      14,
      () => {
        closeHole();
        view = "side";
        mode = "calm";
        hopping = false;
        rest = 3;
        calmTarget = null;
        calmTick();
      }
    );
  }, 260);
}

// ---- 숨은 굴 둘레를 누르면 그쪽 흙이 구덩이로 밀려 들어가 메워짐. 세 번이면 다 메워지고 먼 곳에서 새로 튀어나옴
function onHoleDown(e) {
  if (mode !== "hidden") return;
  e.preventDefault();
  e.stopPropagation();
  if (holeLevel >= COVER_STEPS) return;
  holeLevel += 1;
  const k = holeLevel, hx = holeX(), hy = holeY();
  const rx = 14.6 * (1 - (k - 1) * 0.2) * PX, ry = 4.9 * (1 - (k - 1) * 0.12) * PX;
  const th = Math.atan2(((e.clientY - hy) * rx) / ry, e.clientX - hx);
  [-0.45, -0.15, 0.15, 0.45].forEach((d, i) => {
    const a = th + d + (Math.random() - 0.5) * 0.2, sx = hx + Math.cos(a) * rx * 0.85, sy = hy + Math.sin(a) * ry * 0.85;
    const b = document.createElement("span");
    b.className = `pixel-push${i % 2 ? " dark" : i ? " light" : ""}`;
    b.style.left = `${snap(sx) - 2}px`;
    b.style.top = `${snap(sy) - 2}px`;
    b.style.setProperty("--dx", `${snap(hx - sx + (Math.random() * 6 - 3))}px`);
    b.style.setProperty("--dy", `${snap(hy - sy + (Math.random() * 2 - 1))}px`);
    b.style.animationDelay = `${i * 25}ms`;
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 360);
  });
  setTimeout(() => bcover(B, th), 240);
  if (k === COVER_STEPS) {
    mode = "buried";
    hole.className = "pixel-hole shown";
    seq = setTimeout(escapeElsewhere, 700);
  }
}
function escapeElsewhere() {
  // 메워진 흙더미는 그 자리에서 무작위로 부서지며 사라짐
  const oc = document.createElement("canvas");
  oc.width = hole.width;
  oc.height = hole.height;
  oc.className = "pixel-hole shown";
  oc.style.left = hole.style.left;
  oc.style.top = hole.style.top;
  document.body.insertBefore(oc, hole);
  const ob = newBurrow(oc);
  ob.cells = new Map(B.cells);
  bdraw(ob);
  bcrumble(ob, 6, 140, () => oc.remove());
  // 마우스에서 가장 먼 자리(모서리 근처·광고 피함)
  let best = null, bestD = -1;
  for (let i = 0; i < 18; i++) {
    const cx = snap(60 + Math.random() * Math.max(1, maxX() - 120)), cy = snap(50 + Math.random() * Math.max(1, maxY() - 100));
    if (onAd(cx, cy)) continue;
    const d = ptr.on ? Math.hypot(cx + CW / 2 - ptr.x, cy + CH / 2 - ptr.y) : Math.random() * 1000;
    if (d > bestD) { bestD = d; best = { x: cx, y: cy }; }
  }
  popOut(best || { x: snap(maxX() / 2), y: snap(maxY() / 2) });
}

// ---- 잡기: 도망치는 토끼를 누르면 방문자마다 딱 한 번 잡힘 → 한마디 → 그 자리 굴로
function onRabbitDown(e) {
  if (!LIVE.includes(mode)) return;
  e.preventDefault();
  e.stopPropagation(); // 토끼 밑의 버튼이 같이 눌리지 않게
  if (mode === "calm") return startle();
  if (mode === "startle") return;
  if (!caughtOnce) return caught();
  say(T.taunts[Math.floor(Math.random() * T.taunts.length)]);
  ptr.v = Math.max(ptr.v, 1400);
  target = 600 * SPEEDK;
  speed = Math.max(speed, 480 * SPEEDK);
  lastThreat = performance.now();
  aimAway();
  if (mode === "stopping") {
    mode = "flee";
    runI = 2;
    fleeTick();
  }
}
function caught() {
  mode = "caught";
  caughtOnce = true;
  try { localStorage.setItem(KEY, "1"); } catch (_) { /* 저장 안 되는 브라우저 */ }
  clearTimeout(timer);
  clearTimeout(seq);
  lift = 0;
  speed = 0;
  say(T.caught, 1100);
  const x0 = x;
  play([{ frame: 15, dx: 2 }, { frame: 15, dx: -4 }, { frame: 15, dx: 4 }, { frame: 15, dx: -2 }, { frame: 15 }, { frame: 15 }, { frame: 15 }, { frame: 15 }], 14, () => {
    x = x0;
    frame = 16;
    render();
    say(T.once, 1500);
    seq = setTimeout(() => dive("caught"), 1600);
  });
}

// ---- 나타나기·사라지기
function show() {
  if (reduced()) return;
  if (!built) build();
  shownAt = performance.now();
  el.style.display = "block";
  listen(true);
  // 화면 아래쪽 왼편에 굴을 파고 튀어나옴
  popOut(freeSpot(() => ({ x: snap(window.innerWidth * (0.08 + Math.random() * 0.3)), y: snap(maxY() * (0.55 + Math.random() * 0.35)) })));
}
function hideNow() {
  clearTimeout(timer);
  clearTimeout(seq);
  listen(false);
  mode = "off";
  if (el) {
    el.style.display = "none";
    el.classList.remove("clip", "talk", "touchable");
    shadow.style.display = "none";
    hole.className = "pixel-hole";
  }
  sink = 0;
  lift = 0;
  duckWaiters.splice(0).forEach((r) => r());
  if (busy > 0) show(); // 들어가는 사이 새 작업이 시작됐으면 다시 나옴
}
// 작업이 모두 끝나면: 지금 자리에 굴 → 쏙 → 굴이 부서지며 사라짐
function finish() {
  clearTimeout(finishTimer);
  if (busy > 0 || mode === "off" || mode === "leaving") return;
  if (LIVE.includes(mode)) return dive("leave", () => closeHole(hideNow));
  if (mode === "hidden" || mode === "ducked" || mode === "buried") {
    clearTimeout(seq);
    mode = "leaving";
    return closeHole(hideNow);
  }
  finishTimer = setTimeout(finish, 300); // 깜짝·나오는 중·잡힘 장면이 끝나면 다시
}

export function rabbitStart() {
  busy += 1;
  clearTimeout(finishTimer);
  if (mode === "off") show();
}

export function rabbitStop() {
  busy = Math.max(0, busy - 1);
  if (busy > 0) return;
  clearTimeout(finishTimer);
  // 너무 잠깐 보였다 사라지지 않게 최소 1.2초는 보여 줌
  finishTimer = setTimeout(finish, Math.max(300, 1200 - (performance.now() - shownAt)));
}

// 화면이 잠깐 멈추는 일(GIF 굽기) 직전에 부름: 발밑 굴로 숨을 때까지 기다림
export function rabbitDuck() {
  if (mode === "emerging") {
    // 나오는 중이면 그 자리에서 바로 굴 속으로
    clearTimeout(timer);
    clearTimeout(seq);
    el.classList.add("clip");
    sink = 72;
    mode = "ducked";
    render();
    return Promise.resolve();
  }
  if (!LIVE.includes(mode) && mode !== "ducking") return Promise.resolve();
  return new Promise((resolve) => {
    duckWaiters.push(resolve);
    if (mode === "ducking") return;
    dive("duck", () => {
      mode = "ducked";
      sink = 72;
      render();
      duckWaiters.splice(0).forEach((r) => r());
    });
    // 혹시 늦어져도 1.5초 넘게 붙잡지 않음
    setTimeout(() => duckWaiters.splice(0).forEach((r) => r()), 1500);
  });
}

// 멈춤이 끝난 뒤 부름: 아직 작업 중이면 굴에서 다시 나옴
export function rabbitResume() {
  if (mode !== "ducked") return;
  if (busy > 0) emerge();
  else finish();
}

// 잠깐 인사(예: 링크 복사): anchor 옆에 굴을 파고 앞모습으로 나와 한 번 깡충, 쏙 들어가면서 하트를 터뜨림
export function rabbitGreet(anchor) {
  if (reduced()) return;
  if (mode !== "off") {
    if (el) heartPop(x + feetCx(), y + 4); // 이미 나와 있으면 하트만
    return;
  }
  if (!built) build();
  const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
  let gx = r ? r.right + 10 : window.innerWidth / 2 - CW / 2;
  if (r && gx > maxX()) gx = r.left - CW - 10; // 오른쪽에 자리가 없으면 왼쪽
  x = snap(clamp(gx, 0, maxX()));
  y = snap(clamp(r ? r.bottom - FEET : maxY() - 40, 0, maxY()));
  mode = "greeting";
  view = "side";
  faceDir = 1;
  frame = 14;
  sink = 72;
  lift = 0;
  el.classList.add("clip");
  el.style.display = "block";
  render();
  openHole();
  const c = PX;
  seq = setTimeout(() => {
    dirt(true);
    play(
      [
        { frame: 14, sink: 22 * c }, { frame: 14, sink: 14 * c }, { frame: 14, sink: 6 * c }, { frame: 14, sink: 0 },
        { frame: 16, sink: 0 }, { frame: 18, sink: 0 }, { frame: 19, sink: 0, lift: -6 }, { frame: 19, sink: 0, lift: -8 }, { frame: 21, sink: 0 },
        { frame: 16, sink: 0 }, { frame: 16, sink: 0 }, { frame: 16, sink: 0 }, { frame: 14, sink: 0 },
        { frame: 17, sink: 4 * c, fn: () => heartPop(x + feetCx(), y + 4) }, { frame: 14, sink: 14 * c }, { frame: 14, sink: 24 * c }, { frame: 14, sink: 72 },
      ],
      10,
      () => closeHole(hideNow)
    );
  }, 220);
}
