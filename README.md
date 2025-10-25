# 🎬 Safe Video to GIF Converter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Jekyll](https://img.shields.io/badge/Jekyll-4.0+-red.svg)](https://jekyllrb.com/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-Enabled-blue.svg)](https://webassembly.org/)

> 브라우저에서 100% 로컬로 동작하는 프리미엄 Video to GIF 변환기

![메인 인터페이스](https://github.com/user-attachments/assets/532f635a-1226-4d03-a5b3-6066d260cff7)
[https://yourdomain.com](videotogif.github.io) <br> <br>
ZIF는 서버 업로드 없이 완전히 클라이언트 측에서 동작하는 동영상 GIF 변환 서비스입니다. <br>
개인정보 보호를 최우선으로 하며, WebAssembly 기술을 활용하여 고품질 GIF를 빠르게 생성합니다.

## ✨ 주요 기능

- 🔒 **완벽한 프라이버시**: 모든 변환이 브라우저에서 로컬로 처리되어 서버 업로드가 전혀 없습니다
- ⚡ **빠른 처리**: WebAssembly 기반 고성능 GIF 인코딩
- 🎨 **세밀한 제어**: 프레임 간격, 크기, 품질, FPS 등을 자유롭게 조정
- 💎 **고품질 결과물**: gifski-wasm 라이브러리를 사용한 선명한 GIF 생성
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 모두 지원
- 🌓 **다크모드**: 시스템 설정에 따른 자동 전환 및 수동 토글




### GIF 변환 결과
![Image](https://github.com/user-attachments/assets/1564a18e-4274-4e9a-a7a1-6b1dc42078dd)


## 📦 설치 및 실행

### 필수 조건
- Ruby 2.7 이상
- Jekyll 4.0 이상
- Node.js (선택사항, 개발 도구용)

### 로컬 개발 환경 설정

1. **저장소 클론**
```bash
git clone https://github.com/yourusername/zif.git
cd zif
```

2. **의존성 설치**
```bash
bundle install
```

3. **개발 서버 실행**
```bash
bundle exec jekyll serve
```

4. **브라우저에서 열기**
```
http://localhost:4000
```

### 프로덕션 빌드

```bash
JEKYLL_ENV=production bundle exec jekyll build
```

빌드된 파일은 `_site` 디렉토리에 생성됩니다.


## 🎯 사용 방법

### 기본 사용법

1. **비디오 업로드**
   - 변환하고 싶은 동영상 파일을 드래그 & 드롭하거나 클릭하여 선택합니다.

2. **프레임 확인**
   - 자동으로 추출된 프레임을 미리보기로 확인합니다.

3. **설정 조정 (선택사항)**
   - 고급 설정에서 프레임 간격, 크기, 품질, FPS를 원하는 대로 조정합니다.

4. **GIF 다운로드**
   - 생성된 GIF를 확인하고 다운로드 버튼을 클릭합니다.

### 고급 설정

- **프레임 간격**: 0.1초 ~ 5초 (기본값: 0.3초)
- **출력 크기**: 최대 1920px (기본값: 420px)
- **품질**: 1 ~ 100 (기본값: 90)
- **FPS**: 1 ~ 60 (기본값: 10)

## 🔧 커스터마이징



### 다국어 지원 추가

`assets/js/main.js`의 `translations` 객체에 새로운 언어를 추가할 수 있습니다:

```javascript
const translations = {
  ko: { /* 한국어 */ },
  en: { /* 영어 */ },
  ja: { /* 일본어 추가 */ }
};
```

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.


## 🗺️ 로드맵

- [ ] 배치 변환 지원 (여러 비디오 동시 처리)
- [ ] GIF 편집 기능 (자르기, 회전, 필터)
- [ ] 비디오 트리밍 기능
- [ ] WebP 포맷 지원
- [ ] PWA 지원
- [ ] 텍스트/스티커 추가 기능

## ❓ FAQ

### Q: 어떤 비디오 포맷을 지원하나요?
A: MP4, MOV, AVI, WebM 등 브라우저가 지원하는 모든 비디오 포맷을 지원합니다.

### Q: 파일 크기 제한이 있나요?
A: 서버 업로드가 없으므로 파일 크기 제한은 없지만, 브라우저 메모리에 따라 제한될 수 있습니다.

### Q: 생성된 GIF는 어디에 저장되나요?
A: 모든 처리가 브라우저에서 이루어지므로 서버에는 아무것도 저장되지 않습니다. 생성된 GIF는 다운로드하여 로컬에 저장됩니다.

### Q: 모바일에서도 작동하나요?
A: 네, 모바일 브라우저에서도 작동하지만 대용량 비디오 처리 시 성능이 제한될 수 있습니다.

---

⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요!
