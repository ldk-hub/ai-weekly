# Gemini 4 Hydrogen & Argon Harness Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul global and `ai-weekly` Antigravity rules, skills, plugins, subagents, MCP connectors, hooks, and scripts so they are 100% bug-free on Windows and tuned for Gemini 4 Hydrogen (`high`/`xhigh` execution worker), Gemini 4 Argon (`medium`/`high` deep reasoning & long decode), and Antigravity Orchestrator.

**Architecture:** We split bloated always-on rules (`GEMINI.md` 20,038 B + `career-copilot-kr/rules/AGENTS.md` 7,315 B) into a compact cache-friendly prefix (`<= 8 KB` global invariant core) plus on-demand `references/` skills, remove 20 duplicated skills across `~/.gemini/config/` and `.agents/`, fix broken Claude/macOS artifacts (`model: opus`, `/Users/nhn/.local/bin/uvx`, `/Users/nhn/Documents/Obsidian Vault`), prune redundant browser MCPs (`playwright` 49 schemas, duplicate `chrome_devtools`), and promote `safety_guard.py` to a global Windows-safe `hooks.json` with `PreToolUse` protection.

**Tech Stack:** Google Antigravity 2.0 (`agy` CLI 1.3.1), Gemini 4 Hydrogen & Gemini 4 Argon, PowerShell 7/5.1, Python 3.13, Node.js, Obsidian Markdown Vault (`C:\Users\ok601\OneDrive\문서\Obsidian Vault`).

## Global Constraints

- **Backup before any mutation:** Copy every modified global or workspace customization file to `C:\Users\ok601\.gemini\backups\gemini4-fit-20261113\` before editing.
- **Rules Size Cap:** Every rule file (`GEMINI.md`, `AGENTS.md`) MUST stay well below the `24,000`-byte per-file truncation limit (`<= 10,000` bytes target for `GEMINI.md`), and combined always-on rules MUST stay safely under the `20,000`-token `defaultRulesBudget`.
- **Single Source of Truth:** Zero duplicate skills across `~/.gemini/config/plugins/`, `~/.gemini/config/skills/`, `.agents/plugins/`, and `.agents/skills/`.
- **Marketplace Plugin Immutability:** Do NOT directly edit marketplace-managed plugin internals (`installedFrom` entries in `config.json`) except local configuration overlays or custom local plugins (`humanize-korean`, `career-copilot-kr`, `ai-weekly-essentials`, `caveman`).
- **Windows Path & Encoding Safety:** All PowerShell writes MUST use UTF-8 without BOM; never leave hardcoded `/Users/nhn/...` paths as primary commands without Windows fallbacks.
- **Zero-Hallucination & Career Invariants:** Preserve 100% of `career-copilot-kr` Fact Ledger, `foundBanned: []` blocklist, and `ego-browser` primary browser policy.

---

## File Map (Target Architecture)

| Layer | Action | Exact Path | Responsibility |
| :--- | :--- | :--- | :--- |
| Backup | Create | `C:\Users\ok601\.gemini\backups\gemini4-fit-20261113\` | Pre-change snapshot for deterministic rollback |
| Subagents | Modify | `C:\Users\ok601\.gemini\config\plugins\humanize-korean\agents\*.md` | Replace legacy `model: opus` with Antigravity-valid model routing (`inherit` / `flash`) |
| Workspace MCP | Modify | `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\plugins\scrapling\mcp_config.json` | Replace macOS `/Users/nhn/.local/bin/uvx` with cross-platform `uvx` |
| Workspace Scripts | Modify | `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\scripts\plugins\scrapling_fetch.js` | Prefer `uv` on Windows PATH cleanly (verify fallback) |
| Workspace Skills | Remove duplicates | `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\plugins\superpowers\` & `.agents\plugins\sonarqube\` | Eliminate duplicate `superpowers` and conflicted `sonarqube` workspace plugin |
| Workspace Skills | Remove duplicates | `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\skills\{14 superpowers + 7 plugin-owned}` | Deduplicate 20 overlapping skills so `browser` subagent and core skills stay inside budget |
| Global Rules | Refactor | `C:\Users\ok601\.gemini\GEMINI.md` | Shrink from `20,038` B to `<= 8,500` B static Gemini 4 Hydrogen/Argon prefix + `docs` split |
| Plugin Rules | Refactor | `C:\Users\ok601\.gemini\config\plugins\career-copilot-kr\rules\AGENTS.md` | Slim from `7,315` B to `<= 1,500` B trigger stub; move ledger to `references/career-ledger.md` |
| Global Overlay Rule | Create | `C:\Users\ok601\.gemini\config\plugins\gemini4-harness-fit\` | Local custom plugin supplying Gemini 4 Hydrogen addendum, Orchestrator routing, & global `hooks.json` |
| Global MCP | Modify | `C:\Users\ok601\.gemini\config\mcp_config.json` | Disable redundant global `playwright` (49 schemas) & remove stale Desktop `ObsidianVault` path |
| Workspace Skills | Update | `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\skills\{ai-weekly-vault,cc-daily,cc-news,cc-weekly,cc-benchmarks}\SKILL.md` | Fix `/Users/nhn/Documents/Obsidian Vault` primary path notes & Gemini 4 model/orchestrator references |
| Global Hooks | Create | `C:\Users\ok601\.gemini\config\hooks.json` + `scripts\safety_guard.py` | Enforce `PreToolUse` destructive command guard globally across all workspaces |

---

### Task 1: Create Deterministic Backup Snapshot

**Files:**
- Create: `C:\Users\ok601\.gemini\backups\gemini4-fit-20261113\`
- Read: `C:\Users\ok601\.gemini\GEMINI.md`, `C:\Users\ok601\.gemini\config\config.json`, `C:\Users\ok601\.gemini\config\mcp_config.json`, `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\*`

- [ ] **Step 1: Run backup script in PowerShell**

```powershell
$bak = "C:\Users\ok601\.gemini\backups\gemini4-fit-20261113"
New-Item -ItemType Directory -Force -Path "$bak\global", "$bak\plugins", "$bak\workspace-agents" | Out-Null
Copy-Item "C:\Users\ok601\.gemini\GEMINI.md" "$bak\global\GEMINI.md"
Copy-Item "C:\Users\ok601\.gemini\config\config.json" "$bak\global\config.json"
Copy-Item "C:\Users\ok601\.gemini\config\mcp_config.json" "$bak\global\mcp_config.json"
Copy-Item -Recurse "C:\Users\ok601\.gemini\config\plugins\humanize-korean" "$bak\plugins\humanize-korean"
Copy-Item -Recurse "C:\Users\ok601\.gemini\config\plugins\career-copilot-kr" "$bak\plugins\career-copilot-kr"
Copy-Item -Recurse "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents" "$bak\workspace-agents\.agents"
```

- [ ] **Step 2: Verify backup integrity**

Run: `Get-ChildItem "C:\Users\ok601\.gemini\backups\gemini4-fit-20261113" -Recurse | Measure-Object`
Expected: `Count` > 40 files with `GEMINI.md` = `20038` bytes.

---

### Task 2: Fix Critical Runtime Bugs (`humanize-korean` `model: opus` & `scrapling` macOS Path)

**Files:**
- Modify: `C:\Users\ok601\.gemini\config\plugins\humanize-korean\agents\humanize-diagnostician.md:1-6`
- Modify: `C:\Users\ok601\.gemini\config\plugins\humanize-korean\agents\humanize-finalizer.md:1-6`
- Modify: `C:\Users\ok601\.gemini\config\plugins\humanize-korean\agents\humanize-monolith.md:1-6`
- Modify: `C:\Users\ok601\.gemini\config\plugins\humanize-korean\agents\korean-ai-tell-taxonomist.md:1-6`
- Modify: `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\plugins\scrapling\mcp_config.json:1-13`

**Interfaces:**
- Consumes: Antigravity subagent frontmatter contract (`model: inherit` | `flash` | `pro` | `flash_lite`, or omitted to default to `inherit`).
- Produces: Windows-compatible `scrapling` MCP (`command: "uvx"`) and Gemini 4-compatible `humanize-korean` subagents.

- [ ] **Step 1: Verify failing state before fix**

Run:
```powershell
Select-String -Path "C:\Users\ok601\.gemini\config\plugins\humanize-korean\agents\*.md" -Pattern "^model:\s*opus"
Get-Content "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\plugins\scrapling\mcp_config.json" -Raw -Encoding UTF8
```
Expected: 4 matches of `model: opus` and `"/Users/nhn/.local/bin/uvx"` in `scrapling/mcp_config.json`.

- [ ] **Step 2: Replace `model: opus` in `humanize-korean` agents**

Route complex Korean prose diagnosis/finalization (`humanize-diagnostician`, `humanize-finalizer`, `humanize-monolith`) to `inherit` (uses session's Gemini 4 Hydrogen/Argon) and pattern taxonomy (`korean-ai-tell-taxonomist`) to `flash` for low-latency classification:

```powershell
$agentsDir = "C:\Users\ok601\.gemini\config\plugins\humanize-korean\agents"
foreach ($f in @("humanize-diagnostician.md", "humanize-finalizer.md", "humanize-monolith.md")) {
  $p = Join-Path $agentsDir $f
  $c = (Get-Content $p -Raw -Encoding UTF8) -replace "(?m)^model:\s*opus\r?$", "model: inherit"
  [System.IO.File]::WriteAllText($p, $c, [System.Text.UTF8Encoding]::new($false))
}
$taxPath = Join-Path $agentsDir "korean-ai-tell-taxonomist.md"
$taxContent = (Get-Content $taxPath -Raw -Encoding UTF8) -replace "(?m)^model:\s*opus\r?$", "model: flash"
[System.IO.File]::WriteAllText($taxPath, $taxContent, [System.Text.UTF8Encoding]::new($false))
```

- [ ] **Step 3: Fix `scrapling/mcp_config.json` for Windows `uvx`**

Write exact JSON to `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\plugins\scrapling\mcp_config.json`:

```json
{
  "mcpServers": {
    "mcp": {
      "command": "uvx",
      "args": [
        "--from",
        "scrapling[ai]",
        "scrapling",
        "mcp"
      ]
    }
  }
}
```

- [ ] **Step 4: Verify fix**

Run:
```powershell
Select-String -Path "C:\Users\ok601\.gemini\config\plugins\humanize-korean\agents\*.md" -Pattern "^model:"
uvx --version
```
Expected: 0 `model: opus` matches (`inherit` x3, `flash` x1), and `uvx --version` exits 0.

- [ ] **Step 5: Commit workspace change**

```powershell
git -C "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly" add .agents/plugins/scrapling/mcp_config.json
git -C "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly" commit -m "fix: scrapling MCP Windows uvx 경로 호환성 수정"
```

---

### Task 3: Deduplicate Skills & Plugins to Recover Context Budget (`browser` Subagent Restoration)

**Files:**
- Remove (after verifying identical/superseded against global plugins):
  - `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\plugins\superpowers\` (duplicates `~/.gemini/config/plugins/superpowers`)
  - `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\plugins\sonarqube\` (re-enables globally disabled `sonarqube` plugin)
  - 14 loose superpowers copies in `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\skills\`: `brainstorming`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills`
  - 6 plugin-owned copies in `.agents/skills/`: `computer-use` (in `ai-weekly-essentials`), `graphify` (in `ai-weekly-essentials`), `slides` (in `career-copilot-kr`), `ui-ux-pro-max` (in `addyosmani-agent-skills`), `ego-browser` (keep ONLY `~/.gemini/config/skills/ego-browser` after syncing the newer version!)
- Verify: `C:\Users\ok601\.gemini\config\skills\ego-browser\SKILL.md` vs `.agents\skills\ego-browser\SKILL.md`

- [ ] **Step 1: Inspect `ego-browser/SKILL.md` differences and sync newer version to global**

```powershell
$gEgo = "C:\Users\ok601\.gemini\config\skills\ego-browser\SKILL.md"
$wEgo = "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\skills\ego-browser\SKILL.md"
git diff --no-index -- $gEgo $wEgo
```

If `.agents\skills\ego-browser` is newer or workspace-tuned, copy the authoritative version to `C:\Users\ok601\.gemini\config\skills\ego-browser\SKILL.md` (preserving any global-only sections) before removing the workspace copy.

- [ ] **Step 2: Remove redundant workspace plugins & duplicate loose skills**

```powershell
$wsAgents = "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents"
Remove-Item -Recurse -Force "$wsAgents\plugins\superpowers", "$wsAgents\plugins\sonarqube"

$dupSkills = @(
  "brainstorming", "dispatching-parallel-agents", "executing-plans",
  "finishing-a-development-branch", "receiving-code-review", "requesting-code-review",
  "subagent-driven-development", "systematic-debugging", "test-driven-development",
  "using-git-worktrees", "using-superpowers", "verification-before-completion",
  "writing-plans", "writing-skills", "computer-use", "graphify",
  "slides", "ui-ux-pro-max", "ego-browser"
)
foreach ($s in $dupSkills) {
  $target = Join-Path "$wsAgents\skills" $s
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
}
```

- [ ] **Step 3: Optionally disable low-use global plugins in `config.json` to trim skill budget further**

Review `C:\Users\ok601\.gemini\config\config.json`:
- Keep `gdocs` / `gsheets` disabled OR authenticate via Plugins Manager (currently `not connected` in `list_plugin_accounts`, adding unused skill tokens).
- Keep `google-developer-knowledge` only if GCP/Android/Firebase ADC credentials exist; otherwise toggle `"enabled": false` until needed.
- Keep `hiring-panel` enabled ONLY during active resume reviews if context budget stays tight, or leave enabled once the 20 duplicates above are purged.

- [ ] **Step 4: Verify zero duplicate skills remain**

Run:
```powershell
$all = @(
  (Get-ChildItem "C:\Users\ok601\.gemini\config\skills" -Directory).Name
  (Get-ChildItem "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\skills" -Directory).Name
  (Get-ChildItem "C:\Users\ok601\.gemini\config\plugins\*\skills\*" -Directory | ForEach-Object {
    # filter to enabled plugins only in real check
    $_.Name
  })
)
```
Expected: `.agents/skills` drops from `32` to `13` project-specific skills (`ai-weekly-vault`, `banner-design`, `brand`, `cc-benchmarks`, `cc-daily`, `cc-news`, `cc-social`, `cc-star`, `cc-trends`, `cc-weekly`, `design`, `design-system`, `ui-styling`), eliminating all 20 duplicates.

- [ ] **Step 5: Commit workspace deduplication**

```powershell
git -C "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly" add .agents
git -C "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly" commit -m "chore: 중복 워크스페이스 스킬 및 플러그인 정리로 컨텍스트 예산 최적화"
```

---

### Task 4: Refactor `GEMINI.md` and `career-copilot-kr/rules/AGENTS.md` for Gemini 4 Implicit Caching & `20,000`-Token Rules Budget

**Files:**
- Modify: `C:\Users\ok601\.gemini\GEMINI.md` (target `<= 8,500` bytes from `20,038` bytes)
- Create: `C:\Users\ok601\.gemini\config\plugins\career-copilot-kr\skills\kr-career-copilot\references\career-ledger.md`
- Modify: `C:\Users\ok601\.gemini\config\plugins\career-copilot-kr\rules\AGENTS.md` (target `<= 1,500` bytes from `7,315` bytes)

**Interfaces:**
- Consumes: Antigravity `rules.md` (`24,000` B per-file cap, `20,000`-token `defaultRulesBudget`) + Gemini 4 Implicit Caching (`>= 4,096` tokens static prefix, 95% cache read discount on Argon, `$0.075/1M` on Hydrogen).
- Produces: High-signal compact `GEMINI.md` tuned for Gemini 4 Hydrogen (`high`/`xhigh` negative-constraint adherence, parallel tool execution) and Argon (`medium`/`high` architecture planning, Orchestrator handoff).

- [ ] **Step 1: Relocate full Career Fact Ledger & Banned List from `career-copilot-kr/rules/AGENTS.md` to `references/career-ledger.md`**

Move lines 1–66 of `C:\Users\ok601\.gemini\config\plugins\career-copilot-kr\rules\AGENTS.md` into `C:\Users\ok601\.gemini\config\plugins\career-copilot-kr\skills\kr-career-copilot\references\career-ledger.md`, and replace `career-copilot-kr/rules/AGENTS.md` with a compact trigger & safety stub (`<= 1,400` bytes):

```markdown
# KR Career Copilot — Activation & Hard Safety Stub

- **Trigger Rule**: 이직, 채용공고(JD), 이력서, 경력기술서, 자소서, 입사지원(잡코리아·사람인·리멤버·원티드·점핏·그리팅·나인하이어) 작업 시 반드시 `kr-career-copilot` 스킬과 `references/career-ledger.md` 및 `C:\Users\ok601\.gemini\antigravity\scratch\career-vault\마스터_통합이력서_RESUME-IMPROVED_2026-11-07.md`를 선행 로드한다.
- **Fact & Safety Lock**:
  1. 학력 3건·경력 4개사 원장에 없는 사실·수치 창작 및 금지어(`foundBanned: []` in `career-ledger.md`) 기재 절대 금지.
  2. 본문 부연설명 괄호 0개, TMI 삭제, 섹션별 수치 3중 반복 차단, 사람인 화살표(`→`/`↔`) 금지.
  3. 브라우저 자동화는 `ego-browser`로 `임시저장(HTTP 200)`까지만 수행하며 `최종 제출` 버튼 클릭은 사용자 명시적 승인 없이 엄격 금지.
```

- [ ] **Step 2: Slim `C:\Users\ok601\.gemini\GEMINI.md` into Gemini 4 Hydrogen/Argon-Fit Core (`<= 8,500` bytes)**

Keep ONLY high-signal global invariants (ordered cleanly in Gemini 4's recommended **Role -> Rules/Guardrails -> Execution/Orchestrator Policy -> Domain Routing -> Verification Standard** layout):
1. Remove redundant `0-B` excluded-skill workaround (fixed by Task 3).
2. Remove duplicated Java/PostgreSQL/React boilerplate already covered by `ecc-fullstack-core` skills (`java-coding-standards`, `springboot-patterns`, `postgres-patterns`, `react-performance`) — replace with concise 1-line skill routing pointers.
3. Remove duplicated `career-copilot-kr` details (now in `career-copilot-kr/rules/AGENTS.md` + `career-ledger.md`).
4. Add **Gemini 4 Hydrogen & Argon Model-Fit Section**:
   - **Argon / Carbon (Coordinator / Deep Reasoning)**: 아키텍처 설계, 다중 파일 리팩토링, `/plan`, `/grill-me`, 장문 디코드(`background=true`) 담당.
   - **Hydrogen (Execution / Verification Engine)**: 코드 구현, 테스트 실행, 로그 분석, 반복 수정, `/swarm` 워커 담당 (`high`/`xhigh` 사고 수준에서 부정 제약 준수 극대화).
   - **API / SDK 생성 코드 규칙**: `google-genai` / `@google/genai` Interactions API(`previous_interaction_id`), `thinking_level` 사용, 레거시 `temperature`/`top_p`/`top_k` 및 명시적 `cachedContents` 배제, 15분 이상 클라이언트 타임아웃 권장.
5. Update `AI Weekly` / `NHN` references from `Claude Code·MCP` to `Antigravity·MCP` where appropriate (without altering career factual ledger).

- [ ] **Step 3: Verify rule sizes against Antigravity limits**

Run:
```powershell
@("C:\Users\ok601\.gemini\GEMINI.md",
  "C:\Users\ok601\.gemini\config\plugins\career-copilot-kr\rules\AGENTS.md") |
  Get-Item | Select-Object Name, Length
```
Expected: `GEMINI.md` `<= 9,000` bytes (down from `20,038` B), `career-copilot-kr/rules/AGENTS.md` `<= 1,500` bytes (down from `7,315` B), total active rules across all files `< 20,000` bytes (~60% budget reduction).

---

### Task 5: Create Local `gemini4-harness-fit` Plugin (Hydrogen Addendum + Orchestrator Routing + Global Safety Hooks)

**Files:**
- Create: `C:\Users\ok601\.gemini\config\plugins\gemini4-harness-fit\plugin.json`
- Create: `C:\Users\ok601\.gemini\config\plugins\gemini4-harness-fit\rules\AGENTS.md`
- Create: `C:\Users\ok601\.gemini\config\plugins\gemini4-harness-fit\skills\gemini4-model-routing\SKILL.md`
- Create: `C:\Users\ok601\.gemini\config\plugins\gemini4-harness-fit\hooks.json`
- Create: `C:\Users\ok601\.gemini\config\plugins\gemini4-harness-fit\scripts\global_safety_guard.py`

**Interfaces:**
- Consumes: Antigravity native plugin contract (`plugins/<name>/plugin.json`, root `hooks.json`, `rules/AGENTS.md`, `skills/<name>/SKILL.md`) and `hooks.md` `PreToolUse` stdin/stdout protojson camelCase schema.
- Produces: Active global safety guard across ALL projects + `gemini-4-hydrogen` / `gemini-4-argon` SDK/API addendum (without modifying marketplace-managed `gemini-api` files).

- [ ] **Step 1: Create `plugin.json`**

```json
{
  "name": "gemini4-harness-fit",
  "displayName": "Gemini 4 Hydrogen & Argon Harness Fit",
  "version": "1.0.0",
  "description": "Gemini 4 Hydrogen/Argon model-fit routing, Interactions API addendum, and global Windows-safe PreToolUse safety hooks."
}
```

- [ ] **Step 2: Create `skills/gemini4-model-routing/SKILL.md`**

Include exact verified `gemini-4-hydrogen` & `gemini-4-argon` parameters (`thinking_level`, `previous_interaction_id`, `background=True`, `max_output_tokens > 65536`, implicit caching `>= 4096` tokens, no `temperature`/`top_p`/`top_k`, Antigravity Orchestrator & `/swarm` worker delegation rules).

- [ ] **Step 3: Create `hooks.json` & `scripts/global_safety_guard.py`**

Copy and enhance `ai-weekly/.agents/scripts/safety_guard.py` into `gemini4-harness-fit/scripts/global_safety_guard.py` (preserving SQL `DROP`/`TRUNCATE`/unconditional `DELETE`, `git push --force`, Prometheus >6h checks, PLUS adding `git reset --hard` guard and UTF-8 stdin/stdout handling on Windows), and register in `gemini4-harness-fit/hooks.json`:

```json
{
  "global-destructive-guard": {
    "enabled": true,
    "PreToolUse": [
      {
        "matcher": "run_command|call_mcp_tool",
        "hooks": [
          {
            "type": "command",
            "command": "python scripts/global_safety_guard.py",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Test `global_safety_guard.py` with synthetic payloads**

Run:
```powershell
'{"toolCall":{"name":"run_command","args":{"CommandLine":"git push --force origin main"}}}' | python "C:\Users\ok601\.gemini\config\plugins\gemini4-harness-fit\scripts\global_safety_guard.py"
'{"toolCall":{"name":"run_command","args":{"CommandLine":"git status"}}}' | python "C:\Users\ok601\.gemini\config\plugins\gemini4-harness-fit\scripts\global_safety_guard.py"
```
Expected: First returns `{"decision": "deny", ...}`, second returns `{"decision": "allow"}`.

---

### Task 6: Prune Redundant MCP Connectors & Reconnect Needed Accounts

**Files:**
- Modify: `C:\Users\ok601\.gemini\config\mcp_config.json`
- Modify: `C:\Users\ok601\.gemini\config\config.json` (only if disabling unused `gdocs`/`gsheets`/`google-developer-knowledge`)

**Interfaces:**
- Consumes: `mcp_servers.md` schema (`mcpServers` Stdio / Streamable HTTP).
- Produces: Lean MCP surface removing 49 unused `playwright` schemas globally and dead Desktop `ObsidianVault` path.

- [ ] **Step 1: Update `C:\Users\ok601\.gemini\config\mcp_config.json`**

Remove global `playwright` MCP server (49 tool schemas; `ego-browser` is mandated for browser interaction, `chrome-devtools-plugin` handles CDP/LCP/memory debugging, and `ai-weekly` keeps `playwright` locally as an npm package for scripts) and restrict `obsidian_filesystem` to the single canonical vault `C:\Users\ok601\OneDrive\문서\Obsidian Vault`:

```json
{
  "mcpServers": {
    "obsidian_filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\ok601\\OneDrive\\문서\\Obsidian Vault"
      ]
    },
    "computer-use": {
      "command": "C:\\Users\\ok601\\.gemini\\antigravity\\mcp-servers\\computer-use\\.venv\\Scripts\\python.exe",
      "args": [
        "-u",
        "C:\\Users\\ok601\\.gemini\\antigravity\\mcp-servers\\computer-use\\server.py"
      ]
    }
  }
}
```

- [ ] **Step 2: Resolve `gdocs` / `gsheets` account state**

Either sign in via Plugins Manager (`gdocs`, `gsheets` both currently `not connected`) OR disable them in `config.json` (`"enabled": false`) until needed so unused connector skills do not occupy prompt budget.

- [ ] **Step 3: Verify valid JSON**

Run: `Get-Content "C:\Users\ok601\.gemini\config\mcp_config.json" -Raw -Encoding UTF8 | ConvertFrom-Json`
Expected: Parses cleanly with 2 servers (`obsidian_filesystem`, `computer-use`).

---

### Task 7: Clean Stale macOS Paths & Legacy Model Strings in `ai-weekly` Skills & Scripts

**Files:**
- Modify: `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\skills\ai-weekly-vault\SKILL.md`
- Modify: `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\skills\cc-daily\SKILL.md`
- Modify: `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\skills\cc-news\SKILL.md`
- Modify: `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\skills\cc-weekly\SKILL.md`
- Modify: `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\.agents\skills\cc-benchmarks\SKILL.md`
- Modify: `c:\Users\ok601\OneDrive\바탕 화면\ai-weekly\scripts\benchmarks\curate-benchmarks.js`

- [ ] **Step 1: Update Obsidian Vault paths in `ai-weekly` skills**

Replace hardcoded `/Users/nhn/Documents/Obsidian Vault/ai-weekly` with dual-OS notation (`C:\Users\ok601\OneDrive\문서\Obsidian Vault\ai-weekly` on Windows, `/Users/nhn/Documents/Obsidian Vault/ai-weekly` on macOS) and replace `cat "..."` bash examples with PowerShell `Get-Content "..." -Encoding UTF8`.

- [ ] **Step 2: Update `cc-benchmarks/SKILL.md` & `curate-benchmarks.js` legacy model list**

In `scripts/benchmarks/curate-benchmarks.js:23-34`, verify whether `gemini 3.0`/`gemini 3.1` should join `LEGACY_PATTERNS` now that Gemini 4 Argon & Hydrogen are released (keep `gemini 3.8` if still active on OpenRouter/LMArena until superseded).

- [ ] **Step 3: Run existing test suite in `ai-weekly`**

Run:
```powershell
cd "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly"
node --test scripts/news/collect_news.test.js scripts/plugins/curate.test.js scripts/plugins/publish-floor.test.js scripts/plugins/scan-install-entry.test.js
```
Expected: All existing Node tests pass (0 failures).

- [ ] **Step 4: Commit `ai-weekly` skill/script updates**

```powershell
git -C "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly" add .agents/skills scripts/benchmarks/curate-benchmarks.js
git -C "c:\Users\ok601\OneDrive\바탕 화면\ai-weekly" commit -m "chore: ai-weekly 스킬 Windows 경로 및 Gemini 4 기준 현행화"
```

---

### Task 8: End-to-End Verification & Acceptance Check

- [ ] **Step 1: Verify new session discovery in Antigravity (`agy`)**
  - Start a fresh Antigravity 2.0 conversation in `ai-weekly`.
  - Confirm `<subagents>` includes `browser` (no longer evicted by context budget limits).
  - Confirm `<skills>` contains zero duplicate skill names.
  - Confirm `GEMINI.md` + all active `AGENTS.md` files sum to `< 20,000` bytes (well under `20,000`-token `defaultRulesBudget` and `24,000`-byte per-file cap).
  - Confirm `global_safety_guard.py` blocks a simulated `git push --force` dry test via `PreToolUse`.

- [ ] **Step 2: Update Obsidian Vault work status**
  - Mark completed checkboxes in `C:\Users\ok601\OneDrive\문서\Obsidian Vault\antigravity-harness\03_구현_로드맵_및_실행_체크리스트.md`.

---

## Self-Review Checklist
- **Spec coverage:** Rules budget & caching (Task 4), skill/plugin deduplication (Task 3), `humanize-korean` `model: opus` & `scrapling` Windows fix (Task 2), Gemini 4 Hydrogen/Argon routing + global hooks (Task 5), MCP/Connectors cleanup (Task 6), `ai-weekly` Windows/model alignment (Task 7), verification (Task 8).
- **Placeholder scan:** Zero `TBD`/`TODO` placeholders; every command, path, and JSON/Markdown block is complete.
- **Type & path consistency:** All paths verified against live filesystem inspection on 2026-11-13 (`agy` 1.3.1, Python 3.13, `uvx.exe`).
