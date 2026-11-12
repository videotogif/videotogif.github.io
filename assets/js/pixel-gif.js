// 픽셀 GIF 만들기
// - 동영상을 정사각형으로 맞춰(가운데 자르기 또는 전체 보이기) 16·32·64칸 GIF로 만든다
// - 한 칸의 색 = 그 칸에 들어가는 원본 픽셀들의 평균(빛의 세기 기준). 그냥 줄일 때 생기는 지글거림을 막는다
// - 오른쪽 미리보기는 고른 구간을 고른 초당 장수로 반복 재생하며, 실제 GIF와 같은 방식으로 그린다
// - 일반 GIF 변환(main.js)과는 따로 동작한다
import encode from "/assets/wasm/gifski-wasm/dist/encode.js";
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
      live: (s) => `Preview ${s}×${s}`,
      estimate: (n, sec, s) => `${n} frames · ${sec}s · ${s}×${s}`,
      make: "👾 Make pixel GIF",
      extracting: (i, n) => `Capturing frames (${i}/${n})`,
      encoding: "Encoding GIF...",
      info: (s, n, sec, size) => `${s}×${s} · ${n} frames · ${sec}s · ${size}`,
      dl: (s) => `Save ${s}×${s} GIF`,
      dlBig: (b) => `Save large (${b}×${b})`,
      preparing: "Preparing large file...",
      failed: "Couldn't make the GIF. Try a shorter length and make it again.",
      alt: (s) => `Pixel GIF made at ${s}×${s}`,
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
      live: (s) => `미리보기 ${s}×${s}`,
      estimate: (n, sec, s) => `${n}장 · ${sec}초 · ${s}×${s}`,
      make: "👾 픽셀 GIF 만들기",
      extracting: (i, n) => `장면 뽑는 중 (${i}/${n})`,
      encoding: "GIF 굽는 중...",
      info: (s, n, sec, size) => `${s}×${s} · ${n}장 · ${sec}초 · ${size}`,
      dl: (s) => `${s}×${s} GIF 저장`,
      dlBig: (b) => `크게 저장 (${b}×${b})`,
      preparing: "큰 파일 준비 중...",
      failed: "GIF를 만들지 못했어요. 길이를 줄여서 다시 만들어 보세요.",
      alt: (s) => `${s}×${s}로 만든 픽셀 GIF`,
    };

const F = 8; // 한 칸 = 원본을 칸 수의 8배로 줄인 그림에서 8×8 픽셀의 평균
const BIG = { 16: 16, 32: 8, 64: 8 }; // 크게 저장할 때 배율 (256, 256, 512)
const SIZE_KEY = "vtg-px-size";

// sRGB ↔ 빛의 세기(선형). 평균은 빛의 세기로 내야 밝은 점이 어둡게 뭉개지지 않는다
const TO_LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  TO_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const TO_SRGB = new Uint8Array(4096);
for (let i = 0; i < 4096; i++) {
  const l = i / 4095;
  const c = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  TO_SRGB[i] = Math.round(c * 255);
}

function ready(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn, { once: true });
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

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

  const S = { size: 16, fit: "crop", pos: 0.5, start: 0, len: 3, fps: 10, vivid: true };
  try {
    const saved = Number(localStorage.getItem(SIZE_KEY));
    if (BIG[saved]) S.size = saved;
  } catch (e) {
    /* 저장소를 못 써도 기본값으로 동작 */
  }
  let meta = null; // { w, h, duration }
  let busy = false;
  let videoUrl = null;
  let gifUrl = null;
  let bigUrl = null;
  let job = 0; // 새 영상·새 GIF가 시작되면 이전 작업 결과는 버림

  // ---------- 그리기 ----------
  const bufA = document.createElement("canvas");
  const bufB = document.createElement("canvas");
  const mid = document.createElement("canvas");
  const midCtx = mid.getContext("2d", { willReadFrequently: true });
  const liveCtx = live.getContext("2d");

  // 원본에서 쓸 영역(sx..)과, 정사각형 안에 놓일 자리(dx.., 0~1 비율)
  function sourceRect() {
    const { w, h } = meta;
    if (S.fit === "crop") {
      const side = Math.min(w, h);
      return { sx: (w - side) * S.pos, sy: (h - side) * S.pos, sw: side, sh: side, dx: 0, dy: 0, dw: 1, dh: 1 };
    }
    const k = 1 / Math.max(w, h);
    const dw = w * k;
    const dh = h * k;
    return { sx: 0, sy: 0, sw: w, sh: h, dx: (1 - dw) / 2, dy: (1 - dh) / 2, dw, dh };
  }

  function sized(c, w, h) {
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    return c.getContext("2d");
  }

  // 원본 → (절반씩 줄이며) → 칸 수 × 8 크기의 정사각형
  function drawToMid(src, r, M) {
    const tw = Math.max(1, Math.round(r.dw * M));
    const th = Math.max(1, Math.round(r.dh * M));
    let cur = src;
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
    const c = sized(mid, M, M);
    c.fillStyle = "#000";
    c.fillRect(0, 0, M, M);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(cur, x, y, w, h, Math.round(r.dx * M), Math.round(r.dy * M), tw, th);
  }

  // 8×8 픽셀 평균으로 한 칸씩 → size×size ImageData
  function boxDown(size) {
    const M = size * F;
    const src = midCtx.getImageData(0, 0, M, M).data;
    const out = new ImageData(size, size);
    const d = out.data;
    const n = F * F;
    for (let by = 0; by < size; by++) {
      for (let bx = 0; bx < size; bx++) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (let y = by * F; y < by * F + F; y++) {
          let i = (y * M + bx * F) * 4;
          for (let x = 0; x < F; x++, i += 4) {
            r += TO_LIN[src[i]];
            g += TO_LIN[src[i + 1]];
            b += TO_LIN[src[i + 2]];
          }
        }
        const o = (by * size + bx) * 4;
        d[o] = TO_SRGB[Math.round((r / n) * 4095)];
        d[o + 1] = TO_SRGB[Math.round((g / n) * 4095)];
        d[o + 2] = TO_SRGB[Math.round((b / n) * 4095)];
        d[o + 3] = 255;
      }
    }
    if (S.vivid) boost(d);
    return out;
  }

  // 작은 화면에서 잘 보이게 채도와 대비를 조금 올림
  function boost(d) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      d[i] = (l + (r - l) * 1.35 - 128) * 1.12 + 128;
      d[i + 1] = (l + (g - l) * 1.35 - 128) * 1.12 + 128;
      d[i + 2] = (l + (b - l) * 1.35 - 128) * 1.12 + 128;
    }
  }

  function sample(src) {
    drawToMid(src, sourceRect(), S.size * F);
    return boxDown(S.size);
  }

  function upscale(img, k) {
    const s = img.width;
    const n = s * k;
    const out = new ImageData(n, n);
    const from = new Uint32Array(img.data.buffer);
    const to = new Uint32Array(out.data.buffer);
    for (let y = 0; y < n; y++) {
      const row = ((y / k) | 0) * s;
      for (let x = 0; x < n; x++) to[y * n + x] = from[row + ((x / k) | 0)];
    }
    return out;
  }

  // ---------- 미리보기 ----------
  function renderLive() {
    if (!meta || busy || video.readyState < 2) return;
    sized(live, S.size, S.size);
    liveCtx.putImageData(sample(video), 0, 0);
  }

  const effLen = () => (meta ? Math.max(0.1, Math.min(S.len, meta.duration - S.start)) : 0);
  const frameCount = () => Math.max(2, Math.round(effLen() * S.fps));

  let lastBucket = -1;
  function tick() {
    requestAnimationFrame(tick);
    if (!meta || busy || video.seeking) return;
    const end = S.start + effLen();
    const t = video.currentTime;
    if (t >= end - 0.02 || t < S.start - 0.05) {
      lastBucket = -1;
      video.currentTime = S.start;
      return;
    }
    const bucket = Math.floor((t - S.start) * S.fps);
    if (bucket !== lastBucket) {
      lastBucket = bucket;
      renderLive();
    }
  }
  requestAnimationFrame(tick);
  video.addEventListener("seeked", () => {
    if (!busy) renderLive();
  });
  video.addEventListener("ended", () => {
    if (busy || !meta) return;
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
    if (estimate) estimate.textContent = T.estimate(frameCount(), fmt(frameCount() / S.fps), S.size);
    if (liveCap) liveCap.textContent = T.live(S.size);
    if (liveWrap) {
      liveWrap.style.setProperty("--n", String(S.size));
      liveWrap.dataset.n = String(S.size);
    }
    setPressed("size", S.size);
    setPressed("fit", S.fit);
    setPressed("fps", S.fps);
    placeCrop();
  }

  function refresh() {
    renderInfo();
    lastBucket = -1;
    renderLive();
  }

  // ---------- 설정 ----------
  document.querySelectorAll("[data-size]").forEach((b) =>
    b.addEventListener("click", () => {
      S.size = Number(b.dataset.size);
      try {
        localStorage.setItem(SIZE_KEY, String(S.size));
      } catch (e) {
        /* 저장 못 해도 그만 */
      }
      refresh();
    })
  );
  document.querySelectorAll("[data-fit]").forEach((b) =>
    b.addEventListener("click", () => {
      S.fit = b.dataset.fit;
      refresh();
    })
  );
  document.querySelectorAll("[data-fps]").forEach((b) =>
    b.addEventListener("click", () => {
      S.fps = Number(b.dataset.fps);
      refresh();
    })
  );
  pos?.addEventListener("input", () => {
    S.pos = Number(pos.value) / 100;
    refresh();
  });
  start?.addEventListener("input", () => {
    S.start = Number(start.value);
    renderInfo();
    video.currentTime = S.start;
  });
  len?.addEventListener("input", () => {
    S.len = Number(len.value);
    renderInfo();
  });
  vivid?.addEventListener("change", () => {
    S.vivid = vivid.checked;
    refresh();
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
    refresh();
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
    refresh();
    video.currentTime = 0;
    video.play().catch(() => {});
    setTimeout(() => work?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }

  // ---------- GIF 만들기 ----------
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

  const sizeText = (bytes) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;

  function setButton(text, disabled) {
    makeBtn.textContent = text;
    makeBtn.disabled = disabled;
  }

  async function make() {
    if (!meta || busy) return;
    busy = true;
    const my = ++job;
    const size = S.size;
    const fps = S.fps;
    const n = frameCount();
    const step = effLen() / n;
    video.pause();
    rabbitStart();
    const frames = [];
    try {
      for (let i = 0; i < n; i++) {
        setButton(T.extracting(i + 1, n), true);
        await seek(Math.min(S.start + i * step, meta.duration - 0.01));
        if (my !== job) return;
        frames.push(sample(video));
      }
      setButton(T.encoding, true);
      // 굽는 동안 화면이 잠깐 멈추므로 토끼는 굴에 숨었다가, 다 구우면 다시 나옴
      await rabbitDuck();
      let buf;
      try {
        buf = await encode({ frames, width: size, height: size, quality: 100, fps });
      } finally {
        rabbitResume();
      }
      if (my !== job) return;
      if (gifUrl) URL.revokeObjectURL(gifUrl);
      gifUrl = URL.createObjectURL(new Blob([buf], { type: "image/gif" }));
      gifImg.src = gifUrl;
      gifImg.alt = T.alt(size);
      gifImg.dataset.size = String(size);
      info.textContent = T.info(size, n, fmt(n / fps), sizeText(buf.length));
      dl.href = gifUrl;
      dl.download = `pixel-${size}x${size}.gif`;
      dl.textContent = T.dl(size);
      const k = BIG[size];
      if (bigUrl) URL.revokeObjectURL(bigUrl);
      bigUrl = null;
      dlBig.removeAttribute("href");
      dlBig.setAttribute("aria-disabled", "true");
      dlBig.textContent = T.preparing;
      result.hidden = false;
      setTimeout(() => result.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);

      // 메신저·SNS용: 칸을 그대로 키운 큰 GIF
      await new Promise((r) => setTimeout(r, 30));
      await rabbitDuck();
      let big;
      try {
        big = await encode({ frames: frames.map((f) => upscale(f, k)), width: size * k, height: size * k, quality: 100, fps });
      } finally {
        rabbitResume();
      }
      if (my !== job) return;
      bigUrl = URL.createObjectURL(new Blob([big], { type: "image/gif" }));
      dlBig.href = bigUrl;
      dlBig.download = `pixel-${size}x${size}-large.gif`;
      dlBig.removeAttribute("aria-disabled");
      dlBig.textContent = T.dlBig(size * k);
    } catch (err) {
      console.error(err);
      showMessage(T.failed);
    } finally {
      rabbitStop();
      busy = false;
      setButton(T.make, false);
      if (meta) {
        lastBucket = -1;
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
