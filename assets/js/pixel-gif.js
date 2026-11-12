// 픽셀 GIF 만들기 — 동영상을 "픽셀 아트처럼" 16·32·64칸 GIF로
//
// 그냥 줄이면(평균색) 흐린 모자이크가 된다. 픽셀 아트로 보이게 하는 규칙을 따른다
// (unfake.js · Derek Yu 튜토리얼 · 픽셀 아트 작업 규칙에서 정리한 것):
//  1. 격자 먼저: 칸 수가 곧 GIF 크기. 미리보기·크게 저장도 칸 수의 정수배
//  2. 팔레트 잠그기: 클립 전체에서 색을 8·16·32개로 묶어 모든 장면이 같은 팔레트를 씀
//  3. 칸마다 "가장 많이 차지한 색" 하나 (평균 아님) → 경계가 한 칸에서 딱 바뀜
//  4. 색조 옮기기: 밝은 색은 따뜻한 쪽, 어두운 색은 차가운 쪽으로. 가장 어두운 색은 검정 대신 짙은 남색
//  5. 외톨이 칸 정리: 사방이 다른 색인 한 칸은 주변 색으로
//  6. 깜빡임 줄이기: 앞 장면 색이 아직 충분히 맞으면 그대로 둠 (영상이라 필요한 규칙)
// GIF는 이 팔레트 그대로 직접 굽는다(디더링·색 변형 없음). 일반 GIF 변환(main.js)과는 따로 동작한다.
import { rabbitStart, rabbitStop, rabbitDuck, rabbitResume } from "./rabbit.js";

const IS_EN = (document.documentElement.lang || "").toLowerCase().startsWith("en");
const T = IS_EN
  ? {
      opening: "Opening the video...",
      another: "Choose another video",
      unsupported: "This browser can't play this video. Convert it to MP4 (H.264) or try another browser.",
      noDuration: "Couldn't read the length of this video. Please try another file.",
      sec: "s",
      center: "Center",
      posH: "Crop position (left ↔ right)",
      posV: "Crop position (top ↔ bottom)",
      live: (w, h) => `Preview ${w}×${h}`,
      swatch: (i) => `Change color ${i}`,
      paletteHint: "Click a color to change it",
      paletteReset: "Reset colors",
      picking: "Picking colors...",
      estimate: (n, sec, w, h, c) => `${n} frames · ${sec}s · ${w}×${h} · ${c} colors`,
      make: "👾 Make pixel GIF",
      extracting: (i, n) => `Drawing frames (${i}/${n})`,
      encoding: "Saving GIF...",
      info: (w, h, n, sec, size) => `${w}×${h} · ${n} frames · ${sec}s · ${size}`,
      dl: (w, h) => `Save ${w}×${h} GIF`,
      dlBig: (w, h) => `Save large (${w}×${h})`,
      preparing: "Preparing large file...",
      failed: "Couldn't make the GIF. Try a shorter length and make it again.",
      alt: (w, h) => `Pixel art GIF made at ${w}×${h}`,
    }
  : {
      opening: "동영상을 여는 중...",
      another: "다른 동영상 고르기",
      unsupported: "이 브라우저에서 열 수 없는 동영상이에요. MP4(H.264)로 바꿔서 올리거나 다른 브라우저로 열어 보세요.",
      noDuration: "이 동영상의 길이를 알 수 없어요. 다른 파일로 해 보세요.",
      sec: "초",
      center: "가운데",
      posH: "자르는 위치 (좌우)",
      posV: "자르는 위치 (위아래)",
      live: (w, h) => `미리보기 ${w}×${h}`,
      swatch: (i) => `${i}번 색 바꾸기`,
      paletteHint: "색을 누르면 바꿀 수 있어요",
      paletteReset: "원래 색으로",
      picking: "색 고르는 중...",
      estimate: (n, sec, w, h, c) => `${n}장 · ${sec}초 · ${w}×${h} · ${c}색`,
      make: "👾 픽셀 GIF 만들기",
      extracting: (i, n) => `장면 그리는 중 (${i}/${n})`,
      encoding: "GIF 저장하는 중...",
      info: (w, h, n, sec, size) => `${w}×${h} · ${n}장 · ${sec}초 · ${size}`,
      dl: (w, h) => `${w}×${h} GIF 저장`,
      dlBig: (w, h) => `크게 저장 (${w}×${h})`,
      preparing: "큰 파일 준비 중...",
      failed: "GIF를 만들지 못했어요. 길이를 줄여서 다시 만들어 보세요.",
      alt: (w, h) => `${w}×${h} 픽셀 아트 GIF`,
    };

const F = 8; // 한 칸 = 칸 수의 8배로 줄인 그림에서 8×8 픽셀이 투표
const BIG = { 16: 16, 32: 8, 64: 8 }; // 크게 저장 배율 (256, 256, 512) — 칸이 정수 픽셀이 되게
const SCAN_FRAMES = 12; // 팔레트를 고를 때 보는 장면 수 (미리보기와 GIF가 같은 팔레트를 씀)
const KEEP_RATIO = 0.6; // 앞 장면 색이 1등 표의 60% 이상이면 그대로 (깜빡임 줄이기)
const SIZE_KEY = "vtg-px-size";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- 색 계산 ----------
const TO_LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  TO_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const toSrgb8 = (l) => {
  const v = clamp(l, 0, 1);
  return Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255);
};

// 사람 눈 기준으로 색 거리를 재는 Oklab
function toOklab(r, g, b) {
  const lr = TO_LIN[r];
  const lg = TO_LIN[g];
  const lb = TO_LIN[b];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromOklab(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toSrgb8(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb8(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb8(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

// 작은 화면에서 잘 보이게 채도·대비를 올림 (실사를 그대로 묶으면 회색 모자이크가 된다)
function boost(r, g, b) {
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  return [
    clamp(Math.round((l + (r - l) * 1.35 - 128) * 1.12 + 128), 0, 255),
    clamp(Math.round((l + (g - l) * 1.35 - 128) * 1.12 + 128), 0, 255),
    clamp(Math.round((l + (b - l) * 1.35 - 128) * 1.12 + 128), 0, 255),
  ];
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}
// 색조를 목표 쪽으로 deg만큼 (가까운 방향으로) 돌림
function hueToward(h, target, deg) {
  const diff = ((target - h + 540) % 360) - 180;
  return h + Math.sign(diff) * Math.min(Math.abs(diff), deg);
}

// 같은 시드면 같은 결과 (미리보기와 GIF가 같은 팔레트)
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// k-means (Oklab). samples: Float32Array [L,a,b, L,a,b, ...]
function kmeans(samples, k) {
  const n = samples.length / 3;
  k = Math.min(k, n);
  const rand = rng(7);
  const C = new Float32Array(k * 3);
  const d2 = new Float32Array(n).fill(Infinity);
  // k-means++ 시작점
  let pick = Math.floor(rand() * n);
  for (let c = 0; c < k; c++) {
    C[c * 3] = samples[pick * 3];
    C[c * 3 + 1] = samples[pick * 3 + 1];
    C[c * 3 + 2] = samples[pick * 3 + 2];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const dl = samples[i * 3] - C[c * 3];
      const da = samples[i * 3 + 1] - C[c * 3 + 1];
      const db = samples[i * 3 + 2] - C[c * 3 + 2];
      const d = dl * dl + da * da + db * db;
      if (d < d2[i]) d2[i] = d;
      sum += d2[i];
    }
    let r = rand() * sum;
    pick = n - 1;
    for (let i = 0; i < n; i++) {
      r -= d2[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
  }
  const assign = new Int32Array(n);
  const acc = new Float64Array(k * 4);
  for (let it = 0; it < 12; it++) {
    acc.fill(0);
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < k; c++) {
        const dl = samples[i * 3] - C[c * 3];
        const da = samples[i * 3 + 1] - C[c * 3 + 1];
        const db = samples[i * 3 + 2] - C[c * 3 + 2];
        const d = dl * dl + da * da + db * db;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      assign[i] = best;
      d2[i] = bd;
      acc[best * 4] += samples[i * 3];
      acc[best * 4 + 1] += samples[i * 3 + 1];
      acc[best * 4 + 2] += samples[i * 3 + 2];
      acc[best * 4 + 3] += 1;
    }
    for (let c = 0; c < k; c++) {
      if (acc[c * 4 + 3] > 0) {
        C[c * 3] = acc[c * 4] / acc[c * 4 + 3];
        C[c * 3 + 1] = acc[c * 4 + 1] / acc[c * 4 + 3];
        C[c * 3 + 2] = acc[c * 4 + 2] / acc[c * 4 + 3];
      } else {
        // 빈 색은 가장 멀리 떨어진 샘플로 다시
        let far = 0;
        for (let i = 1; i < n; i++) if (d2[i] > d2[far]) far = i;
        C[c * 3] = samples[far * 3];
        C[c * 3 + 1] = samples[far * 3 + 1];
        C[c * 3 + 2] = samples[far * 3 + 2];
        d2[far] = 0;
      }
    }
  }
  return C;
}

// 묶은 색 → 픽셀 아트 팔레트: 밝은 색은 따뜻하게, 어두운 색은 차갑게, 가장 어두운 색은 검정 대신 짙은 남색
function artPalette(centers) {
  const k = centers.length / 3;
  const Ls = [];
  for (let c = 0; c < k; c++) Ls.push(centers[c * 3]);
  const sorted = Ls.slice().sort((a, b) => a - b);
  const lo = sorted[0];
  const hi = sorted[k - 1];
  const mid = sorted[Math.floor(k / 2)];
  const darkest = Ls.indexOf(lo);
  const out = [];
  for (let c = 0; c < k; c++) {
    const L = centers[c * 3];
    const [r, g, b] = fromOklab(L, centers[c * 3 + 1], centers[c * 3 + 2]);
    let [h, s, l] = rgbToHsl(r, g, b);
    const gray = s < 0.08;
    if (L >= mid && hi > mid) {
      const t = (L - mid) / (hi - mid);
      h = gray ? 50 : hueToward(h, 50, 18 * t);
      s = gray ? Math.max(s, 0.05 * t) : s * (1 - 0.12 * t);
      l = Math.min(1, l * (1 + 0.02 * t));
    } else if (mid > lo) {
      const t = (mid - L) / (mid - lo);
      h = gray ? 250 : hueToward(h, 250, 16 * t);
      s = gray ? Math.max(s, 0.05 * t) : Math.min(1, s * (1 + 0.1 * t));
      l = l * (1 - 0.03 * t);
    }
    if (c === darkest && l < 0.16) {
      // 순수 검정 대신 짙은 남색 (외곽선·그늘이 살아 보이게)
      h = hueToward(gray ? 250 : h, 245, 40);
      s = Math.max(s, 0.3);
      l = Math.max(l, 0.08);
    }
    out.push(hslToRgb(h, s, l));
  }
  return out;
}

// ---------- GIF 굽기: 팔레트 그대로, 디더링 없이 ----------
function encodeGif(frames, gw, gh, palette, delays) {
  let bits = 1;
  while (1 << bits < palette.length) bits++;
  const tableSize = 1 << bits;
  const minCode = Math.max(2, bits);
  const bytes = [];
  const push = (...b) => {
    for (const x of b) bytes.push(x);
  };
  const word = (v) => push(v & 255, (v >> 8) & 255);
  for (const ch of "GIF89a") push(ch.charCodeAt(0));
  word(gw);
  word(gh);
  push(0x80 | ((bits - 1) << 4) | (bits - 1), 0, 0);
  for (let i = 0; i < tableSize; i++) {
    const c = palette[i] || [0, 0, 0];
    push(c[0], c[1], c[2]);
  }
  // 무한 반복
  push(0x21, 0xff, 0x0b);
  for (const ch of "NETSCAPE2.0") push(ch.charCodeAt(0));
  push(0x03, 0x01, 0x00, 0x00, 0x00);

  const table = new Int16Array(1 << 20);
  const stamp = new Uint32Array(1 << 20);
  let gen = 0;
  for (let f = 0; f < frames.length; f++) {
    const idx = frames[f];
    push(0x21, 0xf9, 0x04, 0x04);
    word(delays[f]);
    push(0, 0);
    push(0x2c);
    word(0);
    word(0);
    word(gw);
    word(gh);
    push(0);
    // LZW (omggif와 같은 방식)
    push(minCode);
    const data = [];
    const clear = 1 << minCode;
    const eoi = clear + 1;
    let next = eoi + 1;
    let codeSize = minCode + 1;
    let cur = 0;
    let shift = 0;
    const emit = (code) => {
      cur |= code << shift;
      shift += codeSize;
      while (shift >= 8) {
        data.push(cur & 255);
        cur >>>= 8;
        shift -= 8;
      }
    };
    gen++;
    emit(clear);
    let prefix = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i];
      const key = (prefix << 8) | k;
      if (stamp[key] === gen) {
        prefix = table[key];
        continue;
      }
      emit(prefix);
      if (next === 4096) {
        emit(clear);
        next = eoi + 1;
        codeSize = minCode + 1;
        gen++;
      } else {
        if (next >= 1 << codeSize) codeSize++;
        table[key] = next++;
        stamp[key] = gen;
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if (shift > 0) data.push(cur & 255);
    for (let i = 0; i < data.length; i += 255) {
      const n = Math.min(255, data.length - i);
      bytes.push(n);
      for (let j = 0; j < n; j++) bytes.push(data[i + j]);
    }
    push(0);
  }
  push(0x3b);
  return new Uint8Array(bytes);
}

// i번째 장면이 끝나는 시각을 반올림해서 장면 시간을 정한다 → 12장이면 8·8·9…(합이 정확히 1초에 12장)
// 바로 앞과 칸 하나 다르지 않은 장면은 합쳐서 그만큼 오래 보여 준다 (키 포즈 붙잡기)
function holdFrames(frames, fps) {
  const kept = [];
  const delays = [];
  let prevEnd = 0;
  for (let i = 0; i < frames.length; i++) {
    const end = Math.round(((i + 1) * 100) / fps);
    const d = end - prevEnd;
    prevEnd = end;
    const last = kept[kept.length - 1];
    let same = !!last;
    if (same) {
      for (let j = 0; j < last.length; j++) {
        if (last[j] !== frames[i][j]) {
          same = false;
          break;
        }
      }
    }
    if (same) delays[delays.length - 1] += d;
    else {
      kept.push(frames[i]);
      delays.push(d);
    }
  }
  return { kept, delays };
}

function upscaleIdx(idx, gw, gh, k) {
  const w = gw * k;
  const h = gh * k;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = ((y / k) | 0) * gw;
    for (let x = 0; x < w; x++) out[y * w + x] = idx[row + ((x / k) | 0)];
  }
  return out;
}

function ready(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn, { once: true });
}

ready(() => {
  const $ = (id) => document.getElementById(id);
  const input = $("pxInput");
  const upload = $("pxUploadSection");
  const uploadText = $("pxUploadText");
  const work = $("pxWork");
  const message = $("pxMessage");
  const video = $("pxVideo");
  const box = $("pxSourceBox");
  const crop = $("pxCrop");
  const live = $("pxLive");
  const liveWrap = $("pxLiveWrap");
  const liveCap = $("pxLiveCap");
  const swatches = $("pxPalette");
  const paletteReset = $("pxPaletteReset");
  const posField = $("pxPosField");
  const posLabel = $("pxPosLabel");
  const pos = $("pxPos");
  const posOut = $("pxPosOut");
  const start = $("pxStart");
  const startOut = $("pxStartOut");
  const len = $("pxLen");
  const lenOut = $("pxLenOut");
  const vivid = $("pxVivid");
  const estimate = $("pxEstimate");
  const makeBtn = $("pxMakeBtn");
  const result = $("pxResult");
  const gifImg = $("pxGif");
  const info = $("pxInfo");
  const dl = $("pxDownload");
  const dlBig = $("pxDownloadBig");
  if (!input || !upload || !video || !live || !makeBtn) return;

  const S = { size: 16, fit: "crop", pos: 0.5, start: 0, len: 3, fps: 12, colors: 16, vivid: true };
  try {
    const saved = Number(localStorage.getItem(SIZE_KEY));
    if (BIG[saved]) S.size = saved;
  } catch (e) {
    /* 저장소를 못 써도 기본값으로 동작 */
  }
  let meta = null; // { w, h, duration }
  let busy = false; // GIF 만드는 중
  let scanning = false; // 팔레트 고르는 중
  let videoUrl = null;
  let gifUrl = null;
  let bigUrl = null;
  let job = 0;

  // 지금 팔레트: centers(Oklab, 칸 고르기용) · colors(색조를 옮긴 실제 색) · lut(RGB 32단계 → 팔레트 번호)
  let pal = null;
  let palKey = "";
  let prevIdx = null; // 앞 장면 칸 색 (깜빡임 줄이기)
  // 사용자가 바꾼 색: { from: 원래 팔레트 색, to: 바꾼 색 }. 팔레트를 다시 골라도 가장 가까운 색에 이어 붙인다
  let edits = [];
  let lastMade = null; // 마지막으로 만든 GIF의 칸 번호들 — 색만 바꾸면 장면을 다시 뽑지 않고 바로 다시 굽는다

  // ---------- 그리기 ----------
  const bufA = document.createElement("canvas");
  const bufB = document.createElement("canvas");
  const mid = document.createElement("canvas");
  const midCtx = mid.getContext("2d", { willReadFrequently: true });
  const liveCtx = live.getContext("2d");

  // GIF 칸 수: 꽉 채우기는 정사각형, 전체 보이기는 여백 없이 영상 비율 그대로 (긴 쪽 = 고른 크기)
  function dims() {
    const s = S.size;
    if (!meta || S.fit === "crop" || meta.w === meta.h) return { gw: s, gh: s };
    return meta.w > meta.h
      ? { gw: s, gh: Math.max(1, Math.round((s * meta.h) / meta.w)) }
      : { gw: Math.max(1, Math.round((s * meta.w) / meta.h)), gh: s };
  }

  function sourceRect() {
    const { w, h } = meta;
    if (S.fit === "crop") {
      const side = Math.min(w, h);
      return { sx: (w - side) * S.pos, sy: (h - side) * S.pos, sw: side, sh: side };
    }
    return { sx: 0, sy: 0, sw: w, sh: h };
  }

  function sized(c, w, h) {
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    return c.getContext("2d");
  }

  // 원본 → (절반씩 줄이며) → 칸 수 × 8 → 픽셀 데이터
  function grabMid() {
    const r = sourceRect();
    const { gw, gh } = dims();
    const tw = gw * F;
    const th = gh * F;
    let cur = video;
    let x = r.sx;
    let y = r.sy;
    let w = r.sw;
    let h = r.sh;
    let out = bufA;
    while (w > tw * 2 && h > th * 2) {
      const nw = Math.max(tw, Math.round(w / 2));
      const nh = Math.max(th, Math.round(h / 2));
      const c = sized(out, nw, nh);
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
      c.drawImage(cur, x, y, w, h, 0, 0, nw, nh);
      cur = out;
      x = 0;
      y = 0;
      w = nw;
      h = nh;
      out = out === bufA ? bufB : bufA;
    }
    const c = sized(mid, tw, th);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(cur, x, y, w, h, 0, 0, tw, th);
    return midCtx.getImageData(0, 0, tw, th).data;
  }

  // 팔레트용 샘플: 칸 평균 + 군데군데 낱 픽셀(작은 강한 색도 놓치지 않게)
  function collectSamples(px, list) {
    const { gw, gh } = dims();
    const M = gw * F;
    const take = (r, g, b) => {
      const c = S.vivid ? boost(r, g, b) : [r, g, b];
      list.push(...toOklab(c[0], c[1], c[2]));
    };
    for (let by = 0; by < gh; by++) {
      for (let bx = 0; bx < gw; bx++) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (let y = by * F; y < by * F + F; y++) {
          let i = (y * M + bx * F) * 4;
          for (let x = 0; x < F; x++, i += 4) {
            r += px[i];
            g += px[i + 1];
            b += px[i + 2];
          }
        }
        const n = F * F;
        take(Math.round(r / n), Math.round(g / n), Math.round(b / n));
        const j = ((by * F + 3) * M + bx * F + 3) * 4;
        take(px[j], px[j + 1], px[j + 2]);
      }
    }
  }

  function buildPalette(list) {
    const centers = kmeans(Float32Array.from(list), S.colors);
    const k = centers.length / 3;
    const colors = artPalette(centers);
    // RGB 32단계마다 가장 가까운 팔레트 번호를 미리 계산
    const lut = new Uint8Array(32768);
    for (let i = 0; i < 32768; i++) {
      let r = ((i >> 10) & 31) * 8 + 4;
      let g = ((i >> 5) & 31) * 8 + 4;
      let b = (i & 31) * 8 + 4;
      if (S.vivid) [r, g, b] = boost(r, g, b);
      const [L, A, B] = toOklab(r, g, b);
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < k; c++) {
        const dl = L - centers[c * 3];
        const da = A - centers[c * 3 + 1];
        const db = B - centers[c * 3 + 2];
        const d = dl * dl + da * da + db * db;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      lut[i] = best;
    }
    // 색 사이 거리 (외톨이 칸 정리에서 가까운 색 고를 때)
    const dist = new Float32Array(k * k);
    for (let a = 0; a < k; a++)
      for (let b = 0; b < k; b++) {
        const dl = centers[a * 3] - centers[b * 3];
        const da = centers[a * 3 + 1] - centers[b * 3 + 1];
        const db = centers[a * 3 + 2] - centers[b * 3 + 2];
        dist[a * k + b] = dl * dl + da * da + db * db;
      }
    return { k, base: colors.map((c) => c.slice()), colors, lut, dist, edited: new Array(k).fill(false) };
  }

  const okDist = (c1, c2) => {
    const a = toOklab(c1[0], c1[1], c1[2]);
    const b = toOklab(c2[0], c2[1], c2[2]);
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  };

  // 바꾼 색을 지금 팔레트에 다시 입힌다 (원래 색과 거의 같은 칸에만, 한 칸에 하나)
  function applyEdits() {
    if (!pal) return;
    pal.colors = pal.base.map((c) => c.slice());
    pal.edited.fill(false);
    const taken = new Map();
    for (const e of edits) {
      let best = -1;
      let bd = 0.004; // Oklab 거리 0.063 안쪽만 같은 색으로 본다
      for (let i = 0; i < pal.k; i++) {
        const d = okDist(pal.base[i], e.from);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      if (best < 0 || (taken.has(best) && taken.get(best) <= bd)) continue;
      taken.set(best, bd);
      pal.colors[best] = e.to.slice();
      pal.edited[best] = true;
    }
  }

  const toHex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  const fromHex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

  function setColor(i, rgb) {
    const from = pal.base[i];
    edits = edits.filter((e) => okDist(e.from, from) >= 1e-6);
    if (okDist(rgb, from) > 1e-6) edits.push({ from: from.slice(), to: rgb });
    applyEdits();
    if (paletteReset) paletteReset.hidden = edits.length === 0;
    if (prevIdx) paint(prevIdx);
    swatches?.querySelectorAll(".px-swatch").forEach((el) => {
      const j = Number(el.dataset.i);
      el.style.setProperty("--c", toHex(pal.colors[j]));
      el.classList.toggle("edited", pal.edited[j]);
    });
    scheduleRecolor();
  }

  // 한 장면 → 칸 색 번호 (가장 많이 차지한 색, 깜빡임 줄이기, 외톨이 정리)
  function quantize(px, prev) {
    const { gw, gh } = dims();
    const M = gw * F;
    const { k, lut, dist } = pal;
    const out = new Uint8Array(gw * gh);
    if (prev && prev.length !== out.length) prev = null;
    const votes = new Uint16Array(k);
    for (let by = 0; by < gh; by++) {
      for (let bx = 0; bx < gw; bx++) {
        votes.fill(0);
        for (let y = by * F; y < by * F + F; y++) {
          let i = (y * M + bx * F) * 4;
          for (let x = 0; x < F; x++, i += 4) {
            votes[lut[((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3)]]++;
          }
        }
        let best = 0;
        for (let c = 1; c < k; c++) if (votes[c] > votes[best]) best = c;
        const cell = by * gw + bx;
        if (prev && prev[cell] !== best && votes[prev[cell]] >= votes[best] * KEEP_RATIO) best = prev[cell];
        out[cell] = best;
      }
    }
    // 외톨이 칸: 위아래좌우가 모두 다른 색이면 이웃에서 가장 많은 색(같으면 가까운 색)으로
    const fixed = out.slice();
    const nb = [0, 0, 0, 0];
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const c = out[y * gw + x];
        let n = 0;
        if (y > 0) nb[n++] = out[(y - 1) * gw + x];
        if (y < gh - 1) nb[n++] = out[(y + 1) * gw + x];
        if (x > 0) nb[n++] = out[y * gw + x - 1];
        if (x < gw - 1) nb[n++] = out[y * gw + x + 1];
        let alone = true;
        for (let i = 0; i < n; i++) if (nb[i] === c) alone = false;
        if (!alone) continue;
        let pick = nb[0];
        let pickCount = 0;
        for (let i = 0; i < n; i++) {
          let cnt = 0;
          for (let j = 0; j < n; j++) if (nb[j] === nb[i]) cnt++;
          if (cnt > pickCount || (cnt === pickCount && dist[c * k + nb[i]] < dist[c * k + pick])) {
            pick = nb[i];
            pickCount = cnt;
          }
        }
        fixed[y * gw + x] = pick;
      }
    }
    return fixed;
  }

  // 미리보기 칸이 정수 픽셀이 되게 (긴 쪽을 상자에 맞추고 칸 크기는 내림)
  function fitLive(gw, gh) {
    const box = (liveWrap && liveWrap.clientWidth) || 256;
    const cell = Math.max(1, Math.floor(box / Math.max(gw, gh)));
    live.style.width = `${gw * cell}px`;
    live.style.height = `${gh * cell}px`;
  }
  window.addEventListener("resize", () => {
    if (meta) fitLive(dims().gw, dims().gh);
  });

  function paint(idx) {
    const { gw, gh } = dims();
    if (idx.length !== gw * gh) return;
    const img = new ImageData(gw, gh);
    for (let i = 0; i < gw * gh; i++) {
      const c = pal.colors[idx[i]];
      img.data[i * 4] = c[0];
      img.data[i * 4 + 1] = c[1];
      img.data[i * 4 + 2] = c[2];
      img.data[i * 4 + 3] = 255;
    }
    sized(live, gw, gh);
    fitLive(gw, gh);
    liveCtx.putImageData(img, 0, 0);
  }

  // 팔레트: 어두운 색 → 밝은 색 (원래 색 기준으로 줄 세워, 바꿔도 자리가 그대로). 누르면 색 고르기
  function renderSwatches() {
    if (paletteReset) paletteReset.hidden = edits.length === 0;
    if (!swatches) return;
    swatches.innerHTML = "";
    if (!pal) return;
    const order = pal.base
      .map((c, i) => ({ i, l: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] }))
      .sort((a, b) => a.l - b.l);
    order.forEach(({ i }, n) => {
      const sw = document.createElement("label");
      sw.className = "px-swatch" + (pal.edited[i] ? " edited" : "");
      sw.dataset.i = String(i);
      sw.style.setProperty("--c", toHex(pal.colors[i]));
      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = toHex(pal.colors[i]);
      picker.setAttribute("aria-label", T.swatch(n + 1));
      picker.addEventListener("input", () => setColor(i, fromHex(picker.value)));
      sw.appendChild(picker);
      swatches.appendChild(sw);
    });
  }

  paletteReset?.addEventListener("click", () => {
    edits = [];
    applyEdits();
    renderSwatches();
    if (prevIdx) paint(prevIdx);
    scheduleRecolor();
  });

  // ---------- 팔레트 고르기: 구간에서 장면 12개를 보고 색을 묶는다 ----------
  const keyNow = () => [S.size, S.fit, S.pos.toFixed(3), S.start, S.len, S.colors, S.vivid].join("|");

  function seek(t) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        video.removeEventListener("seeked", finish);
        resolve();
      };
      const timer = setTimeout(finish, 3000);
      video.addEventListener("seeked", finish);
      video.currentTime = t;
    });
  }

  let scanTimer = null;
  let scanAgain = false;
  function scheduleScan(delay = 250) {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => scanPalette(), delay);
  }

  async function scanPalette() {
    if (!meta || busy) return;
    if (scanning) {
      scanAgain = true;
      return;
    }
    scanning = true;
    if (liveCap) liveCap.textContent = T.picking;
    const key = keyNow();
    const my = job;
    video.pause();
    const list = [];
    const eff = effLen();
    for (let i = 0; i < SCAN_FRAMES; i++) {
      await seek(Math.min(S.start + (eff * (i + 0.5)) / SCAN_FRAMES, meta.duration - 0.01));
      if (my !== job) break;
      collectSamples(grabMid(), list);
    }
    if (my === job) {
      pal = buildPalette(list);
      applyEdits();
      palKey = key;
      prevIdx = null;
      renderSwatches();
    }
    scanning = false;
    // 고르는 동안 설정이 바뀌었거나 새 영상이 들어왔으면 다시
    if (scanAgain || (my === job && keyNow() !== palKey)) {
      scanAgain = false;
      scanPalette();
      return;
    }
    if (my !== job) return;
    renderInfo();
    lastBucket = -1;
    video.currentTime = S.start;
    video.play().catch(() => {});
  }

  // ---------- 미리보기 ----------
  function renderLive() {
    if (!meta || !pal || busy || scanning || video.readyState < 2) return;
    prevIdx = quantize(grabMid(), prevIdx);
    paint(prevIdx);
  }

  const effLen = () => (meta ? Math.max(0.1, Math.min(S.len, meta.duration - S.start)) : 0);
  const frameCount = () => Math.max(2, Math.round(effLen() * S.fps));

  let lastBucket = -1;
  function tick() {
    requestAnimationFrame(tick);
    if (!meta || busy || scanning || video.seeking) return;
    const end = S.start + effLen();
    const t = video.currentTime;
    if (t >= end - 0.02 || t < S.start - 0.05) {
      lastBucket = -1;
      video.currentTime = S.start;
      return;
    }
    const bucket = Math.floor((t - S.start) * S.fps);
    if (bucket !== lastBucket) {
      if (bucket === 0) prevIdx = null; // GIF처럼 처음 장면부터 다시
      lastBucket = bucket;
      renderLive();
    }
  }
  requestAnimationFrame(tick);
  video.addEventListener("seeked", () => {
    if (!busy && !scanning) renderLive();
  });
  video.addEventListener("ended", () => {
    if (busy || scanning || !meta) return;
    video.currentTime = S.start;
    video.play().catch(() => {});
  });

  // ---------- 화면 갱신 ----------
  const fmt = (v) => v.toFixed(1);

  function setPressed(attr, value) {
    document.querySelectorAll(`[data-${attr}]`).forEach((b) => {
      const on = b.dataset[attr] === String(value);
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  function placeCrop() {
    if (!meta) return;
    const square = meta.w === meta.h;
    const landscape = meta.w > meta.h;
    if (posField) posField.hidden = S.fit !== "crop" || square;
    if (posLabel) posLabel.textContent = landscape ? T.posH : T.posV;
    if (posOut) posOut.textContent = Math.round(S.pos * 100) === 50 ? T.center : `${Math.round(S.pos * 100)}%`;
    if (box) {
      box.classList.toggle("portrait", !landscape);
      box.classList.toggle("movable", S.fit === "crop" && !square);
    }
    if (!crop) return;
    crop.hidden = S.fit !== "crop";
    const side = Math.min(meta.w, meta.h);
    const cw = side / meta.w;
    const ch = side / meta.h;
    crop.style.width = `${cw * 100}%`;
    crop.style.height = `${ch * 100}%`;
    crop.style.left = `${(1 - cw) * S.pos * 100}%`;
    crop.style.top = `${(1 - ch) * S.pos * 100}%`;
  }

  function renderInfo() {
    if (!meta) return;
    if (startOut) startOut.textContent = `${fmt(S.start)}${T.sec}`;
    if (lenOut) lenOut.textContent = `${fmt(effLen())}${T.sec}`;
    const { gw, gh } = dims();
    if (estimate) estimate.textContent = T.estimate(frameCount(), fmt(frameCount() / S.fps), gw, gh, S.colors);
    if (liveCap && !scanning) liveCap.textContent = T.live(gw, gh);
    setPressed("size", S.size);
    setPressed("fit", S.fit);
    setPressed("fps", S.fps);
    setPressed("colors", S.colors);
    placeCrop();
  }

  // 그림이 바뀌는 설정은 팔레트를 다시 고른다 (초당 장수는 팔레트와 무관)
  function changed(rescan) {
    renderInfo();
    if (rescan) scheduleScan();
  }

  // ---------- 설정 ----------
  document.querySelectorAll("[data-size]").forEach((b) =>
    b.addEventListener("click", () => {
      if (busy) return;
      S.size = Number(b.dataset.size);
      try {
        localStorage.setItem(SIZE_KEY, String(S.size));
      } catch (e) {
        /* 저장 못 해도 그만 */
      }
      prevIdx = null;
      changed(true);
    })
  );
  document.querySelectorAll("[data-fit]").forEach((b) =>
    b.addEventListener("click", () => {
      if (busy) return;
      S.fit = b.dataset.fit;
      prevIdx = null;
      changed(true);
    })
  );
  document.querySelectorAll("[data-fps]").forEach((b) =>
    b.addEventListener("click", () => {
      if (busy) return;
      S.fps = Number(b.dataset.fps);
      changed(false);
    })
  );
  document.querySelectorAll("[data-colors]").forEach((b) =>
    b.addEventListener("click", () => {
      if (busy) return;
      S.colors = Number(b.dataset.colors);
      changed(true);
    })
  );
  pos?.addEventListener("input", () => {
    S.pos = Number(pos.value) / 100;
    changed(true);
  });
  start?.addEventListener("input", () => {
    S.start = Number(start.value);
    renderInfo();
    if (!scanning) video.currentTime = S.start;
    scheduleScan(400);
  });
  len?.addEventListener("input", () => {
    S.len = Number(len.value);
    changed(true);
  });
  vivid?.addEventListener("change", () => {
    S.vivid = vivid.checked;
    changed(true);
  });

  // 원본 위를 끌면 자르는 칸이 따라옴
  function posFromPointer(e) {
    const r = box.getBoundingClientRect();
    const side = Math.min(meta.w, meta.h);
    if (meta.w > meta.h) {
      const cw = (r.width * side) / meta.w;
      S.pos = clamp((e.clientX - r.left - cw / 2) / (r.width - cw), 0, 1);
    } else {
      const ch = (r.height * side) / meta.h;
      S.pos = clamp((e.clientY - r.top - ch / 2) / (r.height - ch), 0, 1);
    }
    if (pos) pos.value = String(Math.round(S.pos * 100));
    renderInfo();
    if (pal && !scanning) {
      // 끄는 동안엔 지금 팔레트로 바로 그려 보이고, 놓으면 팔레트를 다시 고른다
      prevIdx = null;
      renderLive();
    }
  }
  box?.addEventListener("pointerdown", (e) => {
    if (!meta || S.fit !== "crop" || meta.w === meta.h || busy) return;
    e.preventDefault();
    try {
      box.setPointerCapture(e.pointerId);
    } catch (err) {
      /* 캡처가 안 돼도 끌기는 동작 */
    }
    box.classList.add("dragging");
    posFromPointer(e);
    const move = (ev) => posFromPointer(ev);
    const up = () => {
      box.classList.remove("dragging");
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerup", up);
      box.removeEventListener("pointercancel", up);
      scheduleScan(0);
    };
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerup", up);
    box.addEventListener("pointercancel", up);
  });

  // ---------- 영상 열기 ----------
  upload.addEventListener("click", () => {
    if (!busy) input.click();
  });
  upload.addEventListener("dragover", (e) => {
    e.preventDefault();
    upload.classList.add("dragover");
  });
  upload.addEventListener("dragleave", (e) => {
    e.preventDefault();
    upload.classList.remove("dragover");
  });
  upload.addEventListener("drop", (e) => {
    e.preventDefault();
    upload.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("video/")) openVideo(file);
  });
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) openVideo(file);
    input.value = "";
  });
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());

  function showMessage(text) {
    if (!message) return;
    message.textContent = text || "";
    message.hidden = !text;
  }

  // 길이 정보가 없는 영상(일부 WebM)은 끝으로 이동시켜 길이를 알아낸다
  function probeDuration() {
    return new Promise((resolve) => {
      let done = false;
      const finish = (d) => {
        if (done) return;
        done = true;
        video.removeEventListener("durationchange", onChange);
        video.currentTime = 0;
        resolve(d);
      };
      const onChange = () => {
        if (isFinite(video.duration) && video.duration > 0) finish(video.duration);
      };
      video.addEventListener("durationchange", onChange);
      video.currentTime = 1e101;
      setTimeout(() => finish(isFinite(video.duration) ? video.duration : 0), 4000);
    });
  }

  async function openVideo(file) {
    if (busy) return;
    job += 1;
    meta = null;
    pal = null;
    prevIdx = null;
    edits = [];
    lastMade = null;
    showMessage("");
    if (uploadText) uploadText.textContent = T.opening;
    upload.classList.add("loading");
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    const opened = await new Promise((resolve) => {
      video.addEventListener("loadeddata", () => resolve(true), { once: true });
      video.addEventListener("error", () => resolve(false), { once: true });
    });
    upload.classList.remove("loading");
    if (uploadText) uploadText.textContent = T.another;
    if (!opened || !video.videoWidth || !video.videoHeight) {
      if (work) work.hidden = true;
      showMessage(T.unsupported);
      return;
    }
    let duration = video.duration;
    if (!isFinite(duration) || duration <= 0) duration = await probeDuration();
    if (!duration) {
      if (work) work.hidden = true;
      showMessage(T.noDuration);
      return;
    }
    meta = { w: video.videoWidth, h: video.videoHeight, duration };
    S.pos = 0.5;
    S.start = 0;
    if (pos) pos.value = "50";
    if (start) {
      start.max = String(Math.max(0, Math.floor((duration - 0.1) * 10) / 10));
      start.value = "0";
    }
    if (len) len.value = String(S.len);
    if (work) work.hidden = false;
    if (result) result.hidden = true;
    renderInfo();
    renderSwatches();
    setTimeout(() => work?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    await scanPalette();
  }

  // ---------- GIF 만들기 ----------
  const sizeText = (bytes) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;

  function setButton(text, disabled) {
    makeBtn.textContent = text;
    makeBtn.disabled = disabled;
  }

  // 칸 번호 → GIF 두 개(원래 크기·크게). 색은 굽는 순간의 팔레트(바꾼 색 포함)
  async function bake(made, my, first) {
    const { frames, delays, size, gw, gh } = made;
    const palette = pal.colors.map((c) => c.slice());
    const total = delays.reduce((a, b) => a + b, 0);
    const k = BIG[size];
    if (first) await rabbitDuck(); // 굽는 동안 화면이 잠깐 멈추므로 토끼는 굴에 숨었다가 다시 나옴
    let buf;
    try {
      buf = encodeGif(frames, gw, gh, palette, delays);
    } finally {
      if (first) rabbitResume();
    }
    if (my !== job) return;
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    gifUrl = URL.createObjectURL(new Blob([buf], { type: "image/gif" }));
    gifImg.src = gifUrl;
    gifImg.alt = T.alt(gw, gh);
    // 결과 그림도 칸이 정수 픽셀이 되게 (긴 쪽 256px 안)
    const cellR = Math.max(1, Math.floor(256 / Math.max(gw, gh)));
    gifImg.style.width = `${gw * cellR}px`;
    gifImg.style.height = `${gh * cellR}px`;
    info.textContent = T.info(gw, gh, frames.length, fmt(total / 100), sizeText(buf.length));
    dl.href = gifUrl;
    dl.download = `pixel-${gw}x${gh}.gif`;
    dl.textContent = T.dl(gw, gh);
    if (bigUrl) URL.revokeObjectURL(bigUrl);
    bigUrl = null;
    dlBig.removeAttribute("href");
    dlBig.setAttribute("aria-disabled", "true");
    dlBig.textContent = T.preparing;
    if (first) {
      result.hidden = false;
      setTimeout(() => result.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    }

    // 메신저·SNS용: 칸을 그대로 키운 큰 GIF
    await new Promise((r) => setTimeout(r, 30));
    if (first) await rabbitDuck();
    let big;
    try {
      big = encodeGif(
        frames.map((f) => upscaleIdx(f, gw, gh, k)),
        gw * k,
        gh * k,
        palette,
        delays
      );
    } finally {
      if (first) rabbitResume();
    }
    if (my !== job) return;
    bigUrl = URL.createObjectURL(new Blob([big], { type: "image/gif" }));
    dlBig.href = bigUrl;
    dlBig.download = `pixel-${gw}x${gh}-large.gif`;
    dlBig.removeAttribute("aria-disabled");
    dlBig.textContent = T.dlBig(gw * k, gh * k);
  }

  // 만든 GIF가 지금 팔레트로 만든 것이면, 색을 바꿀 때 장면을 다시 뽑지 않고 바로 다시 굽는다
  let recolorTimer = null;
  let recoloring = false;
  let recolorAgain = false;
  function scheduleRecolor() {
    if (!lastMade || lastMade.key !== palKey) return;
    clearTimeout(recolorTimer);
    recolorTimer = setTimeout(async () => {
      if (busy || !lastMade || lastMade.key !== palKey) return;
      if (recoloring) {
        recolorAgain = true;
        return;
      }
      recoloring = true;
      try {
        await bake(lastMade, job, false);
      } finally {
        recoloring = false;
      }
      if (recolorAgain) {
        recolorAgain = false;
        scheduleRecolor();
      }
    }, 350);
  }

  async function make() {
    if (!meta || busy) return;
    clearTimeout(scanTimer);
    while (scanning) await new Promise((r) => setTimeout(r, 50));
    // 미리보기와 같은 팔레트로 굽는다 (설정이 바뀌었으면 먼저 다시 고름)
    if (!pal || palKey !== keyNow()) await scanPalette();
    if (!pal) return;
    busy = true;
    const my = job;
    const size = S.size;
    const fps = S.fps;
    const n = frameCount();
    const step = effLen() / n;
    video.pause();
    rabbitStart();
    const frames = [];
    try {
      let prev = null;
      for (let i = 0; i < n; i++) {
        setButton(T.extracting(i + 1, n), true);
        await seek(Math.min(S.start + i * step, meta.duration - 0.01));
        if (my !== job) return;
        prev = quantize(grabMid(), prev);
        frames.push(prev);
      }
      const held = holdFrames(frames, fps);
      lastMade = { frames: held.kept, delays: held.delays, size, ...dims(), key: palKey };
      setButton(T.encoding, true);
      await bake(lastMade, my, true);
    } catch (err) {
      console.error(err);
      showMessage(T.failed);
    } finally {
      rabbitStop();
      busy = false;
      setButton(T.make, false);
      if (meta) {
        lastBucket = -1;
        prevIdx = null;
        video.currentTime = S.start;
        video.play().catch(() => {});
      }
    }
  }
  makeBtn.addEventListener("click", make);
  dlBig?.addEventListener("click", (e) => {
    if (!dlBig.getAttribute("href")) e.preventDefault();
  });

  setButton(T.make, false);
});
