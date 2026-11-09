// Video to GIF Converter - Main JavaScript
import encode from "../wasm/gifski-wasm/dist/encode.js";

// -----------------------------
// i18n (번역 리소스)
// -----------------------------
// 페이지 언어(<html lang>)를 따른다: /en/ 페이지는 영어, 나머지는 한국어
let currentLanguage = (document.documentElement.lang || "")
  .toLowerCase()
  .startsWith("en")
  ? "en"
  : "ko";

const translations = {
  ko: {
    uploadText: "비디오 파일을 선택하세요",
    uploadSubtext: "클릭하거나 드래그 & 드롭으로 업로드하면 GIF가 생성됩니다.",
    outputTitle: "생성된 GIF",
    downloadText: "GIF 다운로드",
    advancedSettingsTitle: "화질 조절",
    extractingFrames: "프레임을 추출 중...",
    generatingGif: "GIF 생성 중...",
    regeneratingGif: "GIF 재생성 중...",
    processingVideo: "비디오 처리 중...",
    levelNames: ["저사양", "조금 가볍게", "균형", "조금 선명하게", "고사양"],
    source: (m) => `원본 ${m.duration.toFixed(1)}초 · ${m.width}×${m.height}`,
    summary: (s, name) =>
      `${name}: 가로 ${s.width}px · 초당 ${s.fps}장 · 품질 ${s.quality} · 총 ${s.frames}장`,
    realtime: "원본과 같은 속도로 재생돼요.",
    reduced: "기기에 무리가 가지 않도록 이 영상 길이에 맞춰 크기나 장수를 줄였어요.",
    spedUp: (x) =>
      `영상이 길어서 ${x}배속으로 만들어요. 원본 속도가 필요하면 필요한 부분만 잘라서 올려 주세요.`,
    noDuration: "영상 길이를 읽을 수 없어요. MP4로 바꿔서 다시 올려 주세요.",
  },
  en: {
    uploadText: "Select Video File",
    uploadSubtext:
      "Click or drag & drop to upload and automatically generate GIF.",
    outputTitle: "Generated GIF",
    downloadText: "Download GIF",
    advancedSettingsTitle: "Quality",
    extractingFrames: "Extracting frames...",
    generatingGif: "Generating GIF...",
    regeneratingGif: "Regenerating GIF...",
    processingVideo: "Processing video...",
    levelNames: ["Low-spec", "Lighter", "Balanced", "Sharper", "High-spec"],
    source: (m) => `Original ${m.duration.toFixed(1)}s · ${m.width}×${m.height}`,
    summary: (s, name) =>
      `${name}: ${s.width}px wide · ${s.fps} frames/sec · quality ${s.quality} · ${s.frames} frames`,
    realtime: "Plays at the same speed as the original.",
    reduced: "Size or frame count was lowered for this video's length so your device doesn't struggle.",
    spedUp: (x) =>
      `This video is long, so the GIF plays at ${x}x speed. For original speed, trim the video to the part you need first.`,
    noDuration: "Couldn't read this video's length. Please convert it to MP4 and try again.",
  },
};

// -----------------------------
// 공용 유틸
// -----------------------------
function ready(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn, { once: true });
}

function updateAllTexts() {
  const t = translations[currentLanguage] || translations.ko;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // 필요한 텍스트만 업데이트
  setText("uploadText", t.uploadText);
  setText("uploadSubtext", t.uploadSubtext);
  setText("outputTitle", t.outputTitle);
  setText("downloadText", t.downloadText);
  setText("advancedSettingsTitle", t.advancedSettingsTitle);
}

// -----------------------------
// 메인 로직 (DOM Ready)
// -----------------------------
ready(() => {
  updateAllTexts(); // 초기 렌더

  // 햄버거 메뉴 토글
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  const mainNav = document.querySelector('.main-nav');

  if (hamburgerMenu && mainNav) {
    hamburgerMenu.addEventListener('click', () => {
      const isActive = mainNav.classList.toggle('active');
      hamburgerMenu.classList.toggle('active');
      hamburgerMenu.setAttribute('aria-expanded', isActive);
    });

    // 메뉴 링크 클릭 시 메뉴 닫기
    const navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('active');
        hamburgerMenu.classList.remove('active');
        hamburgerMenu.setAttribute('aria-expanded', 'false');
      });
    });

    // 메뉴 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (!hamburgerMenu.contains(e.target) && !mainNav.contains(e.target)) {
        mainNav.classList.remove('active');
        hamburgerMenu.classList.remove('active');
        hamburgerMenu.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // -----------------------------
  // 자동 설정: 영상 길이·해상도와 기기 사양을 보고 단계(1 저사양 ~ 5 고사양)별 설정을 계산
  // - 항상 원본 속도로 재생되도록 프레임 간격 = 1 / FPS
  // - 단계마다 메모리 예산(압축 전 픽셀 크기)을 넘지 않게 FPS → 가로 크기 순으로 낮춤
  // - 그래도 넘으면(아주 긴 영상) 장수를 제한하고 그만큼 빨리 재생
  // -----------------------------
  // maxSide: 긴 쪽 최대 길이(세로 영상이 지나치게 커지지 않게), minFps: 긴 영상에서도 먼저 지키는 부드러움
  const LEVELS = [
    { fps: 5, minFps: 5, maxSide: 320, quality: 70, budgetMB: 40 },
    { fps: 10, minFps: 5, maxSide: 400, quality: 80, budgetMB: 80 },
    { fps: 10, minFps: 10, maxSide: 540, quality: 90, budgetMB: 160 },
    { fps: 20, minFps: 10, maxSide: 720, quality: 90, budgetMB: 260 },
    { fps: 25, minFps: 10, maxSide: 900, quality: 100, budgetMB: 400 },
  ];
  const FPS_STEPS = [25, 20, 10, 5]; // GIF 지연 단위(10ms)로 정확히 떨어지는 값만 사용
  const lowEndDevice = (() => {
    try {
      const mem = navigator.deviceMemory;
      const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      return (typeof mem === "number" && mem <= 4) || coarse;
    } catch (e) {
      return false;
    }
  })();
  const DEFAULT_LEVEL = lowEndDevice ? 2 : 3;

  function computeAutoSettings(level, meta) {
    const L = LEVELS[level - 1];
    const budget = L.budgetMB * (lowEndDevice ? 0.5 : 1) * 1024 * 1024;
    const aspect = meta.height / meta.width;
    const even = (n) => Math.max(2, Math.round(n / 2) * 2);
    const heightOf = (w) => even(w * aspect);
    const bytesFor = (w, f) => Math.ceil(meta.duration * f) * w * heightOf(w) * 4;

    // 긴 쪽이 maxSide를 넘지 않게, 원본보다 키우지 않게
    const maxWidth = Math.min(meta.width, L.maxSide, L.maxSide / aspect);
    let width = even(maxWidth);
    let fps = L.fps;
    let reduced = false;
    const minWidth = even(Math.min(240, meta.width, 240 / aspect));
    const lowerFpsTo = (floor) => {
      let i = FPS_STEPS.indexOf(fps);
      while (bytesFor(width, fps) > budget && i < FPS_STEPS.length - 1 && FPS_STEPS[i + 1] >= floor) {
        i += 1;
        fps = FPS_STEPS[i];
        reduced = true;
      }
    };
    const shrinkTo = (floorWidth) => {
      const target = Math.max(minWidth, even(floorWidth));
      while (bytesFor(width, fps) > budget && width > target) {
        width = Math.max(target, even(width * 0.9));
        reduced = true;
      }
    };

    // 1) 이 단계가 지키는 부드러움(minFps)까지 FPS를 낮춤
    lowerFpsTo(L.minFps);
    // 2) 가로 크기를 원래의 60%까지 줄임
    shrinkTo(maxWidth * 0.6);
    // 3) FPS를 최저(5)까지 낮춤
    lowerFpsTo(5);
    // 4) 가로 크기를 최소(긴 쪽 240px 수준)까지 줄임
    shrinkTo(minWidth);
    // 5) 그래도 넘으면 장수를 제한 (빨리 재생)
    let interval = 1 / fps;
    const frameBytes = width * heightOf(width) * 4;
    const maxFrames = Math.max(2, Math.floor(budget / frameBytes));
    if (Math.ceil(meta.duration * fps) > maxFrames) {
      interval = meta.duration / maxFrames;
    }
    // gifski는 최소 2장이 필요
    if (meta.duration / interval < 2) interval = meta.duration / 2;

    const frames = Math.max(2, Math.ceil(meta.duration / interval - 1e-9));
    const speed = Math.round(interval * fps * 10) / 10;
    return { level, fps, interval, width, height: heightOf(width), quality: L.quality, frames, speed, reduced };
  }

  let frames = [];
  let outputWidth = 420;
  let outputHeight = 0;
  let currentVideoFile = null;
  let videoMeta = null; // { duration, width, height }
  let currentSettings = null;
  let lastExtract = null; // { interval, width } — 같으면 프레임을 다시 뽑지 않음
  let converting = false;
  let pendingLevel = null;
  let textPositionX = 0.5; // 0-1 normalized
  let textPositionY = 0.9; // 0-1 normalized

  // DOM refs
  const videoInput = document.getElementById("videoInput");
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const output = document.getElementById("output");
  const downloadLink = document.getElementById("downloadLink");
  const qualityLevelInput = document.getElementById("qualityLevel");
  const autoSummary = document.getElementById("autoSummary");
  const levelTickButtons = document.querySelectorAll(".spec-tick[data-level]");
  const overlayTextInput = document.getElementById("overlayText");
  const textPositionInput = document.getElementById("textPosition");
  const textSizeInput = document.getElementById("textSize");
  const textColorInput = document.getElementById("textColor");
  const textBgColorInput = document.getElementById("textBgColor");
  const textBgOpacityInput = document.getElementById("textBgOpacity");
  const uploadSection = document.getElementById("uploadSection");
  const outputSection = document.getElementById("outputSection");
  const advancedToggle = document.getElementById("advancedToggle");
  const advancedContent = document.getElementById("advancedContent");
  const toggleIcon = document.getElementById("toggleIcon");

  // GIF 자르기는 별도 페이지로 이동

  // 고급 설정과 텍스트 설정 DOM
  const advancedSettings = document.getElementById("advancedSettings");
  const textSettings = document.getElementById("textSettings");

  // 필수 요소 없으면 중단
  if (!canvas || !video || !uploadSection) return;

  // 초기 상태: 고급 설정, 텍스트 설정 숨기기
  if (advancedSettings) advancedSettings.style.display = 'none';
  if (textSettings) textSettings.style.display = 'none';

  // 텍스트 설정 토글
  const textToggle = document.getElementById("textToggle");
  const textContent = document.getElementById("textContent");
  const textToggleIcon = document.getElementById("textToggleIcon");

  if (textToggle && textContent && textToggleIcon) {
    const initExpanded = textContent.classList.contains("expanded");
    textToggle.setAttribute("aria-expanded", String(initExpanded));
    textToggleIcon.classList.toggle("rotated", initExpanded);
    textToggleIcon.textContent = "▼"; // 방향은 .rotated 회전으로만 표시

    textToggle.addEventListener("click", () => {
      const isExpanded = textContent.classList.toggle("expanded");
      textToggle.setAttribute("aria-expanded", String(isExpanded));
      textToggleIcon.classList.toggle("rotated", isExpanded);
      textToggleIcon.textContent = "▼"; // 방향은 .rotated 회전으로만 표시
    });

    textToggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        textToggle.click();
      }
    });
  }

  // 고급 설정 토글
  // if (advancedToggle && advancedContent && toggleIcon) {
  //   advancedToggle.addEventListener("click", () => {
  //     const isExpanded = advancedContent.classList.toggle("expanded");
  //     advancedToggle.setAttribute("aria-expanded", isExpanded);
  //   });
  // }

  // 고급 설정 토글
  if (advancedToggle && advancedContent && toggleIcon) {
    // 초기 상태 동기화 (페이지 진입 시)
    const initExpanded = advancedContent.classList.contains("expanded");
    advancedToggle.setAttribute("aria-expanded", String(initExpanded));
    toggleIcon.classList.toggle("rotated", initExpanded);
    toggleIcon.textContent = "▼"; // 방향은 .rotated 회전으로만 표시

    advancedToggle.addEventListener("click", () => {
      const isExpanded = advancedContent.classList.toggle("expanded");
      // aria-expanded 는 문자열로 넣는게 표준적임
      advancedToggle.setAttribute("aria-expanded", String(isExpanded));

      // 아이콘 회전 + 모양 변경
      toggleIcon.classList.toggle("rotated", isExpanded);
      toggleIcon.textContent = "▼"; // 방향은 .rotated 회전으로만 표시
    });

    // (선택) 키보드 접근성: Enter/Space로도 토글
    advancedToggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advancedToggle.click();
      }
    });
  }

  // GIF 자르기 기능은 별도 페이지(/gif-trim/)로 이동

  // 드래그 앤 드롭
  uploadSection.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadSection.classList.add("dragover");
  });

  uploadSection.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadSection.classList.remove("dragover");
  });

  uploadSection.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadSection.classList.remove("dragover");
    const files = e.dataTransfer?.files || [];
    if (files.length > 0 && files[0].type.startsWith("video/")) {
      handleVideoFile(files[0]);
    }
  });

  uploadSection.addEventListener("click", () => {
    videoInput?.click();
  });

  // 파일 선택
  videoInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleVideoFile(file);
  });

  // 화질 눈금 (1 저사양 ~ 5 고사양)
  if (qualityLevelInput) {
    qualityLevelInput.value = String(DEFAULT_LEVEL);
    markActiveTick(DEFAULT_LEVEL);

    // 끄는 동안에는 요약만 바꾸고, 놓으면 다시 만든다
    qualityLevelInput.addEventListener("input", () => {
      const level = Number(qualityLevelInput.value);
      markActiveTick(level);
      if (videoMeta) renderSummary(computeAutoSettings(level, videoMeta));
    });
    qualityLevelInput.addEventListener("change", () => {
      requestConvert(Number(qualityLevelInput.value));
    });
  }
  levelTickButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!qualityLevelInput) return;
      qualityLevelInput.value = btn.dataset.level;
      qualityLevelInput.dispatchEvent(new Event("input"));
      qualityLevelInput.dispatchEvent(new Event("change"));
    });
  });

  function markActiveTick(level) {
    const slider = qualityLevelInput?.closest(".spec-slider");
    if (slider) slider.dataset.level = String(level);
    levelTickButtons.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.level) === level);
    });
  }

  function renderSummary(settings) {
    if (!autoSummary || !videoMeta) return;
    const t = translations[currentLanguage];
    const name = t.levelNames[settings.level - 1];
    autoSummary.innerHTML = "";
    const lines = [
      ["auto-source", t.source(videoMeta)],
      ["auto-main", t.summary(settings, name)],
      ["auto-note", settings.speed > 1.05 ? t.spedUp(settings.speed) : t.realtime],
    ];
    if (settings.reduced && settings.speed <= 1.05) lines.push(["auto-note", t.reduced]);
    lines.forEach(([cls, text]) => {
      const span = document.createElement("span");
      span.className = cls;
      span.textContent = text;
      autoSummary.appendChild(span);
    });
  }

  function getTextOptions() {
    const textBgOpacityValue = parseFloat(textBgOpacityInput?.value);
    return {
      overlayText: overlayTextInput?.value || "",
      textPosition: textPositionInput?.value || "bottom",
      textSize: parseInt(textSizeInput?.value, 10) || 30,
      textColor: textColorInput?.value || "#ffffff",
      textBgColor: textBgColorInput?.value || "#000000",
      textBgOpacity: isNaN(textBgOpacityValue) ? 0.6 : textBgOpacityValue,
    };
  }

  // 변환 중에 눈금을 또 옮기면, 끝난 뒤 마지막 단계로 한 번 더 만든다
  async function requestConvert(level) {
    if (!videoMeta) return;
    if (converting) {
      pendingLevel = level;
      return;
    }
    converting = true;
    try {
      await convertAt(level);
    } finally {
      converting = false;
    }
    if (pendingLevel !== null && pendingLevel !== level) {
      const next = pendingLevel;
      pendingLevel = null;
      requestConvert(next);
    } else {
      pendingLevel = null;
    }
  }

  async function convertAt(level) {
    const settings = computeAutoSettings(level, videoMeta);
    currentSettings = settings;
    renderSummary(settings);

    if (output) output.innerHTML = "";
    if (downloadLink) downloadLink.style.display = "none";
    if (outputSection) outputSection.style.display = "block";

    if (!lastExtract || lastExtract.interval !== settings.interval || lastExtract.width !== settings.width) {
      outputWidth = settings.width;
      outputHeight = settings.height;
      setProgressMessage(translations[currentLanguage].extractingFrames);
      frames = await extractFrames(video, settings.interval);
      lastExtract = { interval: settings.interval, width: settings.width };
    }

    setProgressMessage(translations[currentLanguage].generatingGif);
    const o = getTextOptions();
    await generateGIF(frames, settings.width, settings.quality, settings.fps, o.overlayText, o.textPosition, o.textSize, o.textColor, o.textBgColor, o.textBgOpacity);
  }

  // 길이 정보가 없는 영상(일부 WebM)은 끝으로 이동시켜 길이를 알아낸다
  function probeDuration(videoEl) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (d) => {
        if (done) return;
        done = true;
        videoEl.removeEventListener("durationchange", onChange);
        videoEl.currentTime = 0;
        resolve(d);
      };
      const onChange = () => {
        if (isFinite(videoEl.duration) && videoEl.duration > 0) finish(videoEl.duration);
      };
      videoEl.addEventListener("durationchange", onChange);
      videoEl.currentTime = 1e101;
      setTimeout(() => finish(isFinite(videoEl.duration) ? videoEl.duration : 0), 4000);
    });
  }

  // 텍스트 재생성 버튼 (텍스트 설정)
  const textReconvertBtn = document.getElementById("textReconvertBtn");
  textReconvertBtn?.addEventListener("click", async () => {
    if (!currentVideoFile || !currentSettings || !frames || frames.length === 0) return;
    if (output) output.innerHTML = "";
    if (downloadLink) downloadLink.style.display = "none";

    setProgressMessage(
      translations[currentLanguage].generatingGif || "GIF 생성 중..."
    );

    const original = textReconvertBtn.innerHTML;
    textReconvertBtn.innerHTML = `<span class="loading-spinner"></span> ${
      translations[currentLanguage].regeneratingGif || "GIF 재생성 중..."
    }`;
    textReconvertBtn.disabled = true;

    // 텍스트 설정만 바꾸고, 기존 프레임과 현재 화질 단계 설정은 그대로 사용
    const o = getTextOptions();
    const s = currentSettings;
    await generateGIF(frames, s.width, s.quality, s.fps, o.overlayText, o.textPosition, o.textSize, o.textColor, o.textBgColor, o.textBgOpacity);

    textReconvertBtn.innerHTML = original;
    textReconvertBtn.disabled = false;

    clearProgressMessage();
  });

  // ------------ 내부 함수들 ------------

  // ✅ 개선: 업로드 섹션에 로딩 상태 표시
  function showUploadLoading(message) {
    const uploadIcon = uploadSection.querySelector(".upload-icon");
    const uploadText = uploadSection.querySelector(".upload-text");
    const uploadSubtext = uploadSection.querySelector(".upload-subtext");

    if (uploadIcon) uploadIcon.style.display = "none";
    if (uploadSubtext) uploadSubtext.style.display = "none";

    if (uploadText) {
      uploadText.innerHTML = `
        <div class="loading-indicator">
          <div class="spinner"></div>
          <div class="loading-text">${message}</div>
        </div>
      `;
    }

    uploadSection.style.pointerEvents = "none";
    uploadSection.style.opacity = "0.7";
  }

  // ✅ 개선: 업로드 섹션 로딩 해제 및 "새 동영상 변환하기" 표시
  function hideUploadLoading() {
    const uploadIcon = uploadSection.querySelector(".upload-icon");
    const uploadText = uploadSection.querySelector(".upload-text");
    const uploadSubtext = uploadSection.querySelector(".upload-subtext");

    if (uploadIcon) uploadIcon.style.display = "block";
    if (uploadSubtext) {
      uploadSubtext.style.display = "block";
      uploadSubtext.textContent = currentLanguage === "ko"
        ? "다른 동영상을 변환하려면 클릭하거나 드래그 & 드롭하세요"
        : "Click or drag & drop to convert another video";
    }

    if (uploadText) {
      uploadText.textContent = currentLanguage === "ko"
        ? "새 동영상 변환하기"
        : "Convert New Video";
    }

    uploadSection.style.pointerEvents = "auto";
    uploadSection.style.opacity = "1";
  }

  function setProgressMessage(text) {
    if (output) {
      output.innerHTML = `
        <div class="progress-message">
          <div class="spinner"></div>
          <div class="message">${text}</div>
        </div>
      `;
    }
  }

  function clearProgressMessage() {
    // GIF 이미지가 표시되므로 메시지 제거는 generateGIF에서 처리됨
  }

  async function handleVideoFile(file) {
    currentVideoFile = file;
    lastExtract = null;

    showUploadLoading(translations[currentLanguage].processingVideo);

    video.src = URL.createObjectURL(file);
    await new Promise((resolve) => {
      if (video.readyState >= 1) return resolve();
      video.addEventListener("loadedmetadata", resolve, { once: true });
    });

    let duration = video.duration;
    if (!isFinite(duration) || duration <= 0) duration = await probeDuration(video);
    if (!duration) {
      hideUploadLoading();
      if (outputSection) outputSection.style.display = "block";
      if (output) output.textContent = translations[currentLanguage].noDuration;
      return;
    }
    videoMeta = {
      duration,
      width: video.videoWidth || 420,
      height: video.videoHeight || 236,
    };

    const level = Number(qualityLevelInput?.value) || DEFAULT_LEVEL;
    await requestConvert(level);

    setTimeout(() => {
      outputSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  function createDraggableTextOverlay(container, text, fontSize, textColor, bgColor, bgOpacity) {
    // 기존 텍스트 오버레이 제거
    const existingOverlay = container.querySelector('.text-overlay-draggable');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // 드래그 가능한 텍스트 박스 생성
    const textBox = document.createElement('div');
    textBox.className = 'text-overlay-draggable';
    textBox.textContent = text;

    // Hex to RGB 변환
    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    }

    const bgRgb = hexToRgb(bgColor);

    textBox.style.cssText = `
      position: absolute;
      left: ${textPositionX * 100}%;
      top: ${textPositionY * 100}%;
      transform: translate(-50%, -50%);
      cursor: move;
      color: ${textColor};
      background: rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${bgOpacity});
      padding: ${fontSize * 0.25}px ${fontSize * 0.5}px;
      font-size: ${fontSize}px;
      font-weight: bold;
      font-family: Arial, sans-serif;
      border-radius: 4px;
      user-select: none;
      z-index: 10;
      pointer-events: auto;
    `;

    // 드래그 이벤트 핸들러
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    textBox.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      // 현재 위치 저장 (백분율로 변환)
      const rect = container.getBoundingClientRect();
      initialLeft = textPositionX * rect.width;
      initialTop = textPositionY * rect.height;

      textBox.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newLeft = initialLeft + deltaX;
      const newTop = initialTop + deltaY;

      // 컨테이너 크기 가져오기
      const rect = container.getBoundingClientRect();

      // 정규화된 좌표 업데이트 (0-1 범위)
      textPositionX = Math.max(0, Math.min(1, newLeft / rect.width));
      textPositionY = Math.max(0, Math.min(1, newTop / rect.height));

      // 시각적 위치 업데이트
      textBox.style.left = `${textPositionX * 100}%`;
      textBox.style.top = `${textPositionY * 100}%`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        textBox.style.cursor = 'move';
      }
    });

    container.appendChild(textBox);
  }

  async function generateGIF(frameList, width, quality, fps, overlayText = "", textPosition = "bottom", textSize = 30, textColor = "#ffffff", textBgColor = "#000000", textBgOpacity = 0.6) {
    const ctx = canvas.getContext("2d");
    const imageDatas = [];

    canvas.width = width;
    canvas.height = outputHeight;

    // 텍스트 스타일 설정
    const fontSize = textSize; // 사용자가 지정한 크기 사용
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Hex to RGB 변환 함수
    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    }

    for (const blob of frameList) {
      const img = await blobToImage(blob);
      ctx.drawImage(img, 0, 0, width, canvas.height);

      // 텍스트 오버레이 추가
      if (overlayText && overlayText.trim() !== "") {
        const textX = textPositionX * width;
        const textY = textPositionY * canvas.height;

        // 배경 박스와 외곽선 (투명도가 0보다 클 때만)
        if (textBgOpacity > 0) {
          const textWidth = ctx.measureText(overlayText).width;
          const boxPadding = fontSize * 0.5;
          const boxX = textX - textWidth / 2 - boxPadding;
          const boxY = textY - fontSize / 2 - boxPadding / 2;
          const boxWidth = textWidth + boxPadding * 2;
          const boxHeight = fontSize + boxPadding;

          const bgRgb = hexToRgb(textBgColor);
          ctx.fillStyle = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${textBgOpacity})`;
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

          // 텍스트 외곽선 (배경색)
          ctx.strokeStyle = textBgColor;
          ctx.lineWidth = fontSize / 8;
          ctx.strokeText(overlayText, textX, textY);
        }

        // 텍스트 (사용자 지정 색상)
        ctx.fillStyle = textColor;
        ctx.fillText(overlayText, textX, textY);
      }

      const imageData = ctx.getImageData(0, 0, width, canvas.height);
      imageDatas.push(imageData);
    }

    const gifBuffer = await encode({
      frames: imageDatas,
      width: width,
      height: canvas.height,
      quality: quality,
      fps: fps,
    });

    const gifBlob = new Blob([gifBuffer], { type: "image/gif" });
    const gifUrl = URL.createObjectURL(gifBlob);

    const gifImg = document.createElement("img");
    gifImg.src = gifUrl;
    gifImg.alt = "Generated GIF";
    gifImg.id = "outputGif";

    if (output) {
      output.innerHTML = "";
      output.appendChild(gifImg);

      // 텍스트 오버레이가 있으면 드래그 가능한 텍스트 박스 생성
      if (overlayText && overlayText.trim() !== "") {
        createDraggableTextOverlay(output, overlayText, textSize, textColor, textBgColor, textBgOpacity);
      }
    }
    if (downloadLink) {
      downloadLink.href = gifUrl;
      downloadLink.style.display = "inline-block";
    }

    // 결과 섹션 표시
    if (outputSection) outputSection.style.display = "block";

    // GIF 생성 후 고급 설정, 텍스트 설정 표시
    if (advancedSettings) advancedSettings.style.display = 'block';
    if (textSettings) textSettings.style.display = 'block';

    // 완료 후 스크롤
    setTimeout(() => {
      outputSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  async function extractFrames(video, interval) {
    // 캔버스 리셋
    const w = canvas.width;
    canvas.width = 0;
    canvas.width = w;

    const ctx = canvas.getContext("2d");
    const duration = (videoMeta && videoMeta.duration) || video.duration || 0;
    const frameList = [];

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // ✅ 개선: 프레임 추출 진행 표시
    let frameCount = 0;
    const totalFrames = Math.ceil(duration / interval);

    for (let t = 0; t < duration; t += interval) {
      video.currentTime = t;
      await waitForSeek(video);

      ctx.drawImage(video, 0, 0, outputWidth, outputHeight);
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));

      // 진행률 업데이트
      frameCount++;
      showUploadLoading(
        `${translations[currentLanguage].extractingFrames} (${frameCount}/${totalFrames})`
      );

      frameList.push(blob);
    }

    // 프레임 추출 완료 후 업로드 섹션 복구
    hideUploadLoading();

    return frameList;
  }

  function waitForSeek(video) {
    return new Promise((resolve) => {
      const handler = () => {
        video.removeEventListener("seeked", handler);
        resolve();
      };
      video.addEventListener("seeked", handler, { once: true });
    });
  }

  function blobToImage(blob) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(blob);
    });
  }

  // GIF 자르기 페이지 링크 이벤트
  // 링크 자체는 target="_blank" 로 새 탭에서 열리므로(기본 동작 유지),
  // 현재 페이지는 그대로 두고 생성된 GIF가 있으면 다운로드만 해 준다.
  const trimPageLink = document.getElementById("trimPageLink");
  if (trimPageLink) {
    trimPageLink.addEventListener("click", () => {
      const gifUrl = downloadLink?.href;
      if (gifUrl && gifUrl.startsWith("blob:")) {
        const link = document.createElement("a");
        link.href = gifUrl;
        link.download = "output.gif";
        link.click();
      }
    });
  }

  // 페이지 전역 드래그 방지
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
});
