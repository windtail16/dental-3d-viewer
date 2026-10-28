# Dental 3D Viewer

치과 STL 모델(구강 스캔, 임플란트·보철 CAD 등)을 브라우저에서 확인하는 3D 뷰어입니다.
Three.js(React Three Fiber) 학습을 실제 도메인 문제에 적용해 보기 위해 만든 개인 프로젝트입니다.

**데모:** https://windtail16.github.io/dental-3d-viewer/

## 기능

- **STL 열기**: 바이너리·ASCII STL 지원, 드래그 앤 드롭. 파일은 브라우저 안에서만 처리
- **자동 정렬**: Z-up → Y-up 변환, 원점 중심 정렬, 모델 크기에 맞춘 카메라 배치
- **모델 정보**: 삼각형 수, 바운딩 박스 크기(mm)
- **보기**: 기본/정면/상면/측면 프리셋, 회전·확대·이동(OrbitControls), 축 기즈모
- **재질**: 티타늄·지르코니아·레진·스캔 블루 프리셋, 와이어프레임
- **단면 보기**: X/Y/Z 축 클리핑 평면, 위치 슬라이더, 방향 전환. 뒷면을 별도 색으로 렌더링해 잘린 단면을 표현
- **거리 측정**: 모델 표면 두 점을 레이캐스팅으로 선택해 mm 단위 거리 표시, 다중 측정·개별 삭제

## 기술 스택

React 19 · TypeScript · Vite · Three.js · @react-three/fiber · @react-three/drei

## 구현 메모

- `src/lib/loadStl.ts`: STLLoader 파싱 후 `mergeVertices` + `computeVertexNormals`로 스무스 셰이딩, 바운딩 박스 기준 센터링
- `src/components/Viewer.tsx`: `localClippingEnabled` + `clippingPlanes`로 단면, `BackSide` 메시로 단면 색 표현, R3F 포인터 이벤트(`e.point`)로 측정점 선택, 드래그와 클릭 구분(`e.delta`)
- `scripts/generate-sample.mjs`: 샘플 모델(나사산 픽스처 + 육각 어버트먼트)을 수식으로 생성해 Binary STL로 저장

## 실행

```bash
npm install
npm run dev
```

## 배포

`main` 브랜치에 푸시하면 GitHub Actions가 빌드해 GitHub Pages에 배포합니다.
(저장소 Settings → Pages → Source를 **GitHub Actions**로 설정)
