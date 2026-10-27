---
name: sonarqube-analysis
description: >-
  SonarQube 정적 코드 분석 실행, 품질 게이트(Quality Gate) 상태 조회,
  신규 코드 스멜, 버그 및 보안 취약점(OWASP/CWE) 점검을 수행하는 스킬.
  트리거: SonarQube 분석, 소나큐브 점검, Quality Gate 확인, 코드 스멜 분석, sonar-scanner, sonarqube.
---

# SonarQube Analysis & Quality Gate Review

본 스킬은 SonarQube 서버 및 CLI(`sonar-scanner`, Gradle/Maven 플러그인)와 연동하여 소스 코드의 품질 게이트 상태를 평가하고, 신규 도입된 결함과 기술 부채를 수술적으로 해결하는 표준 엔지니어링 절차를 제공합니다.

---

## 1. 사전 환경 확인 (Prerequisites)

1. **환경 변수 점검**:
   - `SONAR_HOST_URL` (예: `https://sonar.mycompany.com` 또는 `http://localhost:9000`)
   - `SONAR_TOKEN` (인증용 User/Project Token)
2. **프로젝트 설정 파일 확인**:
   - 루트의 `sonar-project.properties`, `build.gradle`, 또는 `pom.xml` 내 Sonar 설정 확인.

---

## 2. 3단계 분석 워크플로우 (Execution Workflow)

### Step 1: SonarQube 분석 실행
프로젝트 빌드 도구에 맞춰 정적 분석을 구동합니다:

```bash
# 1. Gradle 기반 프로젝트:
./gradlew sonar \
  -Dsonar.host.url="${SONAR_HOST_URL}" \
  -Dsonar.token="${SONAR_TOKEN}"

# 2. Maven 기반 프로젝트:
./mvnw sonar:sonar \
  -Dsonar.host.url="${SONAR_HOST_URL}" \
  -Dsonar.token="${SONAR_TOKEN}"

# 3. 범용 sonar-scanner CLI:
sonar-scanner \
  -Dsonar.host.url="${SONAR_HOST_URL}" \
  -Dsonar.token="${SONAR_TOKEN}"
```

### Step 2: Quality Gate 및 이슈 조회 (REST API)
분석 완료 후 대시보드 API를 호출해 상태를 수집합니다:

```bash
# 1. Quality Gate 판정 결과 확인:
curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/qualitygates/project_status?projectKey=${PROJECT_KEY}" | jq .

# 2. 신규 발생 Blocker / Critical 이슈 조회:
curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/issues/search?projectKeys=${PROJECT_KEY}&resolved=false&severities=BLOCKER,CRITICAL&types=BUG,VULNERABILITY" | jq .

# 3. 핵심 메트릭 (Coverage, Duplications) 조회:
curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/measures/component?component=${PROJECT_KEY}&metricKeys=coverage,duplicated_lines_density,cognitive_complexity,sqale_index" | jq .
```

### Step 3: 취약점 분석 및 리팩토링 제안
- **이슈 분류**: Bug, Vulnerability, Code Smell, Security Hotspot 분리.
- **영향도 평가**: Blocker/Critical 이슈를 최우선으로 수정 대상 지정.
- **수술적 코드 수정**: 비즈니스 로직 변경 없이 인지 복잡도 축소 및 중복 제거.
