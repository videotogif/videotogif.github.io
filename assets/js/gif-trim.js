// GIF 자르기
// - GIF를 올리면 프레임을 꺼내 타임라인에 깔고, 위 미리보기에서 원본 속도로 반복 재생
// - 구간 남기기: 손잡이로 구간을 고르면 그 위에 체크 단추가 뜨고, 누르면 그 구간만 남음
// - 중간 자르기: 손잡이로 지울 구간을 고르면 그 위에 휴지통 단추가 뜨고, 누르면 그 구간이 지워지고 앞뒤가 이어짐
// - 미리보기는 늘 "지금 단추를 누르면 나올 결과"를 재생. 누를 때마다 새 GIF를 바로 만들고 다운로드를 켬
// - 되돌리기로 한 단계씩 취소. 미리보기 아래 막대로 재생·멈춤·원하는 장면으로 옮기기
import encode from "/assets/wasm/gifski-wasm/dist/encode.js";
import { rabbitStart, rabbitStop, rabbitDuck, rabbitResume } from "./rabbit.js";

// 페이지 언어(<html lang>)에 맞춰 문구 선택
const IS_EN = (document.documentElement.lang || "").toLowerCase().startsWith("en");
const T = IS_EN
  ? {
      analyzing: "Reading GIF frames...",
      unsupported:
        "This browser can't extract GIF frames (ImageDecoder is not supported). Please use the latest Chrome or Edge.",
      sec: "s",
      play: "Play",
      pause: "Pause",
      keep: "Keep only this range",
      cut: "Cut this range",
    }
  : {
      analyzing: "GIF 파일을 분석 중...",
      unsupported:
        "이 브라우저는 GIF 프레임 추출( ImageDecoder )을 지원하지 않습니다. 최신 Chrome/Edge를 사용해주세요.",
      sec: "초",
      play: "재생",
      pause: "일시정지",
      keep: "이 구간만 남기기",
      cut: "이 구간 자르기",
    };

function ready(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn, { once: true });
}

ready(() => {
  let frames = []; // 지금 GIF의 프레임(PNG Blob)
  let frameDurations = []; // 각 프레임 재생 시간(ms). 원본 속도 그대로
  let originalMs = 0; // 처음 올린 GIF 전체 길이
  const history = []; // 되돌리기용: [{frames, frameDurations}]

  let trimStartIndex = 0;
  let trimEndIndex = 0;
  let trimMode = "keep"; // "keep" | "cut"
  let isDraggingTrimHandle = false;
  let activeTrimHandle = null;
  let encoding = false;
  let thumbUrls = [];

  // DOM refs
  const gifInput = document.getElementById("gifInput");
  const gifUploadSection = document.getElementById("gifUploadSection");
  const trimOutputSection = document.getElementById("trimOutputSection");
  const trimOutput = document.getElementById("trimOutput");
  const trimCanvas = document.getElementById("trimCanvas");
  const trimDownloadLink = document.getElementById("trimDownloadLink");
  const trimTrack = document.getElementById("trimTrack");
  const trimHandleStart = document.getElementById("trimHandleStart");
  const trimHandleEnd = document.getElementById("trimHandleEnd");
  const trimSelected = document.getElementById("trimSelected");
  const trimTimelineFrames = document.getElementById("trimTimelineFrames");
  const originalDuration = document.getElementById("originalDuration");
  const trimmedDuration = document.getElementById("trimmedDuration");
  const trimSliderContainer = document.getElementById("trimSliderContainer");
  const trimModeButtons = document.querySelectorAll(".trim-mode-btn[data-mode]");
  const trimApply = document.getElementById("trimApply");
  const trimUndo = document.getElementById("trimUndo");
  const trimPlayer = document.getElementById("trimPlayer");
  const trimPlayBtn = document.getElementById("trimPlayBtn");
  const trimSeek = document.getElementById("trimSeek");
  const trimTime = document.getElementById("trimTime");

  // 필수 요소 없으면 중단
  if (!gifInput || !gifUploadSection || !trimCanvas) return;

  // 구간 남기기에서 잘려 나갈 앞·뒤를 빨간 빗금으로 덮는 두 장
  const dropL = document.createElement("div");
  const dropR = document.createElement("div");
  dropL.className = dropR.className = "trim-drop";
  trimTrack?.append(dropL, dropR);

  // ---- 파일 올리기
  gifUploadSection.addEventListener("dragover", (e) => {
    e.preventDefault();
    gifUploadSection.classList.add("dragover");
  });
  gifUploadSection.addEventListener("dragleave", (e) => {
    e.preventDefault();
    gifUploadSection.classList.remove("dragover");
  });
  gifUploadSection.addEventListener("drop", (e) => {
    e.preventDefault();
    gifUploadSection.classList.remove("dragover");
    const files = e.dataTransfer?.files || [];
    if (files.length > 0 && files[0].type === "image/gif") handleGifFile(files[0]);
  });
  gifUploadSection.addEventListener("click", () => gifInput?.click());
  gifInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === "image/gif") handleGifFile(file);
  });

  function setProgressMessage(text) {
    if (trimOutput) {
      trimOutput.innerHTML = `
        <div class="progress-message">
          <div class="spinner"></div>
          <div class="message">${text}</div>
        </div>
      `;
    }
  }

  async function handleGifFile(file) {
    pause();
    setProgressMessage(T.analyzing);
    rabbitStart();
    try {
      await extractFramesFromGif(file);
    } finally {
      rabbitStop();
    }
    if (!frames.length) return;
    if (trimOutputSection) trimOutputSection.style.display = "block";
    initTrimFeature();
    setTimeout(() => trimOutputSection?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }

  async function extractFramesFromGif(file) {
    frames = [];
    frameDurations = [];
    if (!("ImageDecoder" in window)) {
      alert(T.unsupported);
      return;
    }
    const decoder = new ImageDecoder({ data: new Uint8Array(await file.arrayBuffer()), type: "image/gif" });
    await decoder.tracks.ready;
    const frameCount = decoder.tracks.selectedTrack.frameCount;
    const ctx = trimCanvas.getContext("2d");
    for (let i = 0; i < frameCount; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      if (i === 0) {
        trimCanvas.width = image.displayWidth;
        trimCanvas.height = image.displayHeight;
      }
      ctx.clearRect(0, 0, trimCanvas.width, trimCanvas.height);
      ctx.drawImage(image, 0, 0, trimCanvas.width, trimCanvas.height);
      frames.push(await new Promise((res) => trimCanvas.toBlob(res, "image/png")));
      // 원본 프레임 재생 시간(마이크로초). 없거나 20ms 미만이면 브라우저들이 실제로 쓰는 100ms
      let durationMs = image.duration ? image.duration / 1000 : 100;
      if (durationMs < 20) durationMs = 100;
      frameDurations.push(Math.round(durationMs));
      if (typeof image.close === "function") image.close();
    }
  }

  // ---- 상태 계산
  const totalMs = (list) => list.reduce((t, i) => t + frameDurations[i], 0);
  // 손잡이가 양 끝에 있으면 아직 고른 구간이 없음
  const hasSelection = () => frames.length > 1 && !(trimStartIndex === 0 && trimEndIndex === frames.length - 1);
  // 지금 단추를 누르면 남는 프레임(미리보기도 이걸 재생)
  function keptFrameIndices() {
    const out = [];
    for (let i = 0; i < frames.length; i++) {
      const inside = i >= trimStartIndex && i <= trimEndIndex;
      if (!hasSelection() || (trimMode === "keep" ? inside : !inside)) out.push(i);
    }
    return out;
  }

  function initTrimFeature() {
    history.length = 0;
    originalMs = frameDurations.reduce((a, b) => a + b, 0);
    if (originalDuration) originalDuration.textContent = `${(originalMs / 1000).toFixed(1)}${T.sec}`;
    if (trimSliderContainer) trimSliderContainer.style.display = "block";
    if (trimDownloadLink) trimDownloadLink.style.display = "none";
    if (trimPlayer) trimPlayer.hidden = false;
    trimOutput.innerHTML = "";
    playing = true;
    buildTimeline();
    setTrimMode("keep");
  }

  function buildTimeline() {
    thumbUrls.forEach((u) => URL.revokeObjectURL(u));
    thumbUrls = frames.map((blob) => URL.createObjectURL(blob));
    if (trimTimelineFrames) {
      trimTimelineFrames.innerHTML = "";
      thumbUrls.forEach((url, index) => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        img.className = "timeline-frame-thumb";
        img.dataset.frameIndex = index;
        trimTimelineFrames.appendChild(img);
      });
    }
    trimStartIndex = 0;
    trimEndIndex = frames.length - 1;
  }

  function setTrimMode(mode) {
    trimMode = mode === "cut" ? "cut" : "keep";
    trimModeButtons.forEach((btn) => {
      const on = btn.dataset.mode === trimMode;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    trimSliderContainer?.classList.toggle("mode-cut", trimMode === "cut");
    // 구간 남기기는 손잡이를 양 끝에서 시작, 중간 자르기는 가운데 1/3쯤을 골라 둠
    const n = frames.length;
    trimStartIndex = 0;
    trimEndIndex = n - 1;
    if (trimMode === "cut" && n >= 4) {
      trimStartIndex = Math.floor(n / 3);
      trimEndIndex = Math.max(trimStartIndex + 1, Math.floor((n * 2) / 3) - 1);
    }
    updateTrimUI();
    resetPlayer();
  }
  trimModeButtons.forEach((btn) => btn.addEventListener("click", () => !encoding && setTrimMode(btn.dataset.mode)));

  function updateTrimUI() {
    const n = frames.length;
    if (!n || !trimHandleStart || !trimHandleEnd || !trimSelected) return;
    const sp = (trimStartIndex / n) * 100;
    const ep = (trimEndIndex / n) * 100;
    trimHandleStart.style.left = `${(trimStartIndex / n) * 100}%`;
    trimHandleEnd.style.left = `${(trimEndIndex / n) * 100}%`;
    const sel = hasSelection();
    // 중간 자르기: 고른 구간(지울 곳)이 빨간 빗금 / 구간 남기기: 고른 구간은 그대로 두고 앞·뒤(지울 곳)가 빨간 빗금
    trimSelected.style.display = sel && trimMode === "cut" ? "block" : "none";
    trimSelected.style.left = `${sp}%`;
    trimSelected.style.width = `${ep - sp}%`;
    const keepSel = sel && trimMode === "keep";
    dropL.style.display = keepSel && sp > 0 ? "block" : "none";
    dropL.style.left = "0%";
    dropL.style.width = `${sp}%`;
    dropR.style.display = keepSel && trimEndIndex < n - 1 ? "block" : "none";
    dropR.style.left = `${ep}%`;
    dropR.style.width = `${100 - ep}%`;
    // 체크/휴지통: 고른 구간 가운데 위. 남는 게 2장 미만이 되면 감춤
    if (trimApply) {
      const left = keptFrameIndices().length;
      trimApply.hidden = !sel || left < 2;
      trimApply.style.left = `${(sp + ep) / 2}%`;
      trimApply.setAttribute("aria-label", trimMode === "cut" ? T.cut : T.keep);
      trimApply.disabled = encoding;
    }
    if (trimmedDuration) trimmedDuration.textContent = `${(totalMs(keptFrameIndices()) / 1000).toFixed(1)}${T.sec}`;
    if (trimUndo) trimUndo.hidden = history.length === 0;
  }

  // ---- 체크(남기기)·휴지통(자르기)을 누르면 바로 적용하고 새 GIF를 만듦
  async function applyEdit() {
    if (encoding || !hasSelection()) return;
    const kept = keptFrameIndices();
    if (kept.length < 2) return;
    history.push({ frames: frames.slice(), frameDurations: frameDurations.slice() });
    frames = kept.map((i) => frames[i]);
    frameDurations = kept.map((i) => frameDurations[i]);
    buildTimeline(); // 손잡이는 양 끝으로: 미리보기는 적용된 결과 전체를 재생
    updateTrimUI();
    resetPlayer();
    await makeGif();
  }
  trimApply?.addEventListener("click", applyEdit);

  async function undo() {
    if (encoding || !history.length) return;
    const prev = history.pop();
    frames = prev.frames;
    frameDurations = prev.frameDurations;
    buildTimeline();
    updateTrimUI();
    resetPlayer();
    if (history.length) await makeGif();
    else if (trimDownloadLink) trimDownloadLink.style.display = "none"; // 원본으로 돌아오면 받을 게 없음
  }
  trimUndo?.addEventListener("click", undo);

  async function makeGif() {
    encoding = true;
    updateTrimUI();
    if (trimDownloadLink) trimDownloadLink.style.display = "none";
    rabbitStart();
    try {
      const ctx = trimCanvas.getContext("2d");
      const imageDatas = [];
      for (const blob of frames) {
        const img = await blobToImage(blob);
        ctx.clearRect(0, 0, trimCanvas.width, trimCanvas.height);
        ctx.drawImage(img, 0, 0, trimCanvas.width, trimCanvas.height);
        imageDatas.push(ctx.getImageData(0, 0, trimCanvas.width, trimCanvas.height));
      }
      // 굽는 동안 화면이 잠깐 멈추므로 토끼는 굴에 숨었다가, 다 구우면 다시 나옴
      await rabbitDuck();
      const gifBuffer = await encode({
        frames: imageDatas,
        width: trimCanvas.width,
        height: trimCanvas.height,
        quality: 90,
        frameDurations: frameDurations.slice(), // 원본 GIF의 프레임별 재생 시간 그대로
      });
      rabbitResume();
      if (trimDownloadLink) {
        if (trimDownloadLink.href.startsWith("blob:")) URL.revokeObjectURL(trimDownloadLink.href);
        trimDownloadLink.href = URL.createObjectURL(new Blob([gifBuffer], { type: "image/gif" }));
        trimDownloadLink.style.display = "inline-block";
      }
    } finally {
      rabbitStop();
      encoding = false;
      updateTrimUI();
    }
  }

  function blobToImage(blob) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.src = url;
    });
  }

  // ---- 미리보기 재생: 남는 프레임만 원본 속도로
  let playing = false;
  let wasPlaying = false;
  let playPos = 0;
  let keptList = [];
  let playTimer = null;

  function showFrame(frameIndex) {
    if (!trimOutput || frameIndex < 0 || frameIndex >= frames.length) return;
    let img = trimOutput.querySelector("#trimOutputGif");
    if (!img) {
      img = document.createElement("img");
      img.id = "trimOutputGif";
      trimOutput.innerHTML = "";
      trimOutput.appendChild(img);
    }
    img.src = thumbUrls[frameIndex];
    img.alt = `Frame ${frameIndex}`;
  }
  function renderPlayer() {
    if (!trimSeek || !trimTime) return;
    const n = keptList.length;
    trimSeek.max = String(Math.max(0, n - 1));
    trimSeek.value = String(playPos);
    trimSeek.disabled = n < 2;
    trimSeek.style.setProperty("--p", `${n > 1 ? (playPos / (n - 1)) * 100 : 0}%`);
    let done = 0;
    for (let k = 0; k < playPos; k++) done += frameDurations[keptList[k]];
    trimTime.textContent = `${(done / 1000).toFixed(1)} / ${(totalMs(keptList) / 1000).toFixed(1)}${T.sec}`;
    if (trimPlayBtn) {
      trimPlayBtn.classList.toggle("is-playing", playing);
      trimPlayBtn.setAttribute("aria-label", playing ? T.pause : T.play);
    }
  }
  function showPlayFrame() {
    if (keptList.length) showFrame(keptList[playPos]);
    renderPlayer();
  }
  function scheduleNext() {
    clearTimeout(playTimer);
    if (!playing || keptList.length < 2) return;
    playTimer = setTimeout(() => {
      playPos = (playPos + 1) % keptList.length;
      showPlayFrame();
      scheduleNext();
    }, frameDurations[keptList[playPos]] || 100);
  }
  function play() {
    playing = keptList.length > 1;
    renderPlayer();
    scheduleNext();
  }
  function pause() {
    playing = false;
    clearTimeout(playTimer);
    renderPlayer();
  }
  // 구간·방식이 바뀌면 처음부터 다시
  function resetPlayer() {
    keptList = keptFrameIndices();
    playPos = 0;
    showPlayFrame();
    if (playing) scheduleNext();
  }
  trimPlayBtn?.addEventListener("click", () => (playing ? pause() : play()));
  trimSeek?.addEventListener("input", () => {
    playPos = Math.max(0, Math.min(keptList.length - 1, Number(trimSeek.value) || 0));
    showPlayFrame();
    if (playing) scheduleNext();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearTimeout(playTimer);
    else if (playing) scheduleNext();
  });

  // ---- 손잡이 끌기: 잡으면 멈추고 그 지점 장면을 보여 주고, 놓으면 결과를 처음부터 다시 재생
  function grab(which) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDraggingTrimHandle) {
        wasPlaying = playing;
        pause();
      }
      isDraggingTrimHandle = true;
      activeTrimHandle = which;
    };
  }
  trimHandleStart?.addEventListener("pointerdown", grab("start"));
  trimHandleEnd?.addEventListener("pointerdown", grab("end"));

  const frameAt = (clientX) => {
    const rect = trimTrack.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.min(frames.length - 1, Math.floor(percent * frames.length));
  };

  // 타임라인을 누르면: 결과에 남는 프레임이면 그 장면으로, 아니면 멈추고 그 장면만 보여 줌
  trimTrack?.addEventListener("click", (e) => {
    if (isDraggingTrimHandle || !frames.length) return;
    const fi = frameAt(e.clientX);
    const k = keptList.indexOf(fi);
    if (k >= 0) {
      playPos = k;
      showPlayFrame();
      if (playing) scheduleNext();
    } else {
      pause();
      showFrame(fi);
    }
  });

  document.addEventListener("pointermove", (e) => {
    if (!isDraggingTrimHandle || !trimTrack) return;
    const fi = frameAt(e.clientX);
    if (activeTrimHandle === "start") {
      trimStartIndex = Math.min(fi, trimEndIndex - 1);
      showFrame(trimStartIndex);
    } else {
      trimEndIndex = Math.max(fi, trimStartIndex + 1);
      showFrame(trimEndIndex);
    }
    updateTrimUI();
  });
  document.addEventListener("pointerup", () => {
    if (!isDraggingTrimHandle) return;
    isDraggingTrimHandle = false;
    activeTrimHandle = null;
    updateTrimUI();
    playing = wasPlaying;
    resetPlayer();
  });

  // 페이지 전역 드래그 방지
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
});
