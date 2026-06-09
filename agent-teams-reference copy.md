# Agent Teams — Master Reference Guide

> Source: Claude Code official docs (experimental feature)
> Requires: Claude Code v2.1.32+, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

---

## Table of Contents

1. [What Agent Teams Are](#what-agent-teams-are)
2. [Agent Teams vs Subagents](#agent-teams-vs-subagents)
3. [Enabling Agent Teams](#enabling-agent-teams)
4. [Architecture](#architecture)
5. [Tools Reference](#tools-reference)
6. [Display Modes](#display-modes)
7. [Workflow: Start to Finish](#workflow-start-to-finish)
8. [Task Management](#task-management)
9. [Communication Patterns](#communication-patterns)
10. [Permissions and Context](#permissions-and-context)
11. [Subagent Definitions as Teammates](#subagent-definitions-as-teammates)
12. [Hooks for Quality Gates](#hooks-for-quality-gates)
13. [Best Practices](#best-practices)
14. [Proven Use Case Patterns](#proven-use-case-patterns)
15. [Limitations](#limitations)
16. [Troubleshooting](#troubleshooting)
17. [Quick Decision Framework](#quick-decision-framework)

---

## What Agent Teams Are

Agent teams coordinate multiple Claude Code instances working together. One session acts as **team lead** — it creates the team, spawns teammates, assigns tasks, and synthesizes results. Teammates work independently, each in their own context window, and can communicate directly with each other and with the lead.

Key differentiator from subagents: teammates can message each other without going through the lead, and any teammate can be interacted with directly by the user.

---

## Agent Teams vs Subagents

| Dimension | Subagents | Agent Teams |
|---|---|---|
| **Context** | Own window; results return to caller | Own window; fully independent |
| **Communication** | Report back to main agent only | Teammates message each other directly |
| **Coordination** | Main agent manages all work | Shared task list with self-coordination |
| **Best for** | Focused tasks where only result matters | Complex work requiring discussion & collaboration |
| **Token cost** | Lower — results summarized back | Higher — each teammate is a separate Claude instance |
| **User interaction** | Only through main agent | Can interact with any teammate directly |

**Use subagents when**: quick, focused workers that just report back.
**Use agent teams when**: teammates need to share findings, challenge each other, and coordinate independently.

---

## Enabling Agent Teams

### Via settings.json (persistent)

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Place in:
- `~/.claude/settings.json` — global (all projects)
- `.claude/settings.local.json` — local project only (gitignored)
- `.claude/settings.json` — project-wide (committed)

### Via shell environment

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

---

## Architecture

```
Team Lead (main session)
├── Creates team via TeamCreate
├── Spawns teammates via Agent tool
├── Manages shared task list
└── Coordinates via SendMessage

Teammates (independent Claude Code sessions)
├── Each has own context window
├── Reads same project context (CLAUDE.md, MCP, skills)
├── Claims and completes tasks from shared task list
└── Communicates directly with lead and peers via SendMessage

Shared Storage (filesystem)
├── ~/.claude/teams/{team-name}/config.json  ← team state, member list
└── ~/.claude/tasks/{team-name}/             ← task list directory
```

### Team Config (`config.json`)

Auto-generated and auto-updated. Contains `members` array with:
- `name` — human-readable name (use this for all messaging and task assignment)
- `agentId` — unique identifier (reference only, do not use for comms)
- `agentType` — role/type of agent

**Do not hand-edit this file** — it is overwritten on every state update.

---

## Tools Reference

### TeamCreate

Creates a team and its corresponding task list directory.

```json
{
  "team_name": "my-project",
  "description": "Working on feature X",
  "agent_type": "researcher"
}
```

- Creates `~/.claude/teams/{team-name}/config.json`
- Creates `~/.claude/tasks/{team-name}/`
- One team per session — clean up before starting a new one

### TeamDelete

Removes team and task directories. **Must shut down all teammates first** or this will fail.

```json
{}
```

Always run cleanup from the lead. Teammates should not call TeamDelete because their team context may not resolve correctly.

### SendMessage

Send a message to a teammate by name. Plain text output is NOT visible to other agents — must use this tool to communicate.

```json
{
  "to": "researcher",
  "summary": "5-10 word preview shown in UI",
  "message": "Please investigate the auth module for token expiry issues."
}
```

**Protocol responses (shutdown/plan approval):**

```json
// Approve shutdown
{"to": "team-lead", "message": {"type": "shutdown_response", "request_id": "...", "approve": true}}

// Reject plan, send back for revision
{"to": "researcher", "message": {"type": "plan_approval_response", "request_id": "...", "approve": false, "feedback": "add error handling"}}
```

Rules:
- Always refer to teammates by **name**, never UUID
- Do not originate `shutdown_request` unless asked
- Do not send structured JSON status messages like `{"type":"idle"}` — use plain text or TaskUpdate

### Task Tools (TaskCreate, TaskList, TaskUpdate)

Teammates share a task list stored at `~/.claude/tasks/{team-name}/`. Tasks have states: `pending → in_progress → completed`. Tasks support dependencies — a pending task with unresolved dependencies cannot be claimed.

**Task claiming** uses file locking to prevent race conditions.

Teammate workflow for tasks:
1. Check TaskList after completing each task
2. Claim unassigned, unblocked tasks with TaskUpdate (set `owner` to your name)
3. Prefer tasks in ID order (lowest first) — earlier tasks set context for later ones
4. Mark complete with TaskUpdate, then check for next work
5. If all available tasks are blocked, notify the team lead

---

## Display Modes

### In-Process (default fallback)
- All teammates run inside your main terminal
- `Shift+Down` to cycle through teammates
- Type to send a message to the focused teammate
- `Enter` to view a teammate's session
- `Escape` to interrupt their current turn
- `Ctrl+T` to toggle task list
- Works in any terminal, no extra setup

### Split Panes (tmux/iTerm2)
- Each teammate gets its own pane
- See all output simultaneously
- Click into a pane to interact directly
- Requires tmux or iTerm2 with `it2` CLI

### Configuration

```json
// ~/.claude/settings.json
{
  "teammateMode": "in-process"  // or "tmux" or "auto"
}
```

```bash
# Force in-process for a single session
claude --teammate-mode in-process
```

**`"auto"` behavior**: uses split panes if already inside tmux, otherwise in-process.

### Installing tmux / iTerm2

```bash
# macOS
brew install tmux

# iTerm2 split panes
# 1. Install it2 CLI
# 2. Enable Python API: iTerm2 → Settings → General → Magic → Enable Python API
# 3. Use: tmux -CC (iTerm2 native tmux integration)
```

---

## Workflow: Start to Finish

### 1. Create team

```text
Create an agent team with 3 teammates to refactor the auth module.
One for the service layer, one for tests, one for API routes.
```

### 2. Teammates spawn and load context

Each teammate automatically loads:
- Project `CLAUDE.md` files
- MCP servers from project and user settings
- Skills from project and user settings
- The spawn prompt from the lead

They do **not** inherit the lead's conversation history.

### 3. Work proceeds

- Lead creates tasks and assigns to teammates
- Teammates can self-claim unassigned tasks
- Teammates communicate directly via SendMessage
- Lead receives idle notifications automatically when a teammate's turn ends

### 4. Monitor and steer

```text
Wait for your teammates to complete their tasks before proceeding.
```

```text
Ask the researcher teammate to focus on X instead.
```

### 5. Shut down teammates

```text
Ask the researcher teammate to shut down.
```

Lead sends a `shutdown_request`. Teammate approves (exits) or rejects with explanation.

### 6. Clean up

```text
Clean up the team.
```

Removes `~/.claude/teams/{name}/` and `~/.claude/tasks/{name}/`. Fails if active teammates still exist — shut them down first.

---

## Task Management

### Task sizing

| Size | Problem |
|---|---|
| Too small | Coordination overhead exceeds the benefit |
| Too large | Long runs without check-ins, risk of wasted effort |
| Just right | Self-contained unit with a clear deliverable (a function, a test file, a review) |

### Optimal ratios

- **3–5 teammates** for most workflows
- **5–6 tasks per teammate** keeps everyone productive without excessive context switching
- For 15 independent tasks → 3 teammates is a good starting point

### Dependency management

The system unblocks dependent tasks automatically when their dependencies complete. No manual intervention needed.

---

## Communication Patterns

### Lead → Teammate (direct assignment)
```json
{"to": "backend-dev", "summary": "assign auth task", "message": "Please implement JWT refresh token logic in src/auth/refresh.ts"}
```

### Teammate → Lead (status/completion)
```text
// Plain text, not structured JSON
Completed the JWT refresh token implementation. Tests are passing. Moving to the next task.
```

### Teammate → Teammate (peer coordination)
```json
{"to": "frontend-dev", "summary": "API contract ready", "message": "The /auth/refresh endpoint is live. It accepts {refreshToken: string} and returns {accessToken: string, expiresIn: number}."}
```

### Adversarial/debate pattern
```text
Spawn 5 teammates to investigate different hypotheses. Have them talk to each other
to try to disprove each other's theories, like a scientific debate.
```

### Broadcast (no group message tool — send one per recipient)
```text
// To reach everyone, the lead sends one message per teammate
```

### Discovering teammates
```text
// Any teammate can read the team config to find others
Read ~/.claude/teams/{team-name}/config.json
```

---

## Permissions and Context

### Permissions

- Teammates start with the **lead's permission settings**
- If lead runs `--dangerously-skip-permissions`, all teammates do too
- Cannot set per-teammate permission modes at spawn time
- Can change individual teammate modes **after** spawning

### Context each teammate receives

✅ Loaded automatically:
- `CLAUDE.md` files from working directory
- MCP servers (from project + user settings)
- Skills (from project + user settings)
- Spawn prompt from lead

❌ Not inherited:
- Lead's conversation history
- Lead's current context window

### CLAUDE.md tip

Teammates read `CLAUDE.md` normally. Use it to provide project-specific guidance that all teammates (and the lead) will receive.

---

## Subagent Definitions as Teammates

Define a role once (e.g., `security-reviewer`, `test-runner`) and reuse it both as a delegated subagent and as an agent team teammate.

### Where to define

| Scope | Location |
|---|---|
| Project | `.claude/agents/` |
| User | `~/.claude/agents/` |
| Plugin | Via plugin manifest |

### How to use

```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

### How the definition is applied

- `tools` allowlist is honored
- `model` is honored
- Definition body is **appended** to teammate's system prompt (not replaced)
- `SendMessage` and task tools are **always available** even when `tools` restricts other tools

### What is NOT applied when running as teammate

- `skills` frontmatter field
- `mcpServers` frontmatter field
(Teammates load these from project/user settings instead)

---

## Hooks for Quality Gates

Three hook events specific to agent teams:

### TeammateIdle

Fires when a teammate is about to go idle.

```json
{
  "hooks": {
    "TeammateIdle": [{
      "hooks": [{
        "type": "command",
        "command": "your-validation-script.sh"
      }]
    }]
  }
}
```

- **Exit code 2**: send feedback, keep teammate working
- Use to enforce "don't go idle until tests pass"

### TaskCreated

Fires when a task is being created.

- **Exit code 2**: prevent creation, send feedback
- Use to enforce task naming conventions or required fields

### TaskCompleted

Fires when a task is being marked complete.

- **Exit code 2**: prevent completion, send feedback
- Use to enforce "tasks can't complete without test coverage"

---

## Best Practices

### Context

**Always include task-specific detail in spawn prompts** — teammates don't get the lead's history:

```text
Spawn a security reviewer teammate with the prompt: "Review src/auth/ for
vulnerabilities. Focus on token handling, session management, and input
validation. The app uses JWT tokens in httpOnly cookies. Report findings
with severity ratings."
```

### Team size

- Default to **3–5 teammates**
- Scale up only when work genuinely benefits from simultaneous execution
- Three focused teammates often outperform five scattered ones

### File conflicts

- Assign each teammate **distinct files** — two teammates editing the same file causes overwrites
- Design task boundaries around file ownership, not feature areas

### Lead behavior

- If the lead starts implementing instead of delegating: `"Wait for your teammates to complete their tasks before proceeding"`
- If a task appears stuck: check whether work is actually done, then update task status manually or nudge the teammate

### Start simple

- Begin with research/review tasks (no code writing) to learn the coordination patterns
- Parallel code review, library research, or bug investigation are low-risk starting points

### Monitoring

- Check in on teammate progress regularly
- Redirect approaches that aren't working early
- Don't let teams run fully unattended for long periods — wasted effort compounds

### Token awareness

- Token cost scales linearly with teammate count
- Each teammate = separate Claude instance = separate context window
- For routine tasks, a single session is more cost-effective
- Agent teams earn their cost on research, review, and new feature work

---

## Proven Use Case Patterns

### Parallel code review (3 teammates)

```text
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

Why it works: each reviewer applies a different filter to the same PR. Lead synthesizes after all three finish.

### Competing hypotheses / adversarial debugging (3–5 teammates)

```text
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk
to each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

Why it works: multiple independent investigators actively trying to disprove each other — the theory that survives is much more likely to be correct. Fights anchoring bias of sequential investigation.

### New feature with parallel module ownership (3–4 teammates)

```text
Create a team with 4 teammates to build the notification system:
- One for the service layer (src/notifications/service.ts)
- One for the API routes (src/routes/notifications.ts)
- One for the frontend components (src/components/Notifications/)
- One for tests and documentation
```

Why it works: clear file ownership, no overlaps, each teammate can work independently.

### Cross-layer coordination (3 teammates)

```text
Implement the user preferences feature. Spawn teammates for:
- Backend: API + DB schema
- Frontend: UI components + state
- Integration: E2E tests
```

### Research from multiple angles (3 teammates)

```text
I'm designing a CLI tool that helps developers track TODO comments.
Create an agent team: one teammate on UX, one on technical architecture,
one playing devil's advocate.
```

### Plan-approval gate for risky work

```text
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

Flow: teammate → read-only plan mode → sends `plan_approval_request` to lead → lead approves or rejects with feedback → if rejected, teammate revises and resubmits → once approved, exits plan mode and implements.

Influence lead's approval judgment: "Only approve plans that include test coverage" or "Reject plans that modify the database schema."

---

## Limitations

| Limitation | Workaround |
|---|---|
| No session resumption with in-process teammates (`/resume`, `/rewind` don't restore teammates) | After resume, tell lead to spawn new teammates |
| Task status can lag (teammate fails to mark complete, blocks dependents) | Check if work is done, update status manually or tell lead to nudge teammate |
| Shutdown can be slow | Teammates finish current request before shutting down — wait it out |
| One team per session | Clean up current team before starting a new one |
| No nested teams (teammates can't spawn teams or teammates) | Design as flat team with lead coordinating |
| Lead is fixed — no promoting teammates or transferring leadership | Design team structure upfront |
| Permissions set at spawn — can't set per-teammate modes before spawning | Change modes after spawning |
| Split panes require tmux or iTerm2 — not supported in VS Code terminal, Windows Terminal, Ghostty | Use in-process mode |

---

## Troubleshooting

### Teammates not appearing

1. In in-process mode: press `Shift+Down` — they may be running but not visible
2. Check if task was complex enough — Claude decides whether to spawn based on the task
3. For split panes: `which tmux` to verify installation
4. For iTerm2: verify `it2` CLI installed and Python API enabled

### Too many permission prompts

Pre-approve common operations in permissions settings before spawning teammates:

```json
{
  "permissions": {
    "allow": ["Bash(npm *)", "Bash(git *)", "Edit(./)"]
  }
}
```

### Teammates stopping on errors

- Check output: `Shift+Down` (in-process) or click pane (split)
- Give them additional instructions directly, or spawn a replacement teammate

### Lead shuts down before work is done

Tell it: `"Keep going — not all tasks are complete."` or `"Wait for all teammates to finish before proceeding."`

### Orphaned tmux sessions

```bash
tmux ls
tmux kill-session -t <session-name>
```

---

## Quick Decision Framework

```
Task involves parallel work?
├── No → Single session
└── Yes
    ├── Workers need to talk to each other?
    │   ├── No → Subagents (lower token cost)
    │   └── Yes
    │       ├── Same files? → Single session or subagents (avoid conflicts)
    │       └── Different files/domains? → Agent team ✓
    │
    └── Sequential dependencies?
        ├── Mostly sequential → Single session or subagents
        └── Mostly parallel → Agent team ✓
```

### Team size guide

| Task count | Recommended teammates |
|---|---|
| 3–6 tasks | 1–2 teammates |
| 6–15 tasks | 3 teammates |
| 15–25 tasks | 4–5 teammates |
| 25+ tasks | 5 teammates max, batch tasks |

### Teammate count by use case

| Use case | Teammates |
|---|---|
| Code review (security/perf/tests) | 3 |
| Competing hypotheses debug | 3–5 |
| Full-stack feature (FE/BE/tests) | 3–4 |
| Research from multiple angles | 3 |
| Large refactor across modules | 3–5 |

---

*Last updated from official Claude Code docs. Re-fetch when Claude Code releases agent team updates.*
