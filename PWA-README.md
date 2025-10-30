# ODDIYA PWA 배포 가이드

## 🚀 PWA 기능

ODDIYA는 이제 Progressive Web App (PWA)로 변환되었습니다!

### ✨ 주요 PWA 기능

1. **앱 설치**: 홈 화면에 앱 아이콘 추가 가능
2. **오프라인 지원**: Service Worker를 통한 캐싱
3. **네이티브 앱 경험**: 독립적인 앱 창에서 실행
4. **푸시 알림**: (향후 구현 예정)
5. **백그라운드 동기화**: (향후 구현 예정)

## 📱 설치 방법

### 모바일 (Android/iOS)
1. 브라우저에서 앱에 접속
2. "홈 화면에 추가" 또는 "앱 설치" 프롬프트 확인
3. "설치" 버튼 클릭
4. 홈 화면에 ODDIYA 아이콘이 생성됨

### 데스크톱 (Chrome/Edge)
1. 주소창 오른쪽의 "설치" 아이콘 클릭
2. "설치" 버튼 클릭
3. 독립적인 앱 창에서 실행

## 🛠️ 기술 스택

- **PWA 라이브러리**: `next-pwa`
- **Service Worker**: Workbox 기반
- **캐싱 전략**: 
  - 정적 자산: CacheFirst
  - API 요청: NetworkFirst
  - 이미지: StaleWhileRevalidate

## 📦 빌드 및 배포

### 로컬 개발
```bash
npm run dev
```

### PWA 빌드
```bash
npm run build
```

### PWA 실행
```bash
npm start
```

### 아이콘 생성
```bash
npm run generate-icons
```

## 🔧 PWA 설정 파일

### 1. `next.config.js`
- PWA 설정 및 캐싱 전략
- Service Worker 등록

### 2. `public/manifest.json`
- 앱 메타데이터
- 아이콘 및 테마 설정
- 단축키 정의

### 3. `public/sw.js`
- Service Worker (자동 생성)
- 오프라인 캐싱 로직

### 4. `src/components/PWAInstallPrompt.tsx`
- 설치 프롬프트 컴포넌트
- 사용자 설치 유도

## 📱 지원 브라우저

- **Chrome**: 완전 지원
- **Edge**: 완전 지원
- **Firefox**: 기본 지원
- **Safari**: iOS 11.3+ 지원
- **Samsung Internet**: 완전 지원

## 🎨 아이콘 및 테마

### 아이콘 크기
- 16x16, 32x32, 72x72, 96x96
- 128x128, 144x144, 152x152
- 192x192, 384x384, 512x512

### 테마 색상
- **Primary**: #00FFAA (연한 녹색)
- **Background**: #CEF8DE (연한 민트)
- **Text**: #333 (진한 회색)

## 🚀 배포 플랫폼

### Vercel (권장)
```bash
vercel --prod
```

### Netlify
```bash
npm run build
# dist 폴더를 Netlify에 업로드
```

### GitHub Pages
```bash
npm run build
# out 폴더를 GitHub Pages에 업로드
```

## 🔍 PWA 테스트

### Chrome DevTools
1. F12 → Application 탭
2. Manifest 섹션에서 설정 확인
3. Service Workers 섹션에서 등록 상태 확인
4. Storage 섹션에서 캐시 확인

### Lighthouse
1. F12 → Lighthouse 탭
2. "Progressive Web App" 체크
3. "Generate report" 클릭
4. PWA 점수 확인 (90+ 목표)

## 📊 성능 최적화

### 캐싱 전략
- **정적 자산**: 1년 캐시
- **API 응답**: 24시간 캐시
- **이미지**: 24시간 캐시
- **폰트**: 1년 캐시

### 번들 크기
- **First Load JS**: ~96.7 kB
- **PWA 오버헤드**: ~2-3 kB
- **Service Worker**: ~15-20 kB

## 🐛 문제 해결

### Service Worker 등록 실패
- HTTPS 환경에서만 작동
- localhost는 예외적으로 HTTP 허용

### 설치 프롬프트가 나타나지 않음
- 브라우저가 PWA를 지원하는지 확인
- 이미 설치된 경우 표시되지 않음

### 오프라인에서 작동하지 않음
- Service Worker가 등록되었는지 확인
- 캐시된 리소스가 있는지 확인

## 📈 향후 개선 사항

1. **푸시 알림**: 여행 일정 알림
2. **백그라운드 동기화**: 오프라인 데이터 동기화
3. **오프라인 모드**: 완전한 오프라인 지원
4. **앱 업데이트**: 자동 업데이트 알림
5. **데이터 압축**: 더 효율적인 캐싱

## 🎉 완료!

ODDIYA가 성공적으로 PWA로 변환되었습니다! 
사용자들은 이제 앱을 설치하여 더 나은 모바일 경험을 즐길 수 있습니다.
