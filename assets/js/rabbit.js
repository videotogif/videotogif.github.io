// 작업 중에 화면을 뛰어다니는 픽셀 토끼 (잡기 놀이)
// - rabbitStart()/rabbitStop()을 짝으로 부르면, 작업이 하나라도 남아 있는 동안 토끼가 나온다
// - 절대 못 잡음: 마우스(손가락)가 다가오면 먼저 도망가고, 클릭은 토끼에 닿지 않음 (가끔 약 올림)
// - 움직임은 CSS transition/animation이라 GIF를 굽느라 화면이 바쁠 때도 제자리 깡충거림은 계속된다
// - '동작 줄이기' 설정을 켠 사람에게는 나오지 않는다

const SIZE_W = 60; // 20칸 × 3배
const SIZE_H = 54; // 18칸 × 3배
const IS_EN = (document.documentElement.lang || "").toLowerCase().startsWith("en");
const TAUNTS = IS_EN ? ["Can't catch me!", "Too slow!", "Nope!"] : ["못 잡지롱~", "메롱~", "어림없지!"];

let busy = 0;
let hideTimer = null;
let el = null;
let flip = null;
let bubble = null;
let wanderTimer = null;
let lastFlee = 0;
let lastTaunt = 0;
let x = 0;
let y = 0;
let active = false;

const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const bounds = () => ({ w: Math.max(0, window.innerWidth - SIZE_W), h: Math.max(0, window.innerHeight - SIZE_H) });

function build() {
  el = document.createElement("div");
  el.className = "pixel-rabbit";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML =
    '<div class="pr-flip"><div class="pr-hop"><span class="pr-f1"></span><span class="pr-f2"></span></div></div>' +
    '<div class="pr-bubble"></div>';
  flip = el.querySelector(".pr-flip");
  bubble = el.querySelector(".pr-bubble");
  document.body.appendChild(el);
}

function center() {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

function moveTo(nx, ny, speed) {
  if (!el) return;
  const b = bounds();
  nx = clamp(nx, 0, b.w);
  ny = clamp(ny, 0, b.h);
  const { cx, cy } = center();
  const dist = Math.hypot(nx + SIZE_W / 2 - cx, ny + SIZE_H / 2 - cy);
  const dur = Math.max(0.25, dist / speed);
  flip.classList.toggle("left", nx < x);
  x = nx;
  y = ny;
  el.style.transition = `transform ${dur.toFixed(2)}s linear`;
  el.style.transform = `translate(${x}px, ${y}px)`;
  clearTimeout(wanderTimer);
  wanderTimer = setTimeout(wander, dur * 1000 + 250 + Math.random() * 900);
}

function wander() {
  if (!active) return;
  const b = bounds();
  // 너무 짧게 움직이지 않도록 지금 자리에서 어느 정도 떨어진 곳으로
  let nx = Math.random() * b.w;
  let ny = Math.random() * b.h;
  if (Math.hypot(nx - x, ny - y) < 160) {
    nx = x < b.w / 2 ? b.w * (0.6 + Math.random() * 0.4) : b.w * Math.random() * 0.4;
  }
  moveTo(nx, ny, 260);
}

function onPointerMove(e) {
  if (!active || !el) return;
  const now = performance.now();
  if (now - lastFlee < 60) return;
  const { cx, cy } = center();
  const dx = cx - e.clientX;
  const dy = cy - e.clientY;
  const d = Math.hypot(dx, dy);
  if (d > 190) return;
  lastFlee = now;
  // 가까이 오면 가끔 약 올림
  if (now - lastTaunt > 1600 && Math.random() < 0.5) {
    lastTaunt = now;
    bubble.textContent = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
    el.classList.add("taunt");
    setTimeout(() => el && el.classList.remove("taunt"), 900);
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
  if (active || reduced()) return;
  if (!el) build();
  active = true;
  const b = bounds();
  // 화면 왼쪽 아래 밖에서 뛰어 들어옴
  x = -SIZE_W;
  y = b.h * (0.55 + Math.random() * 0.35);
  el.style.transition = "none";
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.style.display = "block";
  void el.offsetWidth; // 시작 위치 반영
  flip.classList.remove("left");
  moveTo(b.w * (0.2 + Math.random() * 0.5), y, 300);
  document.addEventListener("pointermove", onPointerMove, { passive: true });
}

function hide() {
  if (!active) return;
  active = false;
  clearTimeout(wanderTimer);
  document.removeEventListener("pointermove", onPointerMove);
  if (el) el.style.display = "none";
}

let shownAt = 0;
export function rabbitStart() {
  busy += 1;
  clearTimeout(hideTimer);
  // 기다리는 일이 생기면 바로 등장 (프레임 추출, GIF 굽기, 텍스트 넣기, 자르기 모두)
  if (!active) {
    show();
    shownAt = performance.now();
  }
}

export function rabbitStop() {
  busy = Math.max(0, busy - 1);
  if (busy === 0) {
    clearTimeout(hideTimer);
    // 작업이 연달아 이어질 때 깜빡이지 않게, 그리고 너무 잠깐 보였다 사라지지 않게 최소 1.2초는 보여 줌
    const left = Math.max(500, 1200 - (performance.now() - shownAt));
    hideTimer = setTimeout(hide, left);
  }
}
