# SonarQube Clean Code & Quality Gate Rules

본 규칙은 SonarQube 플러그인이 활성화된 동안 에이전트가 코드를 작성하거나 리팩토링할 때 준수해야 하는 정적 분석 및 품질 기준을 정의합니다.

---

## 1. 품질 게이트 (Quality Gate) 필수 기준

1. **신규 코드(New Code) 제로 이슈 원칙**:
   - 새로 작성되거나 수정된 라인에서 신규 `Blocker`, `Critical`, `Major` 수준의 Bug 및 Vulnerability가 0건이어야 합니다.
2. **인지 복잡도 (Cognitive Complexity) 제한**:
   - 단일 메서드/함수의 인지 복잡도는 **15 이하**를 유지합니다. 복잡한 중첩 루프/조건문은 의도가 명확한 서브 루틴으로 조기 반환(Early Return) 리팩토링합니다.
3. **코드 중복률 (Duplicated Lines)**:
   - 신규 추가된 코드 블록의 중복률은 **3.0% 미만**이어야 합니다. 10줄 이상의 중복 로직은 공통 유틸이나 도메인 서비스로 추출합니다.
4. **테스트 커버리지 (Coverage)**:
   - 신규 비즈니스 로직에 대해 단위 테스트(Unit Test)를 작성하여 최소 커버리지 기준을 충족해야 합니다.

---

## 2. 보안 취약점 (Security & OWASP) 방어 규칙

1. **SQL Injection 방지**:
   - 동적 SQL 구성 시 문자열 연결(String Concatenation)을 절대 금지하며, Named Parameter 바인딩 또는 QueryDSL 타입 세이프 쿼리를 사용합니다.
2. **암호화 및 난수 생성**:
   - 취약한 알고리즘(`MD5`, `SHA-1`, `DES`) 사용을 금지하고, `AES-256-GCM`, `BCrypt`, `PBKDF2`, `SecureRandom`을 사용합니다.
3. **리소스 누수 방지 (Resource Leaks)**:
   - `InputStream`, `Connection`, `Statement` 등 I/O 리소스는 항상 `try-with-resources` 블록으로 자동 해제되도록 작성합니다.
