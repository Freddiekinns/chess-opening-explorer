# Ideas

Every idea for making the site more useful to learners, with its status and what
testing it showed. Method in `operating.md` (The loop). Keep at least ten live
ideas while in discovery. Statuses: `untested`, `testing`, `promising`,
`killed`. Newest evidence first under each idea.

Seeded 2026-11-25 from week 1's research and Gate A, so nothing is lost. Week 1
generated few ideas and tested almost none: most of these are `untested`, and
the list is short of ten on purpose. The first night under the new manual widens
it.

## Live

### 1. Board-first play-through of a line — `testing`

A play button animates the line, pausing where players at your level split,
captioned from the `position-stats` shards; then play it from memory; then done.
(`gates/gate-a.md`, Revision 1.)

- 2026-11-25 (night 7): the shards cover all 12,377 positions; 1,330 of 1,885
  lines of 9+ ply with 5,000+ games have band data at every step.
- Owner, 2026-11-24: "possibly"; the animation was the owner's suggestion.
- Untested: whether an animated walk teaches more than the page's existing step
  buttons; whether a learner who lands from Google wants it; what it looks like
  on a phone; whether the pauses say anything a learner would care about.

### 2. Practice that teaches, not just checks — `untested`

Wrong-move message, show the line before asking for it, no band-blind extension
(night 4 found the Italian drill extends into 4.Nc3 Nxe4). Builds on PR #241's
hint arrow. `research/04` §3.

- Known: Practice finishes 5 of 13 starts (`baseline.md`); where the other 8
  stop is a `[local]` PostHog read not yet done.

### 3. Come back when something is due — `untested`

Memory of what you studied (#196), and a reason to return (reviews come due).
Week 1 found learners return only when something changed while they were away
(`research/02`), but #241's 2026-11-10 "no trainer" decision stands in the way.

### 4. Your own games against the book — `untested`

`/analyse` already links into pages with `ref=personal&username=…`, which the
page ignores (`research/01`). `research/05` judged it an optional later layer:
Analyse has ~15 users a month, and competitors make you build a repertoire
first.

### 5. Jump to the part of a video about this line — `untested`

Family lectures lead most shelves (61–93% by line length, Gate A Rev 1). If
creators' videos carry chapter timestamps, a page could link to the minute that
covers its line. Night 3 could not reach YouTube (captcha).

### 6. Questions built from real explorer data — `untested`

"What do 1400s play here?", "which reply scores best for Black at your level?" —
a chapter's questions without written prose (`research/04`).

## Killed

### Video-first study unit — `killed` 2026-11-24

Watch a video, then play the line. Killed by the owner in minutes: videos are
long family lectures that are not about the position, and a fitting line video
exists for only 3–10% of lines (night 7's count). The test that would have
killed it — does the content exist for the lines it must cover? — was not run
before it went to the owner. That is the lesson the new manual is built on.
