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

From Anthropic's 2026-07-24 post (Thariq Shihipar), which removed **80%+ of
Claude Code's system prompt** for Opus 5 / Fable 5 with no measurable loss on
coding evals. The six reversals it names, and what each one implies for this
repo:

| Then                 | Now                      | Implication here                                          |
| -------------------- | ------------------------ | --------------------------------------------------------- |
| Give Claude rules    | Let Claude use judgement | Blanket defensive rules now override legitimate intent    |
| Give Claude examples | Design interfaces        | Examples **constrain** the model to an exploration space  |
| Put it all upfront   | Progressive disclosure   | A tree of files loaded when relevant beats one big file   |
| Repeat yourself      | Simple tool descriptions | Duplication across files is cost, not insurance           |
| Memory in CLAUDE.md  | Auto-memory              | Claude now saves relevant memories itself                 |
| Simple specs         | Rich references          | HTML mockups / code / test suites beat prose descriptions |

The failure mode it diagnoses is **conflicting instructions arriving in one
request** — their own example was a system prompt saying "DO NOT add comments"
while a CLAUDE.md said "leave documentation as appropriate." Claude can usually
resolve the conflict, but has to spend reasoning doing it.

Its concrete prescription for CLAUDE.md is the part that matters most for us,
and it is not what I assumed on the first pass:

> Keep your CLAUDE.md lightweight and briefly describe what your repo is for,
> but **spend most of the tokens on gotchas inside of the codebase.** […] Avoid
> stating 'the obvious' things Claude should know by looking at your file system
> or your repo.

And for skills: "lightweight guides to let Claude find information when needed…
best when skills encode particular opinions, knowledge, or best practices that
are particular to you, your team, or product." Long skills should be split
across files.

The
[Fable 5 guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)
adds a blunter version: _"Skills developed for prior models are often too
prescriptive… and can degrade output quality. Review and consider removing older
instructions if default performance is better."_

**On `claude doctor`:** it exists (v2.1.220) and I ran it. The CLI form only
does installation health — it reported 3 install warnings, none related to docs.
The context-engineering right-sizing lives behind the interactive `/doctor`
slash command, which can't be invoked from a remote session. Worth you running
locally after we act on this, as a second opinion on the result.

Sources:
[The new rules of context engineering](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)
·
[Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5)
·
[Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)
·
[Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

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
2. **`CLAUDE.md` spends its tokens on the wrong half.** The Gotchas list (147 of
   343 lines) is the part worth keeping — it's what the post says CLAUDE.md is
   _for_. The other 196 lines mostly restate `package.json` and the directory
   tree, and list the same commands twice. See C1; this reverses my first-pass
   read.
3. **The structure is Copilot-shaped, and serves neither tool well.** The
   `.github/instructions/*.instructions.md` + `applyTo:` frontmatter pattern is
   GitHub Copilot's convention. Claude Code ignores `applyTo` entirely; those
   files only ever load because `CLAUDE.md` contains a hand-maintained routing
   table. Two mechanisms that would replace it outright — `.claude/rules/` with
   `paths:` frontmatter, and skills (an open standard across ~40 clients) — are
   unused. See D1 and D1c: the portable option and the Claude-native option are
   the same option here, so there's no trade-off to make.

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

### C1. `CLAUDE.md`'s problem is the other 196 lines, not the Gotchas 🟠

**This reverses my first-pass read.** I initially flagged the Gotchas section
(147 of 343 lines, 43%) as bloat to cut hard. The blog says the opposite:
gotchas are precisely what CLAUDE.md tokens should be spent on. The instruction
is to "spend most of the tokens on gotchas inside of the codebase" and to "avoid
stating the obvious things Claude should know by looking at your file system or
your repo."

By that standard the Gotchas section is the **best** part of the file, and the
other 196 lines are the problem. Roughly 145 of them restate what I can read
directly:

| Section                 | Lines | Where I'd get it anyway                            |
| ----------------------- | ----- | -------------------------------------------------- |
| Essential Commands      | 34    | `package.json` scripts                             |
| Data Pipeline Workflows | 46    | `package.json` again — and it duplicates the above |
| Project Structure tree  | 18    | `ls`                                               |
| Environment Setup       | 16    | `.env.example`, `package.json` engines             |
| Memory Bank tree        | 13    | `ls .github/memory-bank/`                          |
| Instructions table      | 12    | Replaceable by skill descriptions                  |
| Quick Start / Workflow  | 11    | Restates the memory-bank rules                     |

Worse, Essential Commands and Data Pipeline Workflows list overlapping commands
**twice in the same file** — the "repeat yourself" pattern the post retires
explicitly.

So the revised recommendation is a swap, not a cut:

- **Keep** the gotchas, including the CSS/React ones I'd earlier suggested
  relocating (`overflow: clip` vs `hidden`, `animation-fill-mode`, SPA scroll
  traps). These are genuine codebase gotchas with real regression history —
  exactly the category the post says to spend tokens on.
- **Cut** the derivable scaffolding above. If a command list is wanted, one
  short "commands live in `package.json`; the non-obvious ones are…" line covers
  it.
- **Fix in code, then delete** the three gotchas that are workarounds rather
  than facts: `tools/production/` (fix `package.json`), `.worktrees` (directory
  doesn't exist), CRLF `format:check` (one-line `.gitattributes`).
- **Trim the narration only** — several gotchas run 15+ lines with "Regression
  history:" prose. The fact is load-bearing; the story is in git. Halving the
  prose keeps every fact.

Net: ~343 → ~200 lines, with the gotcha share rising from 43% to roughly 70%.

Two independent confirmations of this from Claude Code's own documentation:

> **Size**: target under 200 lines per CLAUDE.md file. Longer files consume more
> context and reduce adherence.

> The `/doctor` checkup proposes trims for a checked-in CLAUDE.md: it **cuts
> content Claude can derive from the codebase, such as directory layouts,
> dependency lists, and architecture overviews**, and **keeps pitfalls,
> rationale, and conventions that differ from tool defaults.**

That is the swap described above, stated as a shipped feature. It also means
`/doctor` will likely propose roughly this change unprompted when you run it.

One free win while editing: block-level HTML comments (`<!-- … -->`) in
CLAUDE.md are stripped before the content reaches context. Maintainer notes cost
nothing — useful for recording _why_ a gotcha exists without spending tokens on
it every session.

### C1b. Quick Rules 1–11 are the "then" column 🟠

The 11 numbered rules at the top are blanket directives of exactly the kind the
post removed. Several are also things I'd infer from the codebase in one look
(TypeScript for React components; tests alongside source; named exports for
utilities). Rule 8 — "No console.log in production code" — is enforced by ESLint
already.

The post's own worked example is the replacement pattern. They swapped:

> In code: default to writing no comments. Never write multi-paragraph
> docstrings…

for:

> Write code that reads like the surrounding code: match its comment density,
> naming, and idiom.

`code-standards.md`'s "Write code that speaks for itself. Comment only to
explain WHY, not WHAT" is the same shape as the retired version, and should get
the same treatment.

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

### C5. Instruction files are 60% code examples — and examples now hurt 🟠

Upgraded from 🟡 after reading the post. I'd assumed the generic examples were
merely wasted tokens. The post is stronger than that:

> The number one rule for tool usage was to give Claude examples on how to use
> them. With our newest models, we've found that giving examples actually
> **constrains them to a certain exploration space.**

`javascript.instructions.md` is a `RateLimiter` class, a `retry()` function, a
progress-bar loop and a dotenv config block. `python.instructions.md` is a
`@dataclass`, a pathlib helper, a retry decorator and a logging block.
`testing.instructions.md` is Jest/Vitest/pytest boilerplate. None are
project-specific; all of them pin me to one shape of solution for problems where
the codebase may already have a better local idiom.

The genuinely valuable lines in those files are the small project-specific ones:
"relative imports for the shared package, not `@chess-trainer/shared`, because
package-name imports fail in Vercel builds" — that one line is worth the other
three hundred.

**Action:** delete the generic examples outright rather than trimming them.
Compress each file to its project-specific content: `javascript` → ~20 lines,
`python` → ~15, `testing` → ~30, `code-standards` → ~40. Roughly 1,000 lines
out.

---

## D. Structural fit for Claude 5 / current Claude Code

### D1. The `.github/instructions/` mechanism is Copilot's, and Claude has a direct equivalent 🟠

`applyTo: '**/*.jsx, **/*.tsx'` frontmatter is GitHub Copilot's
instruction-scoping mechanism. Claude Code doesn't read it. In practice, loading
happens because `CLAUDE.md` has a manually maintained routing table.

The important find: Claude Code shipped **`.claude/rules/` with `paths:`
frontmatter**, which is a near-exact analogue of Copilot's `applyTo:`.

```markdown
---
paths:
  - 'packages/web/src/**/*.{ts,tsx}'
---

# React rules

- Extract component CSS into `.module.css` when you modify styles
- Relative imports for the shared package — `@chess-trainer/shared` fails on
  Vercel
```

Rules with `paths:` load **only when Claude reads a matching file**. Rules
without `paths:` load every session at the same priority as `CLAUDE.md`. That is
exactly the loading model `.github/instructions/` was reaching for, and it works
without a routing table.

So the mapping is now one-to-one:

| Need                            | Current (manual)                | Native mechanism                       |
| ------------------------------- | ------------------------------- | -------------------------------------- |
| React rules when touching React | Table in `CLAUDE.md` → I choose | `.claude/rules/react.md` with `paths:` |
| Always-on facts                 | Inline in `CLAUDE.md`           | `CLAUDE.md` (keep it under 200 lines)  |
| Runbooks (pipelines)            | `.agent/workflows/`             | `.claude/skills/`                      |
| Design reference                | `design-system/…/SKILL.md`      | `.claude/skills/openingbook-design/`   |
| Specialist reviewers            | `.claude/agents/` (broken)      | `.claude/agents/` **with frontmatter** |

The distinction between rules and skills is worth getting right: **rules fire on
file paths** (good for "when you touch a component, use CSS Modules"); **skills
fire on task intent** (good for "run the video pipeline", "design a new
surface").

### D1b. Portability: AGENTS.md does _not_ work everywhere 🟠

Worth stating plainly, because most write-ups get it wrong. **Claude Code does
not read `AGENTS.md`.** From the official docs:

> Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If your repository already
> uses `AGENTS.md` for other coding agents, create a `CLAUDE.md` that imports it
> so both tools read the same instructions without duplicating them.

The feature request (issue #6235) has thousands of upvotes; Anthropic marked it
"not planned for now" in May 2026. So adopting `AGENTS.md` alone would make the
repo _less_ legible to your primary tool, not more.

The portable strategy that does work is a two-file split, which the docs endorse
explicitly:

```markdown
<!-- CLAUDE.md -->

@AGENTS.md

## Claude Code

Use plan mode for changes under `packages/api/src/routes/`.
```

`AGENTS.md` carries the tool-agnostic baseline — what the repo is, and the
gotchas. `CLAUDE.md` imports it and adds only Claude-specific content. Codex,
Cursor, Gemini CLI, Jules and friends read `AGENTS.md` natively; Claude gets it
via the import.

A symlink (`ln -s AGENTS.md CLAUDE.md`) also works, but **not for you** — you
develop on Windows, where symlinks need Administrator or Developer Mode. Use the
`@AGENTS.md` import.

**Where the gotchas should live:** in `AGENTS.md`. They're facts about the
codebase, not facts about Claude. Every tool benefits.

### D1c. Skills are the genuinely cross-tool standard ✅

This is the part that resolves the generic-vs-Claude-specific tension. Agent
Skills became an **open standard (agentskills.io) in December 2025** and is
implemented by GitHub Copilot, VS Code, Cursor, OpenAI Codex, Gemini CLI, Goose,
OpenCode and ~40 other clients. The `SKILL.md` format — YAML frontmatter with
`name` + `description`, progressive disclosure into supporting files — is the
same everywhere.

So converting `.github/instructions/` content into skills is **both** the
Claude-native move **and** the portable move. There's no trade-off to make here:
skills are more portable than the Copilot-flavoured `.instructions.md` files
they'd replace.

`.claude/rules/` is the one Claude-specific piece in the proposed structure.
That is a deliberate, contained exception — it's the only mechanism that gives
automatic path-scoped loading, and the content inside a rule file is plain
markdown that ports by copy-paste if you ever need it elsewhere.

### D2. The memory bank is the strongest part of the system — but it's now a hand-rolled auto-memory ✅🟠

`activeContext.md` (34 lines), `progress.md` (105), `context.md` (162),
`archive.md` (427, never auto-loaded) with enforced size caps and an explicit
"never append, replace" rule. This is good context engineering, and it predates
the guidance that now endorses it. The 2026-07-20 `activeContext.md` entry is a
model of a useful handoff: what broke, why, what changed, measured before/after,
what's left.

The complication is the post's fifth reversal:

> **Then: Memory in CLAUDE.md files. Now: Auto-memory.** We used to encourage
> users to save things to Claude's memory… Instead, Claude now automatically
> saves memories that are relevant to the work and to you.

The memory bank is a manual implementation of that, with a maintenance tax:
`CLAUDE.md` Quick Rule 10 ("Update activeContext.md after significant changes"),
three separate statements of the size caps, and a documented trim-and-archive
ritual.

I'd argue **against** dissolving it, and the docs give a harder reason than I
first had:

> Auto memory is **machine-local**. All worktrees and subdirectories within the
> same git repository share one auto memory directory. Files are **not shared
> across machines or cloud environments.**

You work across a Windows laptop and remote/web sessions. Auto-memory written in
one never reaches the other, so it cannot carry project continuity for you the
way the committed memory bank does. Plus:

- It's checked into git and reviewable in PRs. Auto-memory isn't.
- It's tool-agnostic — it works for Copilot, for you reading it directly, and
  for any future agent.
- `context.md` and `user-journeys.md` aren't memory at all; they're reference
  docs that happen to live in that folder.

But the _ritual_ around it should shrink. Concretely: state the size caps once
(not three times), drop Quick Rule 10 in favour of letting the archive rule in
`workflow.instructions.md` own it, and let auto-memory handle the
session-to-session continuity that `activeContext.md` currently carries by hand.
`progress.md` is already at 105 lines against its 100-line cap with 10-line
entries against a "one-liner per task" rule — the tax is visibly not being paid.

### D2b. The design-system bundle is a "rich reference" and should be treated as one ✅

The post's sixth reversal is the one this repo is best positioned to exploit:

> Instead of simple markdown files, Claude can reference HTML artifacts… A HTML
> mockup of a design will generally produce better results than a description of
> the design or a screenshot.

`design-system/project/` already contains exactly that: HTML prototypes, token
CSS, preview cards per token group, and pixel-fidelity React recreations of the
live landing app under `ui_kits/web/`. This is a higher-fidelity reference than
any prose style guide, and it's already committed.

It is currently unreachable for the reasons in A2 and A3 — the skill isn't
registered and the README's paths all 404. Fixing that wiring is the single
highest-leverage change in this audit: it converts a well-built reference asset
from inert into loadable.

Worth adding while we're there: the post mentions **rubrics** as a reference
form ("what does a good API design look like") that verifier agents can check
against. The design system's hard rules — British English, sentence case, no
emoji, orange only as a bookmark ribbon, mandatory result colours — are already
written as a rubric. They just need to be reachable.

### D3. `user-journeys.md` ✅

143 lines, current to 2026-07-19, describes real shipped behaviour including the
mobile branch. No changes needed. Genuinely useful for E2E planning.

### D4. The pipeline READMEs ✅

`tools/video-pipeline/README.md` (374 lines), `course-discovery` (252),
`llm-enrichment` (348), `analysis` (347) are detailed, current, and correctly
scoped — they're read on demand when working in that directory, which is exactly
right. Keep as-is. The only issue is `tools/README.md` above them being wrong.

### D5. `feedback_update_docs.md` under `.claude/projects/…/memory/` 🟡

Now identifiable: this is a stray **auto-memory** file. Auto-memory belongs at
`~/.claude/projects/<project>/memory/` and is machine-local by design; this copy
sits at `.claude/projects/C--Users-fred--chess-opening-explorer/memory/` inside
the repo and got committed. The path fragment is your Windows home directory.

Its content — "update all related docs in the same PR" — is already duplicated
verbatim as a `CLAUDE.md` gotcha, and its list of directories to grep includes
two (`.agent/workflows/`, `.claude/agents/`) that don't function.

**Action:** delete the file and add `.claude/projects/` to `.gitignore` so
machine-local auto-memory doesn't get committed again. The rule itself already
lives in `CLAUDE.md`.

### D6. `.claude/settings.local.json` 🟡

The `allow` list has ~80 entries including several malformed Windows-path
commands with unbalanced quotes that can never match, and a hardcoded MCP server
UUID (`mcp__fc0380c6-…`). The hooks (auto-lint, type-check, block `.env`) are
sound and worth keeping. `/fewer-permission-prompts` would regenerate the allow
list cleanly.

---

## E. Proposed target structure

Portable where a standard exists, Claude-specific only where nothing else
provides the mechanism.

```
AGENTS.md                       # Portable baseline: what the repo is + all gotchas
                                #   Read natively by Codex, Cursor, Gemini CLI, Jules…
CLAUDE.md                       # @AGENTS.md import + Claude-only additions (~20 lines)
.github/copilot-instructions.md # Only if Copilot is still in use — /init reads this

.claude/
├── rules/                      # Path-scoped, auto-loading (Claude-specific)
│   ├── react.md                #   paths: packages/web/src/**/*.{ts,tsx}
│   ├── api.md                  #   paths: packages/api/**/*.js, api/**/*.js
│   └── python.md               #   paths: tools/analysis/**/*.py
├── skills/                     # Open standard — portable across ~40 clients
│   ├── openingbook-design/     #   design system + HTML/React references
│   ├── video-pipeline/         #   from .agent/workflows/
│   ├── course-discovery/       #   from .agent/workflows/
│   └── popularity-stats/       #   from .agent/workflows/
└── agents/
    └── pipeline-reviewer.md    # with frontmatter this time

.github/memory-bank/            # Unchanged — git-tracked project state
tools/*/README.md               # Unchanged — on-demand deep reference
design-system/                   # Unchanged — the rich reference the skill points at
```

Retired: `.github/instructions/` (→ rules + skills), `.agent/workflows/` (→
skills), `.claude/SETUP.md`, `.claude/projects/`.

The only Claude-specific piece is `.claude/rules/`, and that's a deliberate
trade: nothing else offers automatic path-scoped loading, and the file contents
are plain markdown that ports by copy-paste.

**One caveat on `AGENTS.md`:** it only earns its place if a second tool actually
reads it. If Claude Code is the only agent you use here, the same content in
`CLAUDE.md` is simpler and one file fewer. See open question 1.

---

## F. Recommended plan

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

### Phase 2 — Revive what's broken (highest leverage)

7. Create `.claude/skills/openingbook-design/SKILL.md` so `/openingbook-design`
   actually works, pointing at the HTML prototypes and `ui_kits/web/` as
   references (per D2b — this is the repo's best rich reference and it's
   currently unreachable).
8. Add frontmatter to `.claude/agents/pipeline-reviewer.md`; strip the emoji
   format and the generic half of the checklist. Delete `test-writer.md`.
9. Rewrite `design-system/README.md` with correct paths.
10. Rewrite `tools/README.md` as a 30-line index.

### Phase 3 — Rebalance `CLAUDE.md` (revised — see C1)

11. **Cut the derivable scaffolding**, not the gotchas: Essential Commands, Data
    Pipeline Workflows (which duplicates it), Project Structure tree,
    Environment Setup, Memory Bank tree, Quick Start. ~145 lines.
12. **Keep all substantive gotchas**, including the CSS/React ones. Halve the
    "Regression history:" narration; keep every fact.
13. Drop the three gotchas that become obsolete once Phase 1 lands.
14. Replace Quick Rule 11 ("Ask rather than assume") with the scope/judgement
    paragraph from C3; replace `code-standards.md`'s blanket comment rule with
    "write code that reads like the surrounding code."
15. Deduplicate: memory-bank size caps stated once.
16. Target ~200 lines from 343, with gotchas rising from 43% to ~70% of the
    file.

### Phase 4 — Compress the instruction files

17. **Delete** the generic code examples in `javascript` / `python` / `testing`
    / `code-standards` — per C5 they actively constrain, so trimming isn't
    enough. Keep project-specific rules only.
18. Replace `reactjs.instructions.md`'s stale migration checklist with a
    generated count, or drop the checklist and keep the "modularize when you
    touch" rule.

### Phase 5 — Restructure (needs your decision on Q1 — see below)

19. Convert `.github/instructions/` → `.claude/rules/` with `paths:` frontmatter
    (react, api, python), carrying only the compressed content from Phase 4.
20. Convert `.agent/workflows/` → `.claude/skills/` (video-pipeline,
    course-discovery, popularity-stats). Delete `.agent/`.
21. **If a second tool is in play:** split `CLAUDE.md` into `AGENTS.md` (repo
    summary + gotchas) plus a thin `CLAUDE.md` that does `@AGENTS.md` and adds
    Claude-only content. Use the import, not a symlink — you're on Windows. If
    Claude Code is the only agent, skip this and keep one `CLAUDE.md`.
22. Add `.claude/projects/` to `.gitignore`.
23. Run `/doctor` **locally** afterwards (it can't run from a remote session) as
    a second opinion. Expect it to propose trims in the same direction as C1.

**Projected end state:** ~5,700 lines → ~2,600. Everything removed is wrong,
duplicated, derivable from the repo, or a generic example. Nothing
project-specific is lost, and the surviving `CLAUDE.md` is proportionally more
gotcha than it is today.

---

## Open questions

1. **Which agents besides Claude Code actually touch this repo?** This is now
   the load-bearing question. If the answer is "only Claude Code", skip
   `AGENTS.md` entirely — one `CLAUDE.md` is simpler, and `AGENTS.md` would be a
   file nothing reads. If Copilot, Codex or Cursor are in the mix, the
   `AGENTS.md` + `@AGENTS.md` split in section E is the right shape, and
   `.github/copilot-instructions.md` should be a stub pointing at `AGENTS.md`
   rather than a third copy of the rules.
2. **Is `.agent/workflows/` used by another tool?** The `// turbo` markers
   suggest it was written for one. If nothing reads it, the content should
   become skills.
3. **The 90% coverage bar** — publish the real number and shrink the exclusion
   list over time, or keep the nominal bar and note the exclusions in the docs?
4. **`design-system/chats/`** — keep the transcripts as historical reference
   (they're never auto-loaded, so they cost nothing), or archive them out?
5. **The memory bank vs auto-memory** (D2) — keep the manual bank for its
   git-reviewable, tool-agnostic properties and just shrink the ritual around
   it, or lean on auto-memory for session continuity and keep only `context.md`
   / `user-journeys.md` as reference docs? My recommendation is the former, but
   it's a preference call about how you want to read your own project history.
