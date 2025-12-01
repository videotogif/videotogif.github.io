// /darkmode-toggle.js
(function () {
  var KEY = "zif-theme"; // 'dark' | 'light' | null
  var root = document.documentElement;
  var btn = document.querySelector(".site-footer .dark-mode-toggle");

  function getSaved() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function setSaved(v) {
    try {
      if (v === null) {
        localStorage.removeItem(KEY);
      } else {
        localStorage.setItem(KEY, v);
      }
    } catch (e) {}
  }

  var media = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  function currentMode() {
    var saved = getSaved();
    if (saved === "dark" || saved === "light") return saved; // 사용자 고정
    return media && media.matches ? "dark" : "light"; // 시스템 추종
  }

  function apply(mode) {
    if (mode === "dark") root.classList.add("dark-mode");
    else root.classList.remove("dark-mode");
    // 버튼 라벨(선택): Dark/Light 텍스트 갱신
    if (btn) {
      var text = btn.querySelector("span:last-child");
      var icon = btn.querySelector(".icon");
      if (text) text.textContent = mode === "dark" ? "Dark" : "Light";
      if (icon) icon.textContent = mode === "dark" ? "🌙" : "☀️";
    }
  }

  // 초기 적용(초기 스니펫이 해줬지만, 버튼 라벨 갱신을 위해 한 번 더 보정)
  apply(currentMode());

  // ✅ 시스템 선호가 바뀌면, "사용자 고정 선택이 없을 때"만 자동 반영
  if (media && media.addEventListener) {
    media.addEventListener("change", function (e) {
      var saved = getSaved();
      if (saved === null) {
        apply(e.matches ? "dark" : "light");
      }
    });
  } else if (media && media.addListener) {
    // Safari 구버전 호환
    media.addListener(function (e) {
      var saved = getSaved();
      if (saved === null) {
        apply(e.matches ? "dark" : "light");
      }
    });
  }

  // 버튼 클릭: 사용자 고정 토글 (시스템 무시)
  if (btn) {
    btn.addEventListener("click", function () {
      var mode = currentMode();
      var next = mode === "dark" ? "light" : "dark";
      setSaved(next); // 사용자 고정 저장
      apply(next);
    });

    // 옵션: Shift+클릭 → 사용자 고정 해제(= 시스템 추종으로 복귀)
    btn.addEventListener("click", function (e) {
      if (e.shiftKey) {
        setSaved(null); // 고정 해제 → 시스템 추종
        apply(currentMode()); // 즉시 시스템 기준으로 반영
      }
    });
  }
})();
