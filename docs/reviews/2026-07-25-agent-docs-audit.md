# Agent Instruction & Memory Docs Audit — 2026-07-25

Audit of every instruction / memory / agent-facing markdown file in the repo,
against (a) what the repo actually does today and (b) current
context-engineering guidance for Claude 5 generation models.

**No files have been changed.** This is the review pass; changes follow on
approval.

---

## Scope

31 agent-facing docs, ~5,700 lines / ~24,400 words:

| Area                    | Files                                                     |
| ----------------------- | --------------------------------------------------------- |
| Root                    | `CLAUDE.md`, `README.md`                                  |
| `.github/instructions/` | 8 files + README                                          |
| `.github/memory-bank/`  | 5 files (+ `tasks/`, `specs/`)                            |
| `.claude/`              | `SETUP.md`, 2 agents, `settings.local.json`               |
| `.agent/workflows/`     | 3 workflow files                                          |
| `design-system/`        | `README.md`, `project/README.md`, `SKILL.md`              |
| Tool/test READMEs       | `tools/README.md` + 4 pipeline READMEs, `tests/README.md` |

Excluded per your instruction: `docs/superpowers/`, `docs/proposals/`,
`docs/reviews/`, `docs/backlog.md`, `.github/memory-bank/tasks/`,
`.github/memory-bank/specs/` — these are planning/history, not instructions.

## The guidance we're auditing against

The blog post you linked
(`claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models`)
is blocked by this session's egress proxy, so I worked from the same material as
published on `platform.claude.com` plus the post's indexed summary. The
load-bearing points:

1. **Anthropic removed 80%+ of Claude Code's own system prompt** for Claude 5
   models. The stated reason: Claude was being _over-constrained_ by system
   prompts, CLAUDE.md files and skills together.
2. **Conflicting instructions are the top failure mode.** Their own example: a
   CLAUDE.md saying "leave documentation as appropriate" while the system prompt
   said "DO NOT add comments" — the model receives both in one request.
3. **Defensive blanket rules are now wrong more often than right.** Rules like
   "default to writing no comments" or "never write multi-paragraph docstrings"
   were worst-case guards; on Claude 5 they override legitimate user intent.
4. **Drop verification/self-check scaffolding.** Opus 5 verifies its own work
   unprompted; instructions like "add a final verification step" or
   "double-check your answer" cause over-verification and burn tokens with no
   quality gain.
5. **Dial back emphasis.** "CRITICAL: You MUST…" now over-triggers; plain "Use X
   when Y" is the correct register.
6. **Positive framing beats prohibition.** Describing the behaviour you want
   outperforms lists of what not to do.
7. **Constrain scope, not method.** The recommended lever is a short
   scope-and-judgement paragraph, not a rulebook.
8. **Context is a token budget with a signal-to-noise ratio** — the smallest set
   of high-signal tokens that gets the outcome. Every stale or duplicated line
   is a net negative, not a neutral.

Claude Code ships a `/doctor` command to right-size skills and CLAUDE.md; worth
running after we act on this.

Sources:
[Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5)
·
[Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
·
[The new rules of context engineering](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)

---

## Headline verdict

The system is **well-maintained at the top and rotting at the bottom.**
`CLAUDE.md`, `context.md`, `activeContext.md` and `progress.md` are current to
within days and are genuinely good. Everything below that layer was last touched
in **February–March 2026** and describes a project that no longer exists.

Three structural problems, in order of cost:

1. **Roughly a third of the agent-facing docs are dead plumbing** — files
   pointing at scripts, directories and conventions that aren't there. They cost
   tokens and mislead.
2. **`CLAUDE.md` has become a bug-regression logbook.** 147 of its 343 lines
   (43%) are the Gotchas list — 20 entries, most of them one-off post-mortems.
3. **The whole structure is Copilot-shaped, not Claude-shaped.** The
   `.github/instructions/*.instructions.md` + `applyTo:` frontmatter pattern is
   GitHub Copilot's convention. Claude Code ignores `applyTo` entirely; those
   files only ever load because `CLAUDE.md` contains a hand-maintained table
   telling me to go read them. Claude Code's native mechanisms (skills,
   subagents with frontmatter, `@` imports, nested `CLAUDE.md`) are almost
   entirely unused.

---

## A. Dead plumbing — files that do nothing

### A1. `.claude/agents/*.md` are not subagents 🔴

`test-writer.md` and `pipeline-reviewer.md` have **no YAML frontmatter**. Claude
Code requires `name:` and `description:` to register a subagent. Neither appears
in this session's available agent list. They are 427 lines of unreachable text,
and `CLAUDE.md` + `feedback_update_docs.md` both instruct me to keep them
updated.

Compounding it: `pipeline-reviewer.md` prescribes an emoji-heavy review format
(🚨/⚠️/💡) that directly contradicts the design system's "No emoji" hard rule,
and points at `data/videos.sqlite` (actual path: `tools/data/videos.sqlite`).

**Action:** add frontmatter to revive them, or delete. Recommend reviving
`pipeline-reviewer` only — `test-writer`'s content is now weaker than the
model's default behaviour, and `/code-review` and `/simplify` cover the review
case.

### A2. `design-system/project/SKILL.md` is not a skill 🔴

`CLAUDE.md` advertises it as "invocable as `/openingbook-design`". Skills must
live at `.claude/skills/<name>/SKILL.md`. This one sits at
`design-system/project/SKILL.md`, and `/openingbook-design` does not exist in
this session.

The _content_ is excellent — the hard rules (British English, sentence case, no
emoji, orange-as-bookmark-ribbon, mandatory result colours) are exactly the
high-signal, project-specific context that belongs in a skill.

**Action:** high value, low effort. Create `.claude/skills/openingbook-design/`
with the SKILL.md and relative references into `design-system/`.

### A3. `design-system/README.md` describes a directory that doesn't exist 🔴

Every path in it is `opening-book-design-system/…`. The actual directory is
`design-system/`. It also opens with "CODING AGENTS: READ THIS FIRST" and
instructs the agent to read chat transcripts before implementing — a Claude
Design _export_ boilerplate that was never localised. `CLAUDE.md` sends me here
"before any visual work"; I arrive at a file whose every pointer 404s.

**Action:** rewrite as a project-local index. The transcripts are historical
reference, not required reading before every visual change.

### A4. `.claude/SETUP.md` is a one-time bootstrap doc, permanently retained 🟠

253 lines of "install these MCP servers, install these plugins, verify hooks".
Last touched 2026-02-28. It tells you to install `context7` and a GitHub MCP
server via `gh` CLI — neither is available in the web/remote environment you now
work in. It documents `/commit` and `/frontend-design` plugins as available
workflows.

**Action:** delete, or move to `docs/` as history. It is not instruction.

### A5. `.agent/workflows/` is an orphaned convention 🟠

Claude Code does not read `.agent/`. These three files carry `// turbo` markers
(an auto-approve annotation from a different agent tool). Nothing references
`.agent/workflows/` except `CLAUDE.md`'s "update docs" gotcha and
`feedback_update_docs.md` — i.e. its only consumers are instructions to keep it
updated.

The _content_ is useful (real prerequisites, real flags, real recovery steps).

**Action:** either promote to `.claude/skills/` (where they'd actually be
invocable — this is the best fit for pipeline runbooks) or fold into the
pipeline READMEs and delete the directory. Do not leave as-is.

---

## B. Factually wrong content

### B1. Four documented npm scripts are broken 🔴

`package.json` points these at `tools/production/`, which **does not exist**:

| Script                           | Target                                        |
| -------------------------------- | --------------------------------------------- |
| `npm run enrich`                 | `tools/production/enrich_openings_llm.js`     |
| `npm run course:enrich`          | `tools/production/enrich_course_data.js`      |
| `npm run course:integrate`       | `tools/production/integrate_course_data.js`   |
| `npm run videos:verify-channels` | `tools/production/verify_youtube_channels.js` |

They are listed as working commands in `CLAUDE.md` (twice — Essential Commands
_and_ Data Pipeline Workflows), `README.md`, and
`project-overview.instructions.md`. `CLAUDE.md` has a gotcha admitting the
problem — but the commands are still presented as runnable three sections above
it. Documenting a known-broken command and separately documenting that it's
broken is worse than either alone.

**Action:** fix `package.json` to point at `tools/llm-enrichment/`, or delete
the scripts. Then remove the gotcha. This is a code fix, not a docs fix.

### B2. `markdown.instructions.md` is a Microsoft blog template 🔴

74 lines, applied to `**/*.md`, requiring:

- YAML frontmatter with `post_title`, `author1`, `post_slug`,
  **`microsoft_alias`**, `featured_image`, `categories` "from the list in
  /categories.txt", `post_date`
- "Do not use an H1 heading, as this will be generated based on the title"
- "Limit line length to 400 characters" and, four lines later, "Break lines at
  80 characters"

Nothing in this repo obeys any of it. All 15 core docs use H1. There is no
`/categories.txt`. Prettier already owns markdown formatting (`printWidth: 80`,
`proseWrap: always`) — so the only rules that could apply are the ones Prettier
enforces anyway.

This is the clearest example of the failure mode the Anthropic post describes:
an instruction file that contradicts itself, contradicts the repo, and
contradicts tooling, all in the same context window.

**Action:** delete outright. Prettier is the markdown standard.

### B3. `tools/README.md` documents a pipeline that was replaced 🟠

- Says the pipeline writes to `public/api/openings/` — that directory doesn't
  exist; output is `api/data/video-index.json`
- Says the DB is `data/videos.sqlite` — it's `tools/data/videos.sqlite`
- Documents `backfill-videos.js` as the recommended first step; the current
  entry point is `npm run pipeline --mode=…` and the maintained backfill script
  is `scripts/backfill-views.js`
- Points at `tools/analysis/analyze_top_openings.js` as _the_ analysis command;
  the actual pipeline is `python tools/analysis/run_pipeline.py`
- Refers to the project as "Chess Trainer" and uses F01/F02/F04 feature codes
  that appear nowhere else
- Heavy emoji use, against the design system's own rule

**Action:** rewrite as a thin index that points to the four pipeline READMEs
(which are current and good). Don't duplicate their content.

### B4. `project-overview.instructions.md` is a stale duplicate of `context.md` 🟠

253 lines, ~85% overlapping `memory-bank/context.md`. Where they differ, this
file is the wrong one:

- "Real-time popularity data from Lichess **master games**" — `CLAUDE.md` is
  explicit that stats are **all rated players**, and that UI must be labelled
  accordingly. This is the exact error the UI copy rule exists to prevent.
- Project structure diagram still shows
  `packages/api/src/data/  # JSON data (openings, courses, stats)`. That mirror
  was removed 2026-07-06; the directory now holds only `seed.sql`. `CLAUDE.md`
  says `api/data/` is canonical.
- "Testing: Manual testing + automated checks" — there are ~1,000 tests.
- Ends with a stray empty code fence.

**Action:** delete. `context.md` is the maintained version. Two files describing
one architecture guarantees one of them is wrong.

### B5. The 90% coverage rule is enforced by an exclusion list 🟠

`test-writer.md` and `coverage.yml` both mandate 90% branches/functions/lines/
statements. That threshold is currently met because `collectCoverageFrom`
excludes **19 paths**, including `search-service.js`, `eco-service.js`,
`llm-service.js`, `opening-data-service.js`, `database-service.js`,
`youtube-service.js` and all of `api/` — i.e. most of the actual backend.
Meanwhile `progress.md` lists "TASK006 — Coverage: Backend 90%+" as outstanding
work.

Not a docs bug per se, but the docs assert a quality bar the repo doesn't hold.

**Action:** either state the real bar ("90% on covered modules; exclusion list
in `package.json` is the backlog") or start shrinking the exclusion list. Don't
leave the claim unqualified.

### B6. Smaller drifts 🟡

| File                      | Claim                                      | Reality                                                  |
| ------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| `reactjs.instructions.md` | `simplified.css` is "~4,650 lines"         | 3,249 lines                                              |
| `reactjs.instructions.md` | 26-item migration checklist, 0 ticked      | 30 `.module.css` files exist                             |
| `CLAUDE.md`               | Worktree test-noise gotcha                 | No `.worktrees/` directory                               |
| `README.md`               | "1–5ms **client-side** filtering"          | Search is server-side (AD-016)                           |
| `README.md`               | `40M+` Lichess games                       | `context.md` says master games; CLAUDE.md says all rated |
| `python.instructions.md`  | Python used for "LLM enrichment pipelines" | LLM enrichment is Node                                   |
| `context.md`              | "Real-time data from Lichess master games" | All rated players                                        |
| `pipeline-reviewer.md`    | Lichess API "public, no key required"      | Explorer requires a token since 2026-03                  |

The `reactjs.instructions.md` checklist is the worst of these: a 26-item list
where nothing is ticked but 30 modules exist gives me an actively false picture
of migration state every time it loads.

---

## C. Over-constraint and conflicts (the Claude 5 problem)

### C1. `CLAUDE.md` is 43% regression logbook 🟠

147 of 343 lines are Gotchas — 20 bullets, several of them 15+ lines with
"Regression history:" narration. They load on **every single turn** of **every
session**, regardless of task.

They aren't equivalent. Three categories:

- **Genuinely load-bearing, non-obvious, still true** — keep in `CLAUDE.md`:
  Lichess explorer auth + proxy + no-vercel.json-header rule; `api/data/` is
  canonical; every route needs `Cache-Control`; never fetch large payloads on
  mount; never render fabricated data; host redirects belong in `vercel.json`;
  middleware matcher must exclude `sitemap.xml`/`robots.txt`.
- **Real but narrow** — belongs next to the code, as a comment or a scoped doc:
  `animation-fill-mode` stacking contexts, `overflow: clip` vs `hidden`, SPA
  scroll traps. These are CSS/React facts; they should live in
  `reactjs.instructions.md` or in the CSS file itself, not in the global
  preamble.
- **Should not exist** — the `tools/production/` gotcha (fix the code), the
  `.worktrees` gotcha (no such directory), the CRLF `format:check` gotcha (fix
  with a `.gitattributes` file, one line, permanently).

The rule of thumb worth adopting: **if a gotcha can be fixed in code or config,
fix it there instead of documenting it forever.** Three of the twenty qualify.

### C2. Direct contradictions across files 🟠

These reach me together, which is precisely the scenario the Anthropic post
calls out:

| Conflict                                                                  | Files                                                                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "No H1 headings" vs every doc using H1                                    | `markdown.instructions.md` vs all                                                      |
| "400 char lines" vs "break at 80" vs Prettier `printWidth: 80`            | `markdown.instructions.md` (internally) vs `.prettierrc`                               |
| "No emoji" (hard rule) vs emoji-structured review output + emoji headings | `SKILL.md` vs `pipeline-reviewer.md`, `tools/README.md`, `tests/README.md`, `SETUP.md` |
| Popularity = master games vs all rated players                            | `project-overview`, `context.md` vs `CLAUDE.md`                                        |
| `packages/api/src/data/` is where data lives vs `api/data/` is canonical  | `project-overview` vs `CLAUDE.md`, `context.md`                                        |
| Comment style: "Comment only to explain WHY" (blanket)                    | `code-standards.md` — a defensive rule of exactly the type Anthropic removed           |

### C3. `CLAUDE.md` Quick Rule 11: "Ask rather than assume requirements" 🟠

This is the single instruction most out of step with Opus 5. The current
guidance is the opposite: _make routine judgment calls yourself; check in only
when different readings would lead to materially different work._ A standing
instruction to ask converts an autonomous model into one that stalls on trivia.

Recommended replacement — the shape Anthropic publishes:

> Deliver what was asked, at the scope intended. Make routine judgment calls
> yourself, and check in only when different readings of the request would lead
> to materially different work.

### C4. Verification and process scaffolding that Opus 5 does anyway 🟡

- `code-standards.md` Code Review Checklist (7 items: "Names are clear", "No
  code duplication", "Tests cover new functionality") — generic quality
  restatement.
- `pipeline-reviewer.md`'s 40-item checklist — much of it ("no hardcoded API
  keys", "no SQL injection", "no unbounded loops") is baseline behaviour, not
  project knowledge.
- `testing.instructions.md`'s framework examples — Jest/Vitest/pytest syntax is
  not something the model needs shown.

Per the Opus 5 guidance, this scaffolding produces over-verification, not better
verification. **Keep the project-specific parts** (YouTube quota is 10,000
units/day; rematch mode costs zero API calls; idempotency is required; Lichess
explorer is 25 req/min) and **cut the generic parts.**

### C5. Instruction files are 60% code examples the model doesn't need 🟡

`javascript.instructions.md` is a `RateLimiter` class, a `retry()` function, a
progress-bar loop and a dotenv config block — generic patterns, none of them
project-specific. `python.instructions.md` is the same shape. `testing.md` is
framework boilerplate.

The genuinely valuable lines in those files are the small project-specific ones:
"relative imports for the shared package, not `@chess-trainer/shared`, because
package-name imports fail in Vercel builds" — that one line is worth the other
three hundred.

**Action:** compress each instruction file to its project-specific content. My
estimate is `javascript` → ~20 lines, `python` → ~15, `testing` → ~30,
`code-standards` → ~40. Roughly 1,000 lines out.

---

## D. Structural fit for Claude 5 / current Claude Code

### D1. The `.github/instructions/` mechanism is Copilot's, not Claude's 🟠

`applyTo: '**/*.jsx, **/*.tsx'` frontmatter is GitHub Copilot's
instruction-scoping mechanism. Claude Code doesn't read it. In practice, loading
happens because `CLAUDE.md` has a manually maintained routing table. That table
is a hand-rolled version of features Claude Code now has natively:

| Need                            | Current (manual)                | Native option                          |
| ------------------------------- | ------------------------------- | -------------------------------------- |
| Load React rules for React work | Table in `CLAUDE.md` → I choose | Skill with a triggering `description`  |
| Always-on facts                 | Inline in `CLAUDE.md`           | `CLAUDE.md` + `@path/to/file` imports  |
| Package-scoped rules            | One global table                | Nested `packages/web/CLAUDE.md`        |
| Runbooks (pipelines)            | `.agent/workflows/`             | `.claude/skills/`                      |
| Specialist reviewers            | `.claude/agents/` (broken)      | `.claude/agents/` **with frontmatter** |

If you keep `.github/instructions/` for Copilot compatibility, that's a
legitimate reason — but then it should be _only_ what Copilot needs, and
Claude-facing content should live in `.claude/`. Right now one set of files is
trying to serve two agents with different loading models, and serving neither
well.

### D2. The memory bank is the strongest part of the system ✅

`activeContext.md` (34 lines), `progress.md` (105), `context.md` (162),
`archive.md` (427, never auto-loaded) with enforced size caps and an explicit
"never append, replace" rule — this is good context engineering and predates the
guidance that now endorses it. The 2026-07-20 `activeContext.md` entry is a
model of a useful handoff: what broke, why, what changed, measured before/after,
what's left.

Two small notes:

- `progress.md` is at 105 lines against a 100-line cap, and its top entries run
  10+ lines against a "one-liner per task" rule. Mild drift.
- The size caps appear in **three** places (`CLAUDE.md` Gotchas, `CLAUDE.md`
  Memory Bank section, `workflow.instructions.md`). One should own it.

### D3. `user-journeys.md` ✅

143 lines, current to 2026-07-19, describes real shipped behaviour including the
mobile branch. No changes needed. Genuinely useful for E2E planning.

### D4. The pipeline READMEs ✅

`tools/video-pipeline/README.md` (374 lines), `course-discovery` (252),
`llm-enrichment` (348), `analysis` (347) are detailed, current, and correctly
scoped — they're read on demand when working in that directory, which is exactly
right. Keep as-is. The only issue is `tools/README.md` above them being wrong.

### D5. `feedback_update_docs.md` under `.claude/projects/…/memory/` 🟡

A machine-specific path (`C--Users-fred--chess-opening-explorer`) committed to
the repo. Its content — "update all related docs in the same PR" — is already
duplicated verbatim as a `CLAUDE.md` gotcha. Its list of directories to grep
includes two (`.agent/workflows/`, `.claude/agents/`) that don't function.

**Action:** delete the file; the rule already lives in `CLAUDE.md`. If you keep
it, fix the list of targets.

### D6. `.claude/settings.local.json` 🟡

The `allow` list has ~80 entries including several malformed Windows-path
commands with unbalanced quotes that can never match, and a hardcoded MCP server
UUID (`mcp__fc0380c6-…`). The hooks (auto-lint, type-check, block `.env`) are
sound and worth keeping. `/fewer-permission-prompts` would regenerate the allow
list cleanly.

---

## E. Recommended plan

Ordered by value per unit of effort. **Nothing below is done yet.**

### Phase 1 — Delete and fix (highest value, lowest risk)

1. Fix `package.json`: repoint the four `tools/production/` scripts, or remove
   them. Then delete the corresponding `CLAUDE.md` gotcha.
2. Delete `.github/instructions/markdown.instructions.md`.
3. Delete `.github/instructions/project-overview.instructions.md` (superseded by
   `context.md`).
4. Delete `.claude/SETUP.md` and
   `.claude/projects/…/memory/feedback_update_docs.md`.
5. Add `.gitattributes` (`* text=auto eol=lf`) → delete the CRLF gotcha
   permanently.
6. Delete the `.worktrees` gotcha.

**Effect:** ~600 lines of wrong or dead instruction gone; two real bugs fixed.

### Phase 2 — Revive what's broken

7. Create `.claude/skills/openingbook-design/SKILL.md` so `/openingbook-design`
   actually works.
8. Add frontmatter to `.claude/agents/pipeline-reviewer.md`; strip the emoji
   format and the generic half of the checklist. Delete `test-writer.md`.
9. Rewrite `design-system/README.md` with correct paths.
10. Rewrite `tools/README.md` as a 30-line index.

### Phase 3 — Right-size `CLAUDE.md`

11. Cut Gotchas from 20 to ~8, keeping only the always-true, non-obvious,
    cross-cutting ones. Move CSS/React-specific ones into the React
    instructions, strip the "Regression history" narration (git has it).
12. Replace Quick Rule 11 with the scope/judgement paragraph from C3.
13. Deduplicate: memory-bank size caps stated once; commands listed once.
14. Target ~150 lines from 343.

### Phase 4 — Compress the instruction files

15. Strip generic code examples from `javascript` / `python` / `testing` /
    `code-standards`; keep project-specific rules only.
16. Replace `reactjs.instructions.md`'s stale migration checklist with a
    generated count, or drop the checklist and keep the "modularize when you
    touch" rule.

### Phase 5 — Structural (needs your decision — see below)

17. Decide the `.github/instructions/` vs `.claude/skills/` question.
18. Decide `.agent/workflows/` — promote to skills, or fold into READMEs.
19. Run `/doctor` afterwards to check the result against Anthropic's own
    tooling.

**Projected end state:** ~5,700 lines → ~2,600, with the removed material being
either wrong, duplicated, or generic. Nothing project-specific is lost.

---

## Open questions

1. **Do you still use GitHub Copilot on this repo?** This determines whether
   `.github/instructions/` keeps its Copilot-shaped format or gets converted to
   Claude skills. If Copilot is gone, the whole directory can collapse into
   `.claude/`.
2. **Is `.agent/workflows/` used by another tool?** The `// turbo` markers
   suggest it was written for one. If nothing reads it, the content should
   become skills.
3. **The 90% coverage bar** — publish the real number and shrink the exclusion
   list over time, or keep the nominal bar and note the exclusions in the docs?
4. **`design-system/chats/`** — keep the transcripts as historical reference
   (they're never auto-loaded, so they cost nothing), or archive them out?
