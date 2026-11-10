// 작업 중에 화면을 뛰어다니는 픽셀 토끼 (잡기 놀이, 절대 못 잡음)
// - rabbitStart()/rabbitStop()을 짝으로 부르면, 기다리는 작업이 하나라도 있는 동안 토끼가 나온다
// - 픽셀 아트 방식: 6장짜리 깡충 동작을 초당 12장으로 끊어서 바꿔 끼우고(부드러운 보간 없음),
//   위치도 3px(그림 한 칸) 단위로 뚝뚝 끊어서 옮긴다
// - 마우스(손가락)가 다가오면 먼저 도망가고, 클릭은 토끼에 닿지 않음 (가끔 약 올림)
// - 작업이 끝나면 화면 아래에 굴이 생기고 토끼가 쏙 들어간 뒤 굴이 닫힘
// - 움직임은 CSS(transition/animation)라 GIF를 굽느라 화면이 바쁠 때도 깡충거림은 계속된다
// - '동작 줄이기' 설정을 켠 사람에게는 나오지 않는다

const PX = 3; // 그림 한 칸 = 3px
const SIZE_W = 20 * PX; // 60
const SIZE_H = 26 * PX; // 78 (위쪽은 점프 공간)
const FEET_Y = 24 * PX; // 상자 위에서 발바닥까지 (72)
const HOLE_W = 24 * PX; // 72
const HOLE_H = 10 * PX; // 30
const FPS = 12;
const IS_EN = (document.documentElement.lang || "").toLowerCase().startsWith("en");
const TAUNTS = IS_EN ? ["Can't catch me!", "Too slow!", "Nope!"] : ["못 잡지롱~", "메롱~", "어림없지!"];

let busy = 0;
let el = null;
let flip = null;
let bubble = null;
let hole = null;
let active = false;
let homing = false;
let wanderTimer = null;
let hideTimer = null;
let homeTimers = [];
let lastFlee = 0;
let lastTaunt = 0;
let shownAt = 0;
let x = 0;
let y = 0;

const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const snap = (v) => Math.round(v / PX) * PX; // 픽셀 격자에 맞춤
const bounds = () => ({ w: Math.max(0, window.innerWidth - SIZE_W), h: Math.max(0, window.innerHeight - SIZE_H) });

function build() {
  el = document.createElement("div");
  el.className = "pixel-rabbit";
  el.setAttribute("aria-hidden", "true");
  let frames = "";
  for (let i = 0; i < 6; i++) frames += `<span class="pr-fr" style="--i:${i}"></span>`;
  el.innerHTML = `<div class="pr-flip"><div class="pr-sink">${frames}</div></div><div class="pr-bubble"></div>`;
  flip = el.querySelector(".pr-flip");
  bubble = el.querySelector(".pr-bubble");
  hole = document.createElement("div");
  hole.className = "pixel-hole";
  hole.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  document.body.appendChild(hole);
}

function center() {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

// 목표 지점까지 초당 12번, 칸 단위로 끊어서 이동. 이동에 걸리는 시간(초)을 돌려줌
function moveTo(nx, ny, speed, keepWandering = true) {
  if (!el) return 0;
  const b = bounds();
  nx = snap(clamp(nx, 0, b.w));
  ny = snap(clamp(ny, 0, b.h));
  const dist = Math.hypot(nx - x, ny - y);
  const dur = Math.max(1 / FPS, dist / speed);
  const steps = Math.max(1, Math.round(dur * FPS));
  if (nx !== x) flip.classList.toggle("left", nx < x);
  x = nx;
  y = ny;
  el.style.transition = `transform ${dur.toFixed(3)}s steps(${steps}, end)`;
  el.style.transform = `translate(${x}px, ${y}px)`;
  clearTimeout(wanderTimer);
  if (keepWandering) wanderTimer = setTimeout(wander, dur * 1000 + 250 + Math.random() * 900);
  return dur;
}

function wander() {
  if (!active || homing) return;
  const b = bounds();
  let nx = Math.random() * b.w;
  let ny = Math.random() * b.h;
  if (Math.hypot(nx - x, ny - y) < 160) {
    nx = x < b.w / 2 ? b.w * (0.6 + Math.random() * 0.4) : b.w * Math.random() * 0.4;
  }
  moveTo(nx, ny, 240);
}

function taunt() {
  bubble.textContent = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
  el.classList.add("taunt");
  setTimeout(() => el && el.classList.remove("taunt"), 900);
}

function onPointerMove(e) {
  if (!active || homing || !el) return;
  const now = performance.now();
  if (now - lastFlee < 60) return;
  const { cx, cy } = center();
  const dx = cx - e.clientX;
  const dy = cy - e.clientY;
  const d = Math.hypot(dx, dy);
  if (d > 190) return;
  lastFlee = now;
  if (now - lastTaunt > 1600 && Math.random() < 0.5) {
    lastTaunt = now;
    taunt();
  }
  // 손에서 먼 쪽으로 깡충, 벽에 막히면 옆으로 비켜 감
  const ux = d ? dx / d : 1;
  const uy = d ? dy / d : 0;
  const reach = 220 + Math.random() * 120;
  let nx = cx + ux * reach - SIZE_W / 2;
  let ny = cy + uy * reach - SIZE_H / 2;
  const b = bounds();
  if (nx < 0 || nx > b.w) nx = cx - ux * 40 + (Math.random() < 0.5 ? -1 : 1) * reach - SIZE_W / 2;
  if (ny < 0 || ny > b.h) ny = cy + (Math.random() < 0.5 ? -1 : 1) * reach * 0.6 - SIZE_H / 2;
  moveTo(nx, ny, 1100);
}

function show() {
  if (reduced()) return;
  if (!el) build();
  active = true;
  shownAt = performance.now();
  const b = bounds();
  // 화면 왼쪽 아래 밖에서 깡충깡충 들어옴
  x = -SIZE_W;
  y = snap(b.h * (0.55 + Math.random() * 0.35));
  el.classList.remove("diving");
  el.style.transition = "none";
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.style.display = "block";
  void el.offsetWidth;
  flip.classList.remove("left");
  moveTo(b.w * (0.2 + Math.random() * 0.5), y, 260);
  document.addEventListener("pointermove", onPointerMove, { passive: true });
}

// 작업이 끝나면: 화면 아래에 굴이 열리고 → 토끼가 굴로 달려가 → 쏙 들어간 뒤 → 굴이 닫힘
function goHome() {
  if (!active || !el) return;
  homing = true;
  clearTimeout(wanderTimer);
  document.removeEventListener("pointermove", onPointerMove);
  const { cx } = center();
  const holeX = snap(clamp(cx - HOLE_W / 2, 8, window.innerWidth - HOLE_W - 8));
  const holeY = snap(window.innerHeight - HOLE_H - 12); // 굴 위쪽 모서리
  const lineY = holeY + HOLE_H / 2; // 굴 구멍 가운데 줄
  hole.style.left = `${holeX}px`;
  hole.style.top = `${holeY}px`;
  hole.className = "pixel-hole open";
  const dur = moveTo(holeX + HOLE_W / 2 - SIZE_W / 2, lineY - FEET_Y, 520, false);
  homeTimers.push(
    setTimeout(() => {
      el.classList.add("diving"); // 웅크린 자세로 굴 속으로 뚝뚝 내려감
      homeTimers.push(
        setTimeout(() => {
          hole.className = "pixel-hole closing";
          homeTimers.push(setTimeout(finishHide, 260));
        }, 480)
      );
    }, dur * 1000 + 140)
  );
}

function cancelHome() {
  homeTimers.forEach(clearTimeout);
  homeTimers = [];
  homing = false;
  if (hole) hole.className = "pixel-hole";
  if (el) el.classList.remove("diving");
}

function finishHide() {
  homeTimers.forEach(clearTimeout);
  homeTimers = [];
  homing = false;
  active = false;
  if (el) {
    el.style.display = "none";
    el.classList.remove("diving");
  }
  if (hole) hole.className = "pixel-hole";
}

export function rabbitStart() {
  busy += 1;
  clearTimeout(hideTimer);
  if (homing) {
    // 굴로 들어가던 중에 새 작업이 시작되면 다시 나와서 뛰어다님
    cancelHome();
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    wander();
    return;
  }
  // 기다리는 일이 생기면 바로 등장 (프레임 추출, GIF 굽기, 텍스트 넣기, 자르기 모두)
  if (!active) show();
}

export function rabbitStop() {
  busy = Math.max(0, busy - 1);
  if (busy === 0) {
    clearTimeout(hideTimer);
    // 작업이 연달아 이어질 때 깜빡이지 않게, 그리고 너무 잠깐 보였다 사라지지 않게 최소 1.2초는 보여 줌
    const left = Math.max(500, 1200 - (performance.now() - shownAt));
    hideTimer = setTimeout(goHome, left);
  }
}
