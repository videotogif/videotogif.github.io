# 🎬 Video to GIF

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-gifski-blue.svg)](https://gif.ski)

**브라우저 안에서 끝나는 무료 동영상 GIF 변환기**
**A free video to GIF converter that runs entirely in your browser — no upload.**

👉 https://videotogif.github.io · [English](https://videotogif.github.io/en/)

![메인 인터페이스](https://github.com/user-attachments/assets/532f635a-1226-4d03-a5b3-6066d260cff7)

동영상을 서버에 올리지 않고, 지금 쓰고 있는 브라우저 안에서 GIF로 바꿉니다.
GIF 인코더는 색감이 좋기로 유명한 [gifski](https://gif.ski)를 WebAssembly로 컴파일한 버전을 씁니다.

## ✨ 기능

- 🔒 **업로드 없음**: 영상과 GIF가 내 기기를 떠나지 않습니다 ([직접 확인하는 법](https://videotogif.github.io/%EA%B8%B0%EC%88%A0%20%EC%84%A4%EB%AA%85/2025/12/08/webassembly-gif-conversion/))
- 💎 **좋은 색감**: gifski 인코더 (장면마다 팔레트를 따로 잡아 256색 한계 안에서도 색을 살림)
- 🎛️ **자동 설정**: 영상 길이·해상도에 맞춰 설정을 정하고, 저사양~고사양 5단계 눈금으로 선택 (항상 원본 속도, 긴 쪽 최대 900px)
- ✏️ **글자 넣기**: 캡션/워터마크를 넣고 끌어서 위치 조정
- ✂️ **GIF 자르기**: 만든 GIF에서 원하는 구간만 남기기 (원본 재생 속도 유지)
- 📱 **모바일 지원**, 🌓 **다크 모드**, 🇰🇷/🇺🇸 **한국어·영어**

## 🎯 사용 방법

1. 동영상을 끌어다 놓거나 눌러서 고르면 이 영상에 맞춘 설정으로 GIF가 바로 만들어집니다.
2. 필요하면 화질 눈금을 저사양~고사양 사이에서 옮깁니다. 놓는 순간 다시 만들어집니다.
3. GIF 다운로드로 저장하고, 필요하면 GIF 자르기에서 구간을 줄입니다.

설정값이 무엇을 바꾸는지는 [설정 정리 글](https://videotogif.github.io/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/2025/10/30/gif-settings-guide/)에 같은 영상으로 비교해 두었습니다.
(자동 설정은 항상 프레임 간격 × FPS = 1로 맞춰 원본 속도를 지키고, 긴 영상은 메모리 예산에 맞춰 FPS → 크기 순으로 낮춥니다.)

## 🛠 로컬에서 실행

```bash
git clone https://github.com/videotogif/videotogif.github.io.git
cd videotogif.github.io
bundle install
bundle exec jekyll serve
# http://localhost:4000
```

- GitHub Pages(legacy 빌드)로 배포되며, `main` 브랜치에 push하면 반영됩니다.
- 광고(AdSense)와 방문 통계(Google 애널리틱스)는 `JEKYLL_ENV=production` 빌드에서만 로드됩니다.
- 한/영 페이지는 front matter의 같은 `ref` 값으로 짝지어지고, 언어 토글과 hreflang이 자동으로 연결됩니다.

## 🗺️ 로드맵

- [x] GIF 자르기
- [x] 텍스트 추가
- [x] 한국어 / 영어
- [ ] 정사각형·세로형 비율 프리셋
- [ ] 여러 파일 한 번에 변환
- [ ] GIF 합치기
- [ ] WebP 출력

## 📝 라이선스

- 이 사이트를 위해 작성한 코드는 [MIT 라이선스](LICENSE)입니다.
- GIF 인코더 `assets/wasm/gifski-wasm/`은 **AGPL-3.0-or-later**를 따릅니다.
- 블로그 글(`_posts/`), 이미지(`assets/img/`), "Video to GIF" 이름과 로고는 MIT에 포함되지 않습니다. 재사용하려면 먼저 문의해 주세요.

문의: ghdalswl162@gmail.com · 이 프로젝트가 도움이 되었다면 ⭐ 부탁드려요!
