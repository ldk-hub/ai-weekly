---
name: ai-weekly-vault
description: "AI위클리(ai-weekly) 프로젝트의 과거 작업 이력, 시스템 아키텍처, 큐레이션 히스토리 및 파이프라인 명세를 옵시디언 볼트(Windows: C:\\Users\\ok601\\OneDrive\\문서\\Obsidian Vault\\ai-weekly)에서 조회·참조하고, 작업 후 동기화하는 스킬. 트리거: ai-weekly 히스토리, 옵시디언 이력 참조, 과거 작업 확인, sync:obsidian"
---

# AI Weekly Obsidian Vault — 히스토리 및 명세 참조 스킬

이 스킬은 AI위클리 프로젝트의 모든 과거 작업 이력과 시스템 명세가 보관된 **옵시디언 볼트(`C:\Users\ok601\OneDrive\문서\Obsidian Vault\ai-weekly`)**를 에이전트가 능동적으로 읽고 참조하며, 새로운 작업 완료 시 최신 상태로 동기화하는 표준 워크플로우를 정의합니다.

---

## 📂 옵시디언 볼트 저장소 위치 및 구조

- **Windows 기본 경로:** `C:\Users\ok601\OneDrive\문서\Obsidian Vault\ai-weekly` (macOS 레거시 병기: `/Users/nhn/Documents/Obsidian Vault/ai-weekly`)

```text
C:\Users\ok601\OneDrive\문서\Obsidian Vault\ai-weekly\
├── README.md (프로젝트 총괄 대시보드 및 Mermaid 아키텍처)
├── AI위클리 개요 및 시스템 대시보드.md
│
├── 01. 시스템 아키텍처 및 파이프라인/
│   ├── 01-cc-news 데일리 뉴스 파이프라인.md
│   ├── 02-cc-star 오픈소스 스타보드 파이프라인.md
│   ├── 03-cc-trends 주간 트렌드 인덱싱.md
│   └── 04-giscus 라운지 및 커뮤니티 연동.md
│
└── 02. 작업 일지 (Work Logs)/
    └── YYYY-MM-DD 작업일지.md
```

---

## 🔍 언제 옵시디언 볼트를 참조하는가?

1. **과거 작업 맥락 및 히스토리 확인:**
   - 이전 세션에서 구현된 기능의 배경과 커밋 해시를 확인할 때 `02. 작업 일지 (Work Logs)/` 내의 해당 일자 일지 조회
2. **파이프라인 하드 룰 및 규격 재확인:**
   - `cc-news`, `cc-star`, `cc-trends` 작업 시 세부 작성 규칙과 검증 조건 확인 (`01. 시스템 아키텍처 및 파이프라인/`)
3. **사용자가 과거 진행 상황을 질문할 때:**
   - 특정 기능의 도입 일자나 결정 사항을 정확한 근거와 함께 답변할 때

---

## 🛠️ 참조 및 조회 방법

에이전트는 `read_file` 또는 PowerShell(`Get-Content -Encoding UTF8`, `Select-String`)을 통해 옵시디언 문서를 직접 읽을 수 있습니다:

```powershell
# 특정 날짜의 작업 일지 조회
Get-Content "C:\Users\ok601\OneDrive\문서\Obsidian Vault\ai-weekly\02. 작업 일지 (Work Logs)\2026-11-08 작업일지.md" -Encoding UTF8

# 시스템 대시보드 및 아키텍처 조회
Get-Content "C:\Users\ok601\OneDrive\문서\Obsidian Vault\ai-weekly\README.md" -Encoding UTF8
```

---

## 🔄 작업 완료 후 옵시디언 볼트 동기화 (필수)

새로운 데일리 뉴스 배포, 대규모 리팩토링, 또는 신규 기능 개발 완료 후에는 옵시디언 볼트에도 해당 작업 내역을 반영합니다:

```powershell
# 1. 옵시디언 볼트 동기화 스크립트 실행
npm run sync:obsidian
# 또는
node scripts/obsidian_export.js
```
