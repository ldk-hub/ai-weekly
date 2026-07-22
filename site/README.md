<div align="center">

# AI위클리 (사이트 뷰어)

**이 문서는 AI위클리 웹사이트(프론트엔드) 빌드 및 개발 환경에 대한 안내입니다.** <br>
전체 아키텍처 및 데이터 수집 파이프라인은 [루트 README](../README.md)를 참고하세요.

</div>

---

## 개요
이 폴더는 수집된 뉴스 및 인기 플러그인 데이터를 화면에 보여주는 정적(Static) 웹사이트 소스 코드를 담고 있습니다. 별도의 프레임워크나 빌드 도구를 거치지 않는 가벼운 구조를 채택했습니다.

## 기술 스택
- **언어**: HTML5, Vanilla JavaScript, CSS3
- **데이터소스**: 정적 JSON 단일 파일
  - 뉴스: `public/data/news_latest.json`
  - 플러그인: `public/data/latest.json`
- **호스팅**: GitHub Pages (무료, HTTPS 자동)

## 로컬 실행 및 프리뷰
별도의 노드 서버나 빌드 과정 없이 정적 파일 서버만 띄우면 바로 테스트할 수 있습니다.

```bash
# 루트 디렉토리에서 실행
python3 -m http.server 8000 --directory site
```
실행 후 브라우저에서 `http://localhost:8000`으로 접속하여 확인합니다.

## 폴더 상세 구조
```
site/
├── index.html       # 메인 뷰어
├── styles.css       # 스타일 정의
├── script.js        # 데이터 로드 및 렌더링 로직
└── public/
    └── data/
        ├── latest.json        # 플러그인 최신 데이터
        ├── news_latest.json   # 뉴스 최신 데이터
        └── archive/           # 주차별 렌더링 스냅샷 보존
```

## 기여 및 기타
사이트 디자인 개선, 버그 수정 등을 위한 기여는 언제든 환영합니다.
전체 파이프라인이나 데이터 수집 방식 관련 이슈는 프로젝트 루트에 위치한 [루트 README](../README.md)를 참고해 주시기 바랍니다.
