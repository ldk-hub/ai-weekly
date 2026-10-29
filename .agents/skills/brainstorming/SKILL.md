---
name: brainstorming
description: "Interactive design and exploration skill. Use ONLY when the user explicitly asks to brainstorm, explore design ideas, or requests alternatives. NEVER trigger automatically for routine coding, feature requests, or bug fixes."
---

# Brainstorming & Design Exploration

Turn open-ended ideas into clear, actionable designs when explicitly requested by the user.

> [!IMPORTANT]
> **자율 우선 실행 원칙 (Autonomous-First)**
> 일반적인 코딩, 버그 수정, 리팩토링, 신규 기능 추가 요청 시에는 이 스킬을 자동으로 호출하여 질문을 던지지 않습니다.
> 불명확한 점이 있더라도 최선의 권장안(Best Practice) 1가지를 자체 채택하여 끝까지 구현·검증 후 사후 보고합니다(Do-First, Report-Later).

---

## 사용 시점 (When to Use)

- 사용자가 명시적으로 `/brainstorming`, "아이디어 브레인스토밍해줘", "대안을 비교해줘"라고 요청한 경우에만 실행합니다.
- 사용자가 명시적 요청 없이 기능 구현을 지시한 경우에는 본 스킬의 승인 단계를 모두 건너뛰고(Bypass) 즉시 구현으로 직행합니다.

---

## 프로세스 (명시적 요청 시)

1. **컨텍스트 확인**: 관련 파일 및 기존 패턴을 먼저 확인합니다.
2. **핵심 권장안 중심 제시**: 장단점을 나열해 결정을 사용자에게 떠넘기지 않고, 가장 추천하는 최적의 설계안 1가지를 중심으로 명확히 제시합니다.
3. **신속한 구현 전환**: 사용자가 동의하거나 추가 질문이 없으면 즉시 구현으로 전환합니다.
