// GIF Trim - Standalone GIF trimming functionality
import encode from "/assets/wasm/gifski-wasm/dist/encode.js";

function ready(fn) {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn, { once: true });
}

ready(() => {
  let frames = [];
  let gifDuration = 0; // GIF 전체 길이 (초)
  let frameInterval = 0.1; // 프레임 간격 (초, GIF 기본값)

  // Trim 관련 변수
  let trimStartIndex = 0;
  let trimEndIndex = 0;
  let isDraggingTrimHandle = false;
  let activeTrimHandle = null;

  // 프레임 캐시
  let currentPreviewFrameIndex = -1;
  let previewFrameUrls = new Map();
  let lastStartPercent = -1;
  let lastEndPercent = -1;
  let lastTrimmedLength = -1;

  // DOM refs
  const gifInput = document.getElementById("gifInput");
  const gifUploadSection = document.getElementById("gifUploadSection");
  const trimOutputSection = document.getElementById("trimOutputSection");
  const trimOutput = document.getElementById("trimOutput");
  const trimCanvas = document.getElementById("trimCanvas");
  const trimDownloadLink = document.getElementById("trimDownloadLink");

  // Trim UI elements
  const trimTrack = document.getElementById("trimTrack");
  const trimHandleStart = document.getElementById("trimHandleStart");
  const trimHandleEnd = document.getElementById("trimHandleEnd");
  const trimSelected = document.getElementById("trimSelected");
  const trimTimelineFrames = document.getElementById("trimTimelineFrames");
  const originalDuration = document.getElementById("originalDuration");
  const trimmedDuration = document.getElementById("trimmedDuration");
  const generateTrimmedGifBtn = document.getElementById(
    "generateTrimmedGifBtn"
  );

  // 필수 요소 없으면 중단
  if (!gifInput || !gifUploadSection || !trimCanvas) return;

  // 드래그 앤 드롭
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
    if (files.length > 0 && files[0].type === "image/gif") {
      handleGifFile(files[0]);
    }
  });

  gifUploadSection.addEventListener("click", () => {
    gifInput?.click();
  });

  // 파일 선택
  gifInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === "image/gif") {
      handleGifFile(file);
    }
  });

  // GIF 생성 버튼
  generateTrimmedGifBtn?.addEventListener("click", async () => {
    if (!frames || frames.length === 0) return;

    // 선택된 프레임만 추출
    const trimmedFrames = frames.slice(trimStartIndex, trimEndIndex + 1);

    if (trimOutput) trimOutput.innerHTML = "";
    if (trimDownloadLink) trimDownloadLink.style.display = "none";

    setProgressMessage("GIF 생성 중...");

    const original = generateTrimmedGifBtn.innerHTML;
    generateTrimmedGifBtn.innerHTML = `<span class="loading-spinner"></span> GIF 생성 중...`;
    generateTrimmedGifBtn.disabled = true;

    await generateTrimmedGIF(trimmedFrames);

    generateTrimmedGifBtn.innerHTML = original;
    generateTrimmedGifBtn.disabled = false;

    clearProgressMessage();
  });

  // ------------ 내부 함수들 ------------

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

  function clearProgressMessage() {
    // GIF 이미지가 표시되므로 메시지 제거는 generateTrimmedGIF에서 처리됨
  }

  async function handleGifFile(file) {
    setProgressMessage("GIF 파일을 분석 중...");

    // GIF에서 프레임 추출
    await extractFramesFromGif(file);

    // 결과 섹션 표시
    if (trimOutputSection) trimOutputSection.style.display = "block";

    // Trim 기능 초기화
    initTrimFeature();

    // 완료 후 스크롤
    setTimeout(() => {
      trimOutputSection?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 100);
  }

  async function extractFramesFromGif(file) {
    frames = [];

    // 브라우저가 ImageDecoder(WebCodecs)를 지원하는지 확인
    if (!("ImageDecoder" in window)) {
      alert(
        "이 브라우저는 GIF 프레임 추출( ImageDecoder )을 지원하지 않습니다. 최신 Chrome/Edge를 사용해주세요."
      );
      return;
    }

    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    const decoder = new ImageDecoder({
      data: uint8,
      type: "image/gif",
    });

    // 트랙 준비
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    const frameCount = track.frameCount;

    const ctx = trimCanvas.getContext("2d");

    for (let i = 0; i < frameCount; i++) {
      // i번째 프레임 디코딩
      const { image } = await decoder.decode({ frameIndex: i });

      // 첫 프레임에서 캔버스 크기 설정
      if (i === 0) {
        trimCanvas.width = image.displayWidth;
        trimCanvas.height = image.displayHeight;
      }

      // 프레임을 캔버스에 그려서 PNG Blob으로 저장
      ctx.clearRect(0, 0, trimCanvas.width, trimCanvas.height);
      ctx.drawImage(image, 0, 0, trimCanvas.width, trimCanvas.height);

      const blob = await new Promise((res) =>
        trimCanvas.toBlob(res, "image/png")
      );
      frames.push(blob);

      // ImageBitmap 리소스 해제
      if (typeof image.close === "function") {
        image.close();
      }
    }

    // 프레임 수 기준으로 길이/간격 계산 (일단 10fps 기준)
    frameInterval = 0.1; // 1 / 10fps
    gifDuration = frameCount * frameInterval;
  }

  function initTrimFeature() {
    if (!frames || frames.length === 0) return;

    // 캐시 초기화
    currentPreviewFrameIndex = -1;
    lastStartPercent = -1;
    lastEndPercent = -1;
    lastTrimmedLength = -1;
    previewFrameUrls.clear();

    // 슬라이더 컨테이너 표시
    const trimSliderContainer = document.getElementById("trimSliderContainer");
    if (trimSliderContainer) {
      trimSliderContainer.style.display = "block";
    }

    // 프레임 썸네일을 타임라인 트랙 배경으로 생성
    if (trimTimelineFrames) {
      trimTimelineFrames.innerHTML = "";

      frames.forEach((blob, index) => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(blob);
        img.alt = `Frame ${index}`;
        img.className = "timeline-frame-thumb";
        img.dataset.frameIndex = index;

        trimTimelineFrames.appendChild(img);
      });
    }

    // 초기 값 설정
    trimStartIndex = 0;
    trimEndIndex = frames.length - 1;

    // output 영역에 첫 프레임 표시
    showFramePreview(0);

    // UI 업데이트
    updateTrimUI(false);
  }

  function showFramePreview(frameIndex) {
    if (!trimOutput || !frames || frameIndex < 0 || frameIndex >= frames.length)
      return;

    // 같은 프레임이면 업데이트 생략
    if (currentPreviewFrameIndex === frameIndex) return;

    currentPreviewFrameIndex = frameIndex;

    // 프레임 URL 캐시 확인
    let frameUrl = previewFrameUrls.get(frameIndex);
    if (!frameUrl) {
      const frameBlob = frames[frameIndex];
      frameUrl = URL.createObjectURL(frameBlob);
      previewFrameUrls.set(frameIndex, frameUrl);
    }

    // 기존 이미지 요소가 있으면 src만 변경
    let frameImg = trimOutput.querySelector("#trimOutputGif");
    if (frameImg) {
      frameImg.src = frameUrl;
      frameImg.alt = `Frame ${frameIndex}`;
    } else {
      // 없으면 새로 생성
      frameImg = document.createElement("img");
      frameImg.src = frameUrl;
      frameImg.alt = `Frame ${frameIndex}`;
      frameImg.id = "trimOutputGif";
      trimOutput.innerHTML = "";
      trimOutput.appendChild(frameImg);
    }
  }

  function updateTrimUI(isDragging = false) {
    if (!trimTrack || !trimHandleStart || !trimHandleEnd || !trimSelected)
      return;

    const totalFrames = frames.length;
    if (totalFrames === 0) return;

    const startPercent = (trimStartIndex / totalFrames) * 100;
    const endPercent = (trimEndIndex / totalFrames) * 100;

    // 핸들 위치 업데이트 (변경된 경우에만)
    if (lastStartPercent !== startPercent) {
      trimHandleStart.style.left = `${startPercent}%`;
      lastStartPercent = startPercent;
    }

    if (lastEndPercent !== endPercent) {
      trimHandleEnd.style.left = `${endPercent}%`;
      lastEndPercent = endPercent;
    }

    // 선택된 영역 표시 (항상 업데이트 필요)
    trimSelected.style.left = `${startPercent}%`;
    trimSelected.style.width = `${endPercent - startPercent}%`;

    // 잘라낸 구간의 길이 계산
    const selectedFrameCount = trimEndIndex - trimStartIndex + 1;
    const trimmedLength = selectedFrameCount * frameInterval;

    // 드래그 중이 아닐 때만 텍스트 업데이트 (성능 최적화)
    if (!isDragging) {
      // 영상 길이 정보 업데이트 (초기화 시에만)
      if (
        originalDuration &&
        !originalDuration.textContent.includes(gifDuration.toFixed(1))
      ) {
        originalDuration.textContent = `${gifDuration.toFixed(1)}초`;
      }

      if (trimmedDuration && lastTrimmedLength !== trimmedLength) {
        trimmedDuration.textContent = `${trimmedLength.toFixed(1)}초`;
        lastTrimmedLength = trimmedLength;
      }
    }
  }

  async function generateTrimmedGIF(frameList) {
    const ctx = trimCanvas.getContext("2d");
    const imageDatas = [];

    for (const blob of frameList) {
      const img = await blobToImage(blob);
      ctx.drawImage(img, 0, 0, trimCanvas.width, trimCanvas.height);
      const imageData = ctx.getImageData(
        0,
        0,
        trimCanvas.width,
        trimCanvas.height
      );
      imageDatas.push(imageData);
    }

    const gifBuffer = await encode({
      frames: imageDatas,
      width: trimCanvas.width,
      height: trimCanvas.height,
      quality: 90,
      fps: 10,
    });

    const gifBlob = new Blob([gifBuffer], { type: "image/gif" });
    const gifUrl = URL.createObjectURL(gifBlob);

    const gifImg = document.createElement("img");
    gifImg.src = gifUrl;
    gifImg.alt = "Trimmed GIF";
    gifImg.id = "trimOutputGif";

    if (trimOutput) {
      trimOutput.innerHTML = "";
      trimOutput.appendChild(gifImg);
    }
    if (trimDownloadLink) {
      trimDownloadLink.href = gifUrl;
      trimDownloadLink.style.display = "inline-block";
    }
  }

  function blobToImage(blob) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(blob);
    });
  }

  // Trim 핸들 드래그
  if (trimHandleStart) {
    trimHandleStart.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isDraggingTrimHandle = true;
      activeTrimHandle = "start";
    });
  }

  if (trimHandleEnd) {
    trimHandleEnd.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isDraggingTrimHandle = true;
      activeTrimHandle = "end";
    });
  }

  // 타임라인 트랙 클릭 시 프레임 미리보기
  if (trimTrack) {
    trimTrack.addEventListener("click", (e) => {
      // 핸들 클릭이 아닌 경우에만 처리
      if (isDraggingTrimHandle) return;

      const rect = trimTrack.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const frameIndex = Math.round((percent / 100) * (frames.length - 1));

      // 클릭한 위치의 프레임 미리보기
      if (frames && frameIndex >= 0 && frameIndex < frames.length) {
        showFramePreview(frameIndex);
      }
    });
  }

  document.addEventListener("mousemove", (e) => {
    if (!isDraggingTrimHandle || !trimTrack) return;

    const rect = trimTrack.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const frameIndex = Math.round((percent / 100) * (frames.length - 1));

    if (activeTrimHandle === "start") {
      trimStartIndex = Math.min(frameIndex, trimEndIndex - 1);
      // 시작 핸들 드래그 시 해당 프레임 미리보기
      showFramePreview(trimStartIndex);
    } else if (activeTrimHandle === "end") {
      trimEndIndex = Math.max(frameIndex, trimStartIndex + 1);
      // 끝 핸들 드래그 시 해당 프레임 미리보기
      showFramePreview(trimEndIndex);
    }

    // 드래그 중이므로 텍스트 업데이트 생략
    updateTrimUI(true);
  });

  document.addEventListener("mouseup", () => {
    if (isDraggingTrimHandle) {
      isDraggingTrimHandle = false;
      activeTrimHandle = null;

      // 드래그 종료 후 최종 텍스트 업데이트
      updateTrimUI(false);
    }
  });

  // 페이지 전역 드래그 방지
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
});
