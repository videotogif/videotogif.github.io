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
    status: (s, size) =>
      [`${s.width}×${s.height}px`, `${(s.frames / s.fps).toFixed(1)}초`, size, Math.abs(s.speed - 1) > 0.05 ? `${s.speed}X` : ""]
        .filter(Boolean)
        .join(" · "),
    openCustom: "직접 설정하기",
    backToAuto: "자동으로 돌아가기",
    estimate: (e) => `총 ${e.frames}장 · 재생 ${e.play}초 · 작업 메모리 약 ${e.mb}MB`,
    heavy: "메모리를 많이 써서 기기에 따라 느리거나 멈출 수 있어요. 크기나 초당 장수를 낮추거나 영상을 짧게 잘라 보세요.",
    tooHeavy: "브라우저가 버티기 어려운 크기예요. 크기나 초당 장수를 낮추거나 재생 속도를 올려 주세요.",
    noDuration: "영상 길이를 읽을 수 없어요. MP4로 바꿔서 다시 올려 주세요.",
    dlgTitle: "이 브라우저에서는 열 수 없는 영상이에요",
    dlgMac: "사파리로 이 페이지를 열고 다시 올려 주세요.",
    dlgWindows: "MP4(H.264)로 바꾼 뒤 다시 올려 주세요.",
    dlgOther: "MP4(H.264)로 바꾼 뒤 다시 올려 주세요.",
    dlgCopy: "주소 복사",
    dlgCopied: "복사했어요",
    dlgClose: "닫기",
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
    status: (s, size) =>
      [`${s.width}×${s.height}px`, `${(s.frames / s.fps).toFixed(1)}s`, size, Math.abs(s.speed - 1) > 0.05 ? `${s.speed}X` : ""]
        .filter(Boolean)
        .join(" · "),
    openCustom: "Custom settings",
    backToAuto: "Back to auto",
    estimate: (e) => `${e.frames} frames · ${e.play}s long · about ${e.mb}MB of working memory`,
    heavy: "This uses a lot of memory and may be slow or freeze on some devices. Try a smaller size, fewer frames per second, or a shorter clip.",
    tooHeavy: "This is too big for the browser to handle. Lower the size or frames per second, or speed it up.",
    noDuration: "Couldn't read this video's length. Please convert it to MP4 and try again.",
    dlgTitle: "This browser can't open this video",
    dlgMac: "Open this page in Safari and upload it again.",
    dlgWindows: "Convert it to MP4 (H.264) and upload it again.",
    dlgOther: "Convert it to MP4 (H.264) and upload it again.",
    dlgCopy: "Copy link",
    dlgCopied: "Copied",
    dlgClose: "Close",
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

  // 직접 설정: 크기·초당 장수·품질·재생 속도를 사용자가 정한다
  // 장면 간격 = 재생 속도 ÷ 초당 장수 (1배속이면 원본 속도, 2배속이면 두 배 빠르게)
  const CUSTOM_MAX_SIDE = 900; // 긴 쪽 최대 (고사양 단계와 같음)
  const CUSTOM_HARD_LIMIT_MB = 1200; // 이보다 크면 탭이 멈출 수 있어 만들지 않음
  function customMaxWidth(meta) {
    const aspect = meta.height / meta.width;
    return Math.max(2, Math.floor(Math.min(meta.width, CUSTOM_MAX_SIDE, CUSTOM_MAX_SIDE / aspect) / 2) * 2);
  }
  function computeCustomSettings(c, meta) {
    const aspect = meta.height / meta.width;
    const even = (n) => Math.max(2, Math.round(n / 2) * 2);
    const width = Math.min(even(c.width), customMaxWidth(meta));
    const height = even(width * aspect);
    let interval = c.speed / c.fps;
    if (meta.duration / interval < 2) interval = meta.duration / 2; // gifski는 최소 2장
    const frames = Math.max(2, Math.ceil(meta.duration / interval - 1e-9));
    const mb = Math.round((frames * width * height * 4) / (1024 * 1024));
    return { custom: true, level: null, fps: c.fps, interval, width, height, quality: c.quality, frames, speed: c.speed, reduced: false, mb };
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

  // 초기 상태: 설정 탭 숨기기 (GIF가 만들어지면 보임)
  const settingsWrap = document.getElementById("settingsWrap");
  if (settingsWrap) settingsWrap.style.display = "none";

  // 설정 탭 (화질 / 텍스트 / 자르기): 누르거나 ←→ 키로 옮겨 다님
  const settingTabs = Array.from(document.querySelectorAll('#settingsTabs [role="tab"]'));
  function selectSettingTab(tab, focus) {
    settingTabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  settingTabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectSettingTab(tab));
    tab.addEventListener("keydown", (e) => {
      const n = settingTabs.length;
      let j = null;
      if (e.key === "ArrowRight") j = (i + 1) % n;
      else if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = n - 1;
      if (j !== null) {
        e.preventDefault();
        selectSettingTab(settingTabs[j], true);
      }
    });
  });

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

  // 화질 조절: 자동 눈금이 기본, 아래 '직접 설정하기'를 누르면 펼쳐짐 (펼치면 자동 눈금은 흐리게)
  const autoPanel = document.getElementById("autoPanel");
  const customPanel = document.getElementById("customPanel");
  const customToggle = document.getElementById("customToggle");
  const customWidthInput = document.getElementById("customWidth");
  const customWidthOut = document.getElementById("customWidthOut");
  const customQualityInput = document.getElementById("customQuality");
  const customQualityOut = document.getElementById("customQualityOut");
  const customFpsInput = document.getElementById("customFps");
  const customFpsOut = document.getElementById("customFpsOut");
  const customSpeedInput = document.getElementById("customSpeed");
  const customSpeedOut = document.getElementById("customSpeedOut");
  const customEstimate = document.getElementById("customEstimate");
  const customApplyBtn = document.getElementById("customApplyBtn");
  const CUSTOM_FPS = [5, 10, 20, 25]; // 초당 장수 눈금 (GIF 지연 단위로 정확히 떨어지는 값)
  const CUSTOM_SPEEDS = [0.5, 1, 1.5, 2, 3]; // 재생 속도 눈금
  const custom = { width: 540, fps: 10, quality: 90, speed: 1 };
  let qualityMode = "auto";

  function renderCustomEstimate() {
    if (!videoMeta) return;
    const t = translations[currentLanguage];
    const s = computeCustomSettings(custom, videoMeta);
    if (customWidthOut) customWidthOut.textContent = `${s.width}×${s.height}px`;
    if (customQualityOut) customQualityOut.textContent = String(custom.quality);
    if (customFpsOut) customFpsOut.textContent = String(custom.fps);
    if (customSpeedOut) customSpeedOut.textContent = `${custom.speed}X`;
    const comfortable = lowEndDevice ? 200 : 400;
    const tooHeavy = s.mb > CUSTOM_HARD_LIMIT_MB;
    let text = t.estimate({ frames: s.frames, play: (s.frames / s.fps).toFixed(1), mb: s.mb });
    if (tooHeavy) text += " " + t.tooHeavy;
    else if (s.mb > comfortable) text += " " + t.heavy;
    if (customEstimate) {
      customEstimate.textContent = text;
      customEstimate.classList.toggle("warn", s.mb > comfortable);
    }
    if (customApplyBtn) customApplyBtn.disabled = tooHeavy;
  }

  function syncCustomInputs() {
    if (!videoMeta) return;
    const maxW = customMaxWidth(videoMeta);
    custom.width = Math.min(custom.width, maxW);
    if (customWidthInput) {
      customWidthInput.max = String(maxW);
      customWidthInput.min = String(Math.min(100, maxW));
      customWidthInput.value = String(custom.width);
    }
    if (customQualityInput) customQualityInput.value = String(custom.quality);
    if (customFpsInput) customFpsInput.value = String(Math.max(0, CUSTOM_FPS.indexOf(custom.fps)));
    if (customSpeedInput) customSpeedInput.value = String(Math.max(0, CUSTOM_SPEEDS.indexOf(custom.speed)));
    renderCustomEstimate();
  }

  // silent: 화면만 바꾸고 다시 만들지는 않음 (새 영상을 올릴 때)
  function setQualityMode(mode, silent) {
    const prev = qualityMode;
    qualityMode = mode === "custom" ? "custom" : "auto";
    const isCustom = qualityMode === "custom";
    if (customToggle) {
      customToggle.setAttribute("aria-expanded", String(isCustom));
      const label = customToggle.querySelector(".custom-toggle-text");
      if (label) label.textContent = isCustom ? translations[currentLanguage].backToAuto : translations[currentLanguage].openCustom;
    }
    if (autoPanel) autoPanel.classList.toggle("dim", isCustom);
    if (qualityLevelInput) qualityLevelInput.disabled = isCustom;
    levelTickButtons.forEach((b) => (b.disabled = isCustom));
    if (customPanel) customPanel.hidden = !isCustom;
    if (silent || prev === qualityMode) return;
    if (isCustom) {
      // 지금 GIF의 값에서 시작
      if (currentSettings) {
        custom.width = currentSettings.width;
        custom.quality = currentSettings.quality;
        custom.fps = CUSTOM_FPS.includes(currentSettings.fps) ? currentSettings.fps : 10;
        custom.speed = currentSettings.custom && CUSTOM_SPEEDS.includes(currentSettings.speed) ? currentSettings.speed : 1;
      }
      syncCustomInputs();
    } else if (currentSettings && currentSettings.custom) {
      // 자동으로 돌아오면 눈금 단계로 다시 만든다
      requestConvert(Number(qualityLevelInput?.value) || DEFAULT_LEVEL);
    }
  }

  customToggle?.addEventListener("click", () => setQualityMode(qualityMode === "custom" ? "auto" : "custom"));
  customWidthInput?.addEventListener("input", () => {
    custom.width = Number(customWidthInput.value);
    renderCustomEstimate();
  });
  customQualityInput?.addEventListener("input", () => {
    custom.quality = Number(customQualityInput.value);
    renderCustomEstimate();
  });
  customFpsInput?.addEventListener("input", () => {
    custom.fps = CUSTOM_FPS[Number(customFpsInput.value)] || 10;
    renderCustomEstimate();
  });
  customSpeedInput?.addEventListener("input", () => {
    custom.speed = CUSTOM_SPEEDS[Number(customSpeedInput.value)] || 1;
    renderCustomEstimate();
  });
  customApplyBtn?.addEventListener("click", () => {
    if (videoMeta) requestConvert({ ...custom });
  });

  function markActiveTick(level) {
    const slider = qualityLevelInput?.closest(".spec-slider");
    if (slider) slider.dataset.level = String(level);
    levelTickButtons.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.level) === level);
    });
  }

  // 지금 GIF 상태 한 줄: 크기 · 재생 길이 · 용량(만든 뒤) · 배속(1배가 아닐 때)
  function renderSummary(settings, bytes) {
    if (!autoSummary || !videoMeta) return;
    const size = !bytes ? "" : bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
    autoSummary.innerHTML = "";
    const span = document.createElement("span");
    span.className = "auto-main";
    span.textContent = translations[currentLanguage].status(settings, size);
    autoSummary.appendChild(span);
  }

  // 방금 만든 GIF 파일 크기 (다운로드 링크의 blob에서 읽음)
  async function currentGifBytes() {
    try {
      if (!downloadLink?.href?.startsWith("blob:")) return 0;
      return (await fetch(downloadLink.href).then((r) => r.blob())).size;
    } catch (e) {
      return 0;
    }
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

  // 변환 요청: 화질 단계(숫자) 또는 직접 설정 값(객체).
  // 변환 중에 또 요청이 오면, 끝난 뒤 마지막 요청으로 한 번 더 만든다
  async function requestConvert(level) {
    if (!videoMeta) return;
    if (converting) {
      pendingLevel = level;
      return;
    }
    converting = true;
    try {
      await convertAt(
        typeof level === "number" ? computeAutoSettings(level, videoMeta) : computeCustomSettings(level, videoMeta)
      );
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

  async function convertAt(settings) {
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
    if (currentSettings === settings) renderSummary(settings, await currentGifBytes());
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
    await bakeText();

    textReconvertBtn.innerHTML = original;
    textReconvertBtn.disabled = false;

    clearProgressMessage();
  });

  // 지금 프레임과 화질 설정 그대로, 텍스트만 다시 굽기
  async function bakeText() {
    const o = getTextOptions();
    const s = currentSettings;
    await generateGIF(frames, s.width, s.quality, s.fps, o.overlayText, o.textPosition, o.textSize, o.textColor, o.textBgColor, o.textBgOpacity);
    renderSummary(s, await currentGifBytes());
  }

  // 위치를 옮기면 잠깐 뒤 자동으로 다시 굽는다 (GIF는 그대로 보이다가 새 GIF로 바뀜)
  let textRegenTimer = null;
  let textRegenRunning = false;
  let textRegenAgain = false;
  function scheduleTextRegen() {
    clearTimeout(textRegenTimer);
    textRegenTimer = setTimeout(async () => {
      if (!currentSettings || !frames || frames.length === 0 || !getTextOptions().overlayText.trim()) return;
      if (converting || textRegenRunning) {
        textRegenAgain = true;
        return;
      }
      textRegenRunning = true;
      try {
        await bakeText();
      } finally {
        textRegenRunning = false;
      }
      if (textRegenAgain) {
        textRegenAgain = false;
        scheduleTextRegen();
      }
    }, 500);
  }

  // 텍스트 위치 방향키 (인형뽑기처럼 누르고 있으면 계속 움직임)
  const TEXT_STEP = 0.02;
  const textPad = document.getElementById("textPad");
  function moveText(dir) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    if (dir === "up") textPositionY = clamp(textPositionY - TEXT_STEP);
    else if (dir === "down") textPositionY = clamp(textPositionY + TEXT_STEP);
    else if (dir === "left") textPositionX = clamp(textPositionX - TEXT_STEP);
    else if (dir === "right") textPositionX = clamp(textPositionX + TEXT_STEP);
    else if (dir === "center") textPositionX = 0.5;
    placeTextOverlay(true);
  }
  if (textPad) {
    let holdTimer = null;
    let repeatTimer = null;
    const stopHold = () => {
      if (!holdTimer && !repeatTimer) return;
      clearTimeout(holdTimer);
      clearInterval(repeatTimer);
      holdTimer = repeatTimer = null;
      placeTextOverlay(false);
      scheduleTextRegen();
    };
    textPad.querySelectorAll("[data-dir]").forEach((btn) => {
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        moveText(dir);
        if (dir === "center") {
          holdTimer = setTimeout(() => {}, 0);
          return;
        }
        holdTimer = setTimeout(() => {
          repeatTimer = setInterval(() => moveText(dir), 50);
        }, 300);
      });
      btn.addEventListener("pointerup", stopHold);
      btn.addEventListener("pointerleave", stopHold);
      btn.addEventListener("pointercancel", stopHold);
      // 키보드로 버튼을 눌렀을 때 (Enter/Space)
      btn.addEventListener("click", (e) => {
        if (e.detail !== 0) return; // 마우스·터치는 pointerdown에서 처리
        moveText(btn.dataset.dir);
        placeTextOverlay(false);
        scheduleTextRegen();
      });
    });
    // 방향키 묶음에 포커스가 있으면 키보드 화살표로도 움직임
    textPad.addEventListener("keydown", (e) => {
      const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      if (!map[e.key]) return;
      e.preventDefault();
      moveText(map[e.key]);
      placeTextOverlay(false);
      scheduleTextRegen();
    });
  }

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

  // 브라우저가 못 여는 영상일 때 띄우는 안내 창: 맥(사파리 아님)은 사파리로, 윈도우·그 밖은 MP4로 바꾸도록 안내
  let unsupportedDialog = null;
  function showUnsupportedVideoDialog() {
    const t = translations[currentLanguage];
    const ua = navigator.userAgent || "";
    const isIPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    const isMac = /Macintosh|Mac OS X/.test(ua) && !isIPad && !/iPhone|iPad|iPod/.test(ua);
    const isWindows = /Windows/.test(ua);
    const isSafari = /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS|Whale|SamsungBrowser/.test(ua);
    const suggestSafari = isMac && !isSafari;

    if (!unsupportedDialog) {
      unsupportedDialog = document.createElement("dialog");
      unsupportedDialog.className = "vtg-dialog";
      unsupportedDialog.setAttribute("aria-labelledby", "vtgDialogTitle");
      unsupportedDialog.innerHTML =
        '<button type="button" class="vtg-dialog-x"><span aria-hidden="true">×</span></button>' +
        '<h2 id="vtgDialogTitle" class="vtg-dialog-title" tabindex="-1" autofocus></h2>' +
        '<p class="vtg-dialog-body"></p>' +
        '<button type="button" class="vtg-dialog-copy"></button>';
      document.body.appendChild(unsupportedDialog);
      unsupportedDialog.querySelector(".vtg-dialog-x").addEventListener("click", () => unsupportedDialog.close());
      // 바깥(어두운 배경)을 눌러도 닫힘
      unsupportedDialog.addEventListener("click", (e) => {
        if (e.target === unsupportedDialog) unsupportedDialog.close();
      });
      unsupportedDialog.querySelector(".vtg-dialog-copy").addEventListener("click", (e) => {
        const btn = e.currentTarget;
        const done = () => { btn.textContent = translations[currentLanguage].dlgCopied; };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(location.href).then(done).catch(() => {});
        }
      });
    }

    const d = unsupportedDialog;
    const body = suggestSafari ? t.dlgMac : isWindows ? t.dlgWindows : t.dlgOther;
    d.querySelector(".vtg-dialog-title").textContent = t.dlgTitle;
    d.querySelector(".vtg-dialog-body").textContent = body;
    const copyBtn = d.querySelector(".vtg-dialog-copy");
    copyBtn.textContent = t.dlgCopy;
    copyBtn.hidden = !suggestSafari;
    d.querySelector(".vtg-dialog-x").setAttribute("aria-label", t.dlgClose);

    // <dialog>를 못 쓰는 아주 오래된 브라우저는 결과 영역의 안내 문구만 보여 준다
    if (typeof d.showModal === "function" && !d.open) d.showModal();
    return `${t.dlgTitle}. ${body}`;
  }

  async function handleVideoFile(file) {
    currentVideoFile = file;
    lastExtract = null;

    showUploadLoading(translations[currentLanguage].processingVideo);

    video.src = URL.createObjectURL(file);
    const opened = await new Promise((resolve) => {
      if (video.readyState >= 1) return resolve(true);
      video.addEventListener("loadedmetadata", () => resolve(true), { once: true });
      video.addEventListener("error", () => resolve(false), { once: true });
    });

    // 크기를 조금 늦게 알려 주는 브라우저도 있으니, 0이면 첫 장면이 준비될 때까지 최대 3초 더 기다린다.
    if (opened && (!video.videoWidth || !video.videoHeight)) {
      await new Promise((resolve) => {
        video.addEventListener("loadeddata", resolve, { once: true });
        video.addEventListener("resize", resolve, { once: true });
        setTimeout(resolve, 3000);
      });
    }

    // 파일은 열려도 화면(코덱)을 못 읽는 영상(예: 크롬에서 ProRes)은 가로·세로가 0으로 나온다.
    // 그대로 만들면 빈 GIF가 나오므로 안내하고 멈춘다.
    if (!opened || !video.videoWidth || !video.videoHeight) {
      hideUploadLoading();
      if (outputSection) outputSection.style.display = "block";
      if (downloadLink) downloadLink.style.display = "none";
      // 결과 영역에도 팝업과 같은 안내(기기에 맞는 문구)를 남겨 둔다
      const guide = showUnsupportedVideoDialog();
      if (output) output.textContent = guide;
      return;
    }

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

    // 새 영상은 '자동'으로 시작
    setQualityMode("auto", true);
    const level = Number(qualityLevelInput?.value) || DEFAULT_LEVEL;
    await requestConvert(level);

    setTimeout(() => {
      outputSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  // GIF 위 글자 상자: 평소엔 점선 테두리만(구워진 글자가 보임), 옮기는 동안엔 글자를 보여 줌
  let textOverlay = null;
  function createDraggableTextOverlay(stage, img, gifWidth, text, fontSize, textColor, bgColor, bgOpacity) {
    stage.querySelector(".text-overlay-draggable")?.remove();

    const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(bgColor) || [0, "00", "00", "00"];
    const textBox = document.createElement("div");
    textBox.className = "text-overlay-draggable";
    textBox.textContent = text;
    textBox.style.color = textColor;
    textBox.style.background = `rgba(${parseInt(hex[1], 16)}, ${parseInt(hex[2], 16)}, ${parseInt(hex[3], 16)}, ${bgOpacity})`;
    textBox.dataset.fontSize = String(fontSize);
    textBox.dataset.gifWidth = String(gifWidth);
    stage.appendChild(textBox);
    textOverlay = textBox;

    // 화면에 보이는 GIF 크기에 맞춰 글자 크기를 줄이거나 키움
    const fit = () => placeTextOverlay(textBox.classList.contains("moving"));
    if (img.complete) fit();
    else img.addEventListener("load", fit, { once: true });

    // 끌어서 옮기기 (마우스·터치 모두)
    textBox.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try {
        textBox.setPointerCapture(e.pointerId);
      } catch (err) {
        /* 일부 환경에서는 포인터 캡처가 안 돼도 끌기는 동작 */
      }
      const rect = stage.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const fromX = textPositionX;
      const fromY = textPositionY;
      placeTextOverlay(true);
      const onMove = (ev) => {
        textPositionX = Math.max(0, Math.min(1, fromX + (ev.clientX - startX) / rect.width));
        textPositionY = Math.max(0, Math.min(1, fromY + (ev.clientY - startY) / rect.height));
        placeTextOverlay(true);
      };
      const onUp = () => {
        textBox.removeEventListener("pointermove", onMove);
        textBox.removeEventListener("pointerup", onUp);
        textBox.removeEventListener("pointercancel", onUp);
        placeTextOverlay(false);
        scheduleTextRegen();
      };
      textBox.addEventListener("pointermove", onMove);
      textBox.addEventListener("pointerup", onUp);
      textBox.addEventListener("pointercancel", onUp);
    });
  }

  // 글자 상자 위치·크기 갱신. moving이면 글자를 보여 주고, 아니면 테두리만
  function placeTextOverlay(moving) {
    const box = textOverlay;
    if (!box || !box.isConnected) return;
    const img = box.parentElement.querySelector("img");
    const scale = img && img.clientWidth ? img.clientWidth / Number(box.dataset.gifWidth || img.naturalWidth || 1) : 1;
    const fs = Number(box.dataset.fontSize) * scale;
    box.style.left = `${textPositionX * 100}%`;
    box.style.top = `${textPositionY * 100}%`;
    box.style.fontSize = `${fs}px`;
    box.style.padding = `${fs * 0.25}px ${fs * 0.5}px`;
    box.classList.toggle("moving", !!moving);
  }
  window.addEventListener("resize", () => placeTextOverlay(false));

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
      // GIF를 감싸는 무대: 글자 상자의 위치(%)가 GIF 이미지 기준이 되도록
      const stage = document.createElement("div");
      stage.className = "gif-stage";
      stage.appendChild(gifImg);
      output.appendChild(stage);

      // 텍스트가 있으면 옮길 수 있는 글자 상자 생성
      if (overlayText && overlayText.trim() !== "") {
        createDraggableTextOverlay(stage, gifImg, width, overlayText, textSize, textColor, textBgColor, textBgOpacity);
      }
    }
    if (downloadLink) {
      downloadLink.href = gifUrl;
      downloadLink.style.display = "inline-block";
    }

    // 결과 섹션 표시
    if (outputSection) outputSection.style.display = "block";

    // GIF 생성 후 설정 탭 표시
    if (settingsWrap) settingsWrap.style.display = "block";

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
