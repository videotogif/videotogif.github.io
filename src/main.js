// Video to GIF Converter - Main JavaScript
import encode from "gifski-wasm";

// -----------------------------
// i18n (번역 리소스)
// -----------------------------
let currentLanguage = localStorage.getItem("zifLanguage") || "ko";

const translations = {
  ko: {
    uploadText: "비디오 파일을 선택하세요",
    uploadSubtext: "클릭하거나 드래그 & 드롭으로 업로드하면 GIF가 생성됩니다.",
    previewTitle: "프레임 미리보기",
    outputTitle: "생성된 GIF",
    downloadText: "GIF 다운로드",
    advancedSettingsTitle: "고급 설정",
    intervalLabel: "프레임 간격 (초)",
    outputWidthLabel: "출력 가로 크기 (px)",
    qualityLabel: "품질 (1~100)",
    fpsLabel: "FPS (프레임/초)",
    reconvertText: "🔄 새 설정으로 GIF 재생성",
    loadingVideo: "비디오를 로딩 중...",
    extractingFrames: "프레임을 추출 중...",
    generatingGif: "GIF 생성 중...",
    completed: "GIF 생성 완료!",
    completedSubtext: "아래 고급 설정에서 다른 옵션으로 재생성할 수 있습니다",
    regeneratingGif: "GIF 재생성 중...",
    processingVideo: "비디오 처리 중...",
  },
  en: {
    uploadText: "Select Video File",
    uploadSubtext:
      "Click or drag & drop to upload and automatically generate GIF.",
    previewTitle: "Frame Preview",
    outputTitle: "Generated GIF",
    downloadText: "Download GIF",
    advancedSettingsTitle: "Advanced Settings",
    intervalLabel: "Frame Interval (seconds)",
    outputWidthLabel: "Output Width (px)",
    qualityLabel: "Quality (1~100)",
    fpsLabel: "FPS (frames/second)",
    reconvertText: "🔄 Regenerate GIF with New Settings",
    loadingVideo: "Loading video...",
    extractingFrames: "Extracting frames...",
    generatingGif: "Generating GIF...",
    completed: "GIF Generation Complete!",
    completedSubtext:
      "You can regenerate with different options in advanced settings below",
    regeneratingGif: "Regenerating GIF...",
    processingVideo: "Processing video...",
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
  setText("previewTitle", t.previewTitle);
  setText("outputTitle", t.outputTitle);
  setText("downloadText", t.downloadText);
  setText("advancedSettingsTitle", t.advancedSettingsTitle);
  setText("intervalLabel", t.intervalLabel);
  setText("outputWidthLabel", t.outputWidthLabel);
  setText("qualityLabel", t.qualityLabel);
  setText("fpsLabel", t.fpsLabel);
  setText("reconvertText", t.reconvertText);
}

// -----------------------------
// 메인 로직 (DOM Ready)
// -----------------------------
ready(() => {
  updateAllTexts(); // 초기 렌더

  // 기본값
  let defaultInterval = 0.3;
  let defaultWidth = 420;
  let defaultQuality = 90;
  let defaultFps = 10;

  let frames = [];
  let outputWidth = 420;
  let outputHeight = 0;
  let currentVideoFile = null;

  // DOM refs
  const videoInput = document.getElementById("videoInput");
  const reconvertBtn = document.getElementById("reconvertBtn");
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const preview = document.getElementById("preview");
  const output = document.getElementById("output");
  const downloadLink = document.getElementById("downloadLink");
  const intervalInput = document.getElementById("interval");
  const qualityInput = document.getElementById("quality");
  const fpsInput = document.getElementById("fps");
  const outputWidthInput = document.getElementById("outputWidth");
  const uploadSection = document.getElementById("uploadSection");
  const outputSection = document.getElementById("outputSection");
  const previewSection = document.getElementById("previewSection");
  const advancedToggle = document.getElementById("advancedToggle");
  const advancedContent = document.getElementById("advancedContent");
  const toggleIcon = document.getElementById("toggleIcon");

  // 필수 요소 없으면 중단
  if (!canvas || !video || !uploadSection) return;

  // 고급 설정 토글
  if (advancedToggle && advancedContent && toggleIcon) {
    advancedToggle.addEventListener("click", () => {
      const isExpanded = advancedContent.classList.toggle("expanded");
      advancedToggle.setAttribute("aria-expanded", isExpanded);
    });
  }

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

  // 재생성 버튼
  reconvertBtn?.addEventListener("click", async () => {
    if (!currentVideoFile) return;
    if (output) output.innerHTML = "";
    if (downloadLink) downloadLink.style.display = "none";

    setProgressMessage(
      translations[currentLanguage].generatingGif || "GIF 생성 중..."
    );

    const original = reconvertBtn.innerHTML;
    reconvertBtn.innerHTML = `<span class="loading-spinner"></span> ${
      translations[currentLanguage].regeneratingGif || "GIF 재생성 중..."
    }`;
    reconvertBtn.disabled = true;

    const newInterval = parseFloat(intervalInput?.value) || 0.3;
    const newWidth = parseInt(outputWidthInput?.value, 10) || 420;
    const newQuality = parseInt(qualityInput?.value, 10) || 90;
    const newFps = parseInt(fpsInput?.value, 10) || 10;

    if (newWidth !== defaultWidth || newInterval !== defaultInterval) {
      defaultWidth = newWidth;
      defaultInterval = newInterval;
      outputWidth = newWidth;
      const aspect = (video.videoHeight || 1) / (video.videoWidth || 1);
      outputHeight = Math.round(outputWidth * aspect);

      setProgressMessage(
        translations[currentLanguage].extractingFrames || "프레임을 추출 중..."
      );
      frames = await extractFrames(video, newInterval);
    }

    await generateGIF(frames, newWidth, newQuality, newFps);

    reconvertBtn.innerHTML = original;
    reconvertBtn.disabled = false;

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

  // ✅ 개선: 업로드 섹션 로딩 해제
  function hideUploadLoading() {
    const uploadIcon = uploadSection.querySelector(".upload-icon");
    const uploadText = uploadSection.querySelector(".upload-text");
    const uploadSubtext = uploadSection.querySelector(".upload-subtext");

    if (uploadIcon) uploadIcon.style.display = "block";
    if (uploadSubtext) uploadSubtext.style.display = "block";

    if (uploadText) {
      uploadText.textContent = translations[currentLanguage].uploadText;
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

    // ✅ 개선: 즉시 로딩 표시
    showUploadLoading(
      translations[currentLanguage].processingVideo || "비디오 처리 중..."
    );

    // 비디오 지정
    video.src = URL.createObjectURL(file);

    // 메타데이터 대기
    await new Promise((resolve) => {
      if (video.readyState >= 1) return resolve();
      video.addEventListener("loadedmetadata", resolve, { once: true });
    });

    // 출력 폭/높이 결정
    defaultWidth = Math.min(video.videoWidth || 420, 900);
    outputWidth = defaultWidth;
    if (outputWidthInput) outputWidthInput.value = defaultWidth;

    const aspect = (video.videoHeight || 1) / (video.videoWidth || 1);
    outputHeight = Math.round(outputWidth * aspect);

    // ✅ 개선: 프레임 추출 시작 알림
    showUploadLoading(
      translations[currentLanguage].extractingFrames || "프레임을 추출 중..."
    );

    // ✅ 개선: 미리보기 섹션 먼저 표시
    if (previewSection) {
      previewSection.style.display = "block";
      // 스크롤 애니메이션
      setTimeout(() => {
        previewSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }

    // 프레임 추출
    frames = await extractFrames(video, defaultInterval);

    // ✅ 개선: 업로드 섹션 정상화
    hideUploadLoading();

    // ✅ 개선: GIF 생성 진행 표시
    setProgressMessage(
      translations[currentLanguage].generatingGif || "GIF 생성 중..."
    );

    // 결과 섹션 표시
    if (outputSection) outputSection.style.display = "block";

    // GIF 생성
    await generateGIF(frames, defaultWidth, defaultQuality, defaultFps);

    // 완료 후 스크롤
    setTimeout(() => {
      outputSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  async function generateGIF(frameList, width, quality, fps) {
    const ctx = canvas.getContext("2d");
    const imageDatas = [];

    canvas.width = width;
    canvas.height = outputHeight;

    for (const blob of frameList) {
      const img = await blobToImage(blob);
      ctx.drawImage(img, 0, 0, width, canvas.height);
      const imageData = ctx.getImageData(0, 0, width, canvas.height);
      imageDatas.push(imageData);
    }

    const gifBuffer = await encode({
      frames: imageDatas,
      width,
      height: canvas.height,
      quality,
      fps,
    });

    const gifBlob = new Blob([gifBuffer], { type: "image/gif" });
    const gifUrl = URL.createObjectURL(gifBlob);

    const gifImg = document.createElement("img");
    gifImg.src = gifUrl;
    gifImg.alt = "Generated GIF";

    if (output) {
      output.innerHTML = "";
      output.appendChild(gifImg);
    }
    if (downloadLink) {
      downloadLink.href = gifUrl;
      downloadLink.style.display = "inline-block";
    }
  }

  async function extractFrames(video, interval) {
    // 캔버스 리셋
    const w = canvas.width;
    canvas.width = 0;
    canvas.width = w;

    const ctx = canvas.getContext("2d");
    const duration = video.duration || 0;
    const frameList = [];

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    if (preview) preview.innerHTML = "";

    // ✅ 개선: 프레임 추출 진행 표시
    let frameCount = 0;
    const totalFrames = Math.ceil(duration / interval);

    for (let t = 0; t < duration; t += interval) {
      video.currentTime = t;
      await waitForSeek(video);

      ctx.drawImage(video, 0, 0, outputWidth, outputHeight);
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));

      if (preview) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(blob);
        img.alt = `Frame at ${t.toFixed(1)}s`;
        img.role = "listitem";
        img.style.animation = "fadeIn 0.3s ease-in forwards";

        preview.appendChild(img);

        // 진행률 업데이트
        frameCount++;
        showUploadLoading(
          `${translations[currentLanguage].extractingFrames} (${frameCount}/${totalFrames})`
        );
      }

      frameList.push(blob);
    }

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

  // 페이지 전역 드래그 방지
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
});
