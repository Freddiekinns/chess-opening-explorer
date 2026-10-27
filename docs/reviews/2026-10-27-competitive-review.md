# Competitive review — what we are, who else does it, what to build

**Date:** 2026-10-27 · **Scope:** openingbook.xyz on `main` at `dbbca29`,
against the opening-learning market as it stands in October 2026. **Builds on:**
TASK008 (February, `docs/archive/memory-bank-tasks/`) and the 2026-09-24 feature
review, whose verdicts still stand unless this review says otherwise.
**Question:** what makes us worth using over the alternatives, what do the
alternatives do well that we should adopt or adapt, and where should the next
month of effort go?

> **Evidence caveat.** Direct page fetches were blocked from this session, so
> competitor facts come from search results: app-store listings, developer
> posts, third-party reviews and vendor-written comparison pages (ChessAtlas,
> Chessmate, ChessFlare and Chessiverse each publish rankings with themselves
> first). Treat feature claims as self-reported, and pricing as indicative.
> Sources are listed at the end.

---

## 1. Summary

1. **Our moat has narrowed since September.** The backlog's thesis was that "no
   free tool walks _your_ games, finds _your_ recurring leak, and hands you the
   page, video and drill for it". The "walks your games" half is now common in
   paid apps: ChessAtlas and Chessbook import Lichess/Chess.com games and flag
   the move where you left your repertoire; Chess Prep Pro has a "blind spot
   finder"; Take Take Take (Carlsen's app) pulls Lichess games into an AI coach.
   What is still ours: **free, no account, no repertoire to build first, and
   every finding lands on a full page for that opening** (description, plans,
   style, videos, studies, live stats, practice). The deviation trainer must
   lean on those four things or it is a weaker copy of a $8/month app.
2. **"Your level" is now the expected default, not a differentiator.** Chessbook
   scores moves on results at your rating; Chessreps drills from real Lichess
   games; the LiChess Tools extension and Chessboard Magic let you practise
   against moves sampled at real-life frequency. Our practice mode, which plays
   one fixed named line, is the furthest behind the market of anything we ship.
3. **Memory is table stakes.** Every serious trainer (Chessable, Chessbook,
   ChessAtlas, Chessreps, Chessmate, Chess Tempo) has spaced repetition. We have
   none. #196 (practice memory) is the minimum, not a nice-to-have.
4. **Traps sell.** Chessmate added trap courses and a trap filter in July 2026;
   ChessMem ships 31 built-in traps; 85 of our matched video titles say "trap".
   Our re-scoped J2 (traps found mechanically from engine swing × club
   popularity) is still the right design; it is blocked on position facts.
5. **LLM coaches have arrived, and the credible ones are grounded.** Take Take
   Take's coach runs detectors over Stockfish output and uses the language model
   only to word the findings; reviewers warn the rest "describe a position
   confidently and wrongly". That is the architecture our AD-005 already
   demands. An LLM "why" belongs after position facts, not before.
6. **Search is a weakening channel.** Independent studies put the click loss on
   informational queries with an AI Overview at roughly a third to a half (Pew:
   8% vs 15% click-through). Our 12k description pages are exactly the content
   an overview summarises. Interactive things (practice, Analyse, scouting) and
   shareable artefacts are what an overview cannot replace.
7. **Two cheap ideas are new in this review** and use assets we already have:
   **opponent scouting** (Analyse already accepts any username) and **"your
   style" from your games** (our fixed style taxonomy covers every variation; no
   competitor has one at this scale).

**Recommendation in one line:** finish #195–#197, then make practice play like
real opponents (sparring v0) before building the deviation trainer, and use
scouting and the style profile as the cheap acquisition hooks. Details and
scores in §5.

---

## 2. What we are, and what is genuinely good

Verified against the code and docs today.

| Asset                                                                                                     | Who else has it                                                                                                    | How strong                                                                       |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **12,377 opening pages, one per named position, free and crawlable**                                      | chess.com/openings (fewer pages, history/pros/cons), 365chess, Wikibooks                                           | Strong breadth; depth is LLM prose, so trust is the risk                         |
| **Fixed style taxonomy on every variation** (`style-tags.json`, researched briefs, 43 wrong claims fixed) | Nobody at this scale. Chessiverse has ~500 opening guides; "chess DNA" style profiles exist for players, not lines | **Unique.** Underused: it drives search and tags, nothing personal               |
| **Video shelf per opening**, Jev-filtered, family fallback                                                | Chessable/Chessly sell their own videos; nobody curates YouTube per position                                       | Strong and free; YouTube is one click away, so it is convenience, not a moat     |
| **17,079 Lichess study chapters matched by FEN**                                                          | Lichess (unindexed, search by title only)                                                                          | Unique as an index; links out                                                    |
| **Live explorer with a rating-band level lens + notable games**                                           | Lichess explorer (the source), Chessbook (stats at your level), chess.com explorer (masters, Premium for depth)    | Good UX; data parity with Lichess at best                                        |
| **Analyse: any chess.com/Lichess username, no account**, family rollups, honest cards since #170          | Aimchess (40 games/month free, $7.99), Chessigma ($14–19), Lichess Insights, chess.com Insights (Premium)          | **Free and instant is a real edge.** Shallow: no trend, no repertoire, no memory |
| **Practice mode** on any page, mobile, hints, audio                                                       | Everyone, better: SRS, opponent sampling by level, scoring                                                         | **Weakest surface relative to the market**                                       |
| **Paste a game** → opening identified over the full corpus                                                | Chess.com/Lichess game review name the opening                                                                     | Parity; its value is as the door to the deviation post-mortem                    |
| **Fast, descriptive search** ("sharp gambits for Black") in milliseconds                                  | None of the trainers; chess.com search is name-only                                                                | Unique, but only matters once someone is on the site                             |

**The honest USP, in one sentence:** the only free, no-sign-up place where any
named opening has a page that explains it, shows how players at your level
actually play it, collects the best videos and studies for it, and lets you
practise it, and which can read your own games and send you to the right page.

The weakness hidden in that sentence: every clause is _reference_ until the last
two, and the last two are the thin ones.

---

## 3. The market in October 2026

Grouped by what the user is trying to do. ✅ = does it well, ◐ = partly, — = no.

| Job                                 | Chessable        | Chessbook               | ChessAtlas      | Chessreps / Chessmate    | Lichess (+ LiChess Tools)                     | Chess.com                    | Take Take Take  | Chessiverse        | **Opening Book**                                        |
| ----------------------------------- | ---------------- | ----------------------- | --------------- | ------------------------ | --------------------------------------------- | ---------------------------- | --------------- | ------------------ | ------------------------------------------------------- |
| Learn what an opening _is_          | ✅ paid courses  | ◐                       | ◐ "Read mode"   | ◐ curated lines          | ◐ studies                                     | ✅ opening pages             | —               | ✅ 500 guides      | ✅ **free, 12k pages**                                  |
| Stats at my level                   | —                | ✅                      | —               | ✅ real-game drills      | ✅ explorer bands                             | ◐ masters (+ own games)      | —               | —                  | ✅ level lens                                           |
| Is this move good? (engine)         | ◐ author's word  | ✅                      | ✅              | ◐                        | ✅ cloud eval                                 | ✅                           | ✅              | —                  | **—**                                                   |
| Traps                               | ✅ courses       | —                       | —               | ✅ trap courses + filter | ◐ community studies                           | ◐ lessons                    | —               | —                  | **—** (videos only)                                     |
| Memorise (spaced repetition)        | ✅ MoveTrainer   | ✅                      | ✅              | ✅                       | ◐ studies; extension                          | ◐                            | —               | —                  | **—**                                                   |
| Practise against realistic replies  | —                | ◐                       | —               | ✅                       | ✅ via LiChess Tools / Chessboard Magic       | ◐ bots                       | ◐               | ✅ human-like bots | **— (one fixed line)**                                  |
| Where did _my_ games leave my prep? | —                | ✅                      | ✅              | —                        | ◐ Player tab, manual                          | ◐ Game Review "book"         | ◐               | —                  | **— (slice 2 unbuilt)**                                 |
| Build a repertoire                  | ◐                | ✅ gaps, transpositions | ✅ PGN, library | ◐                        | ◐ studies                                     | ◐                            | —               | —                  | ◐ bookmarks                                             |
| Scout an opponent                   | —                | —                       | —               | —                        | ✅ Player tab; Chessboard Magic Opponent Prep | ◐ member's games in explorer | —               | —                  | **◐ (Analyse takes any name, but isn't framed for it)** |
| Explain _why_ in plain words        | ✅ human authors | ◐                       | ◐               | ◐                        | ◐ study comments                              | ◐ coach tips                 | ✅ grounded LLM | ◐                  | ◐ static LLM prose                                      |
| Track progress over time            | ◐                | ◐                       | ◐               | ✅ leaderboards          | ✅ Insights                                   | ✅ Insights (Premium)        | ✅ trends       | —                  | **—**                                                   |
| Price for the core                  | Courses paid     | Free ≤400 moves, $8/mo  | Freemium        | Freemium                 | Free                                          | Explorer depth Premium       | Free + paid     | Free + $9.99/mo    | **Free, no account**                                    |

### What each does that is worth stealing

- **Chessbook — model games.** "Guess the move" through real games that reach
  your repertoire's positions; reviewers single it out as something "barely any
  other site offers", and it teaches middlegame plans, which our pages only
  describe. We already fetch notable games per position (M1).
- **Chessbook — gap finding.** "You have no answer to 2.c3 and 31% of your
  opponents play it." This is §4.4 of the September review, now proven in a paid
  product.
- **ChessAtlas — deviation flag on every imported game.** The exact move you
  left prep. Our slice 2 is this, measured against theory rather than a
  repertoire you had to build first. That difference is our advantage: it works
  on the first visit.
- **Chessreps / LiChess Tools / Chessboard Magic — opponents sampled by real
  frequency.** The sparring mode we parked behind position facts. Chessboard
  Magic's repertoire trainer plays "your expected opponent's responses".
- **Chessmate — traps as a filter**, not just a course: "show me lines with a
  trap". Fits our Discover facets once traps exist.
- **Chessboard Magic Opponent Prep — two profiles side by side**, with an
  opening "SWOT" per colour. Free. This is the use case club and league players
  have every week.
- **Take Take Take — detectors first, LLM second.** Stockfish facts and named
  features go in, the model only words them. Plus a short "what to work on next"
  derived from your games.
- **Chessiverse — learn an opening, then play it against a bot that plays it.**
  The page → practice link we have, with a better opponent.
- **Aimchess — "compared with players at your rating".** A single benchmark line
  makes a personal stat mean something.

### What not to copy

- **Accounts, leaderboards, social feeds.** Retention mechanics for products
  with an audience. We have 3–40 search impressions a day; the September verdict
  on accounts stands.
- **Full-game review and accuracy scores.** One click on chess.com and Lichess.
  Fails the substitution test (TASK005, archived).
- **Paid courses or author content.** Not a one-developer business.
- **Ungrounded LLM chat ("ask the coach anything").** Cost per request and the
  fabrication risk AD-005 exists to stop.
- **Native apps.** Every new entrant is an app; our edge is a URL that works
  from a search result or a club chat. J7 (PWA) stays parked.

---

## 4. Gaps, ranked by how much they cost us

1. **Practice does not resemble real games.** One fixed line, the same opponent
   replies every time. Every competitor that does practice does better.
2. **Nothing comes back.** No memory, no SRS, no progress, no repertoire that
   persists beyond a bookmark. There is no reason for a second visit.
3. **We never say what is good.** No evaluation, no "dubious", no traps. Our
   pages say what is common; a learner needs to know what is _sound_.
4. **The personal loop is open.** Analyse → page ignores context (#195 open);
   nothing flows back from practice to Analyse.
5. **Acquisition relies on a channel that is shrinking.** Search impressions are
   flat and AI Overviews cut informational clicks. We have no shareable output
   and no tool someone sends a friend before a match.
6. **Explanations are static.** Fine for "what is the Caro-Kann", useless for
   "why not 4…Nf6 here". Competitors with human authors or grounded LLMs win
   this.

---

## 5. Scored candidates

**Method.** Each candidate is scored 1–5 on five criteria, weighted, and scaled
to 100:

| Criterion          | Weight | 5 means                                               |
| ------------------ | -----: | ----------------------------------------------------- |
| User value         |    30% | changes how a club player prepares                    |
| Differentiation    |    20% | nobody free does it, or it uses an asset only we have |
| Ease               |    20% | days of work, no new pipeline or decision             |
| Confidence         |    15% | proven by a competitor, our data or a user signal     |
| Loop / acquisition |    15% | creates a return visit or a reason to share the site  |

Sizes as in the September review: **S** days, **M** one to two weeks, **L**
several weeks.

| Rank | Candidate                                                 | Status      | Size | Val | Diff | Ease | Conf | Loop | **Score** |
| ---: | --------------------------------------------------------- | ----------- | :--: | :-: | :--: | :--: | :--: | :--: | --------: |
|    1 | Personal strip + "Drill this line" (#195)                 | Issue       |  S   |  4  |  3   |  5   |  4   |  4   |    **80** |
|    2 | Practice memory (#196)                                    | Issue       |  S   |  4  |  2   |  5   |  4   |  5   |    **79** |
|    3 | **Sparring v0**: opponent replies sampled by band share   | New framing |  M   |  5  |  3   |  3   |  3   |  5   |    **78** |
|    4 | Deviation trainer v1 + paste-a-game post-mortem           | Backlog     |  M   |  5  |  3   |  2   |  4   |  4   |    **74** |
|    5 | **Opponent scout** on Analyse                             | New         |  S   |  4  |  3   |  4   |  3   |  4   |    **73** |
|    6 | Divergence callout (#197)                                 | Issue       |  S   |  3  |  4   |  5   |  4   |  2   |    **72** |
|    7 | **Your style, from your games**                           | New         |  S   |  3  |  5   |  4   |  2   |  4   |    **72** |
|    8 | Repertoire from your games + gaps + PGN export            | Backlog     |  M   |  4  |  3   |  2   |  3   |  4   |    **65** |
|    9 | Traps (on position facts)                                 | Backlog     |  M   |  4  |  3   |  2   |  3   |  4   |    **65** |
|   10 | Run-over-run progress on Analyse                          | Backlog     |  S   |  3  |  2   |  4   |  3   |  4   |    **63** |
|   11 | Position facts (offline Stockfish, sound/dubious labels)  | Backlog     |  M   |  4  |  2   |  2   |  4   |  3   |    **61** |
|   12 | "Start here" shelf (#199)                                 | Issue       |  S   |  3  |  2   |  4   |  3   |  3   |    **60** |
|   13 | AI-search readiness (citable facts, AI referrers in #188) | New         |  S   |  3  |  2   |  4   |  2   |  4   |    **60** |
|   14 | Analyse bridge line (#198)                                | Issue       |  S   |  2  |  2   |  5   |  3   |  3   |    **58** |
|   15 | Shareable report card                                     | Backlog     | S–M  |  2  |  3   |  4   |  2   |  4   |    **58** |
|   16 | **Model games**: guess the move through notable games     | New         |  M   |  3  |  3   |  3   |  2   |  3   |    **57** |
|   17 | Grounded LLM "why this move" (after position facts)       | New framing |  L   |  4  |  3   |  1   |  2   |  3   |    **55** |
|   18 | Position graph (reach the 37% unreachable pages)          | Backlog     |  M   |  3  |  1   |  2   |  4   |  3   |    **51** |
|   19 | Accounts and sync                                         | Rejected    |  L   |  3  |  1   |  1   |  2   |  4   |    **44** |

The scores are a structured opinion, not a measurement. Two places where they
are most likely wrong: **style profile** (high differentiation, but we have no
signal anyone wants it, hence confidence 2) and **sparring v0** (the ease score
assumes the explorer-budget decision below goes our way).

### 5.1 The new and reframed candidates

**Sparring v0 — opponent replies sampled by band share (rank 3).** The September
review parked sparring behind position facts, to protect the 25 req/min explorer
token. Challenge: at today's traffic that constraint is theoretical. A practice
line is at most ~7 opponent moves; popular positions are CDN-cached for 24 hours
per band; and the page already fetches the current position's band data. A v0
that samples the opponent's reply from the selected band's move shares, with a
**per-session cap** (say 12 explorer calls) and a fallback to the named line
when the cap or a 429 hits, ships the market's expected behaviour now and needs
no new pipeline. The `explorer_error {status:429}` event in PostHog is the
tripwire, and the backlog already says what to do if it fires. When position
facts land, v0 switches its data source and keeps its UI. _Owner decision
needed:_ accept live (cached) explorer calls in practice with a cap, or keep
sparring behind position facts.

**Opponent scout (rank 5).** Analyse already takes any username. Add a framing
("Scouting an opponent?") and a view that answers the pre-match question: what
do they play as White and Black, how often, how they score, each line linking to
its page and to "Drill this line" in the colour you will have. Lichess's Player
tab and Chessboard Magic do the data; nobody hands you the page and a drill. It
is a tool people share in club chats before league nights, which is the
acquisition channel search is not giving us. Respect the existing analytics
rule: never send the username to PostHog.

**Your style, from your games (rank 7).** Join Analyse's per-opening counts to
`style-tags.json`: "68% of your games as Black are in solid, positional
openings; as White you play sharp gambits". Then suggest two or three openings
that fit or stretch that profile, from the "Start here" list. It is the only
idea here built on an asset no competitor has. Unlike the rejected "which
opening suits me?" quiz, it comes from what you actually play, so a chatbot
cannot answer it. Risk: it is a novelty unless it links to practice and pages.
The side-aware plans caveat (parked) applies: a tag does not say which side it
favours, so word it as "the openings you choose are…", not "you are…".

**AI-search readiness (rank 13).** Not a feature; a defence. Make each page's
hard facts (move order, ECO, game counts with dates, style tags, plan bullets)
easy to cite, and measure AI referrals (chatgpt.com, perplexity.ai,
gemini.google.com) in #188's monthly report. Small, and tells us whether the
channel is moving before we invest more in SEO. Read the `seo-crawl-graph` skill
before touching anything a crawler sees.

**Model games (rank 16).** Chessbook's best-reviewed feature. We have the game
ids from the explorer's top games; the PGNs need the Lichess game-export API,
which has its own rate limits. Worth doing after sparring, because it shares the
practice board and teaches what our pages only describe (middlegame plans). Low
confidence until notable-game link-out clicks show demand, as the September
review said.

**Grounded LLM "why" (rank 17).** The market confirms the shape: engine facts
and named features in, the model words them, every line replays legally. It
stays behind position facts. Do not ship an LLM explanation that is not
grounded; that is the one thing reviewers consistently punish.

### 5.2 What changes for the existing items

- **Deviation trainer (rank 4)** stays the headline, but its pitch changes. It
  is no longer "the only tool that does this"; it is "the one that works on your
  first visit, free, without building a repertoire, and sends you to the page
  and the drill". Ship it after sparring v0, so "drill this" opens a practice
  that resembles real games.
- **#198 bridge line** scores lowest of the open issues. Proposal: fold it into
  #195 (the strip and the bridge are two states of one slot: arrived from
  Analyse → strip; otherwise → bridge line). Owner's call; the issue is
  untouched apart from a comment.
- **#199 Start here** gains a second job: it is the suggestion list the style
  profile draws from.
- **Position facts** is unchanged in substance but now carries three features
  (labels, traps, grounded "why"), which strengthens the case for approving
  decision 4.

---

## 6. Recommended focus

```
Now   (1–2 wk)  #195 strip + ?practice= · #196 practice memory · #197 divergence
                (fold #198 into #195 if agreed)
Next  (2–3 wk)  sparring v0 (decision A) · opponent scout · your style profile
Then  (M each)  deviation trainer v1 + paste-a-game post-mortem
                · repertoire from your games (gaps, PGN export)
Platform        position facts (decision 4) → traps → grounded "why"
Measure         #188 report, plus AI referrers; watch practice_* and analyse_* events
Not now         accounts · full-game review · paid content · native apps · ungrounded chat
```

**Why this order.** The first block is already specified and makes the site
coherent: Analyse sends you somewhere useful, and practice remembers you. The
second block closes the biggest market gap (realistic practice) and adds the two
cheapest reasons for a new visitor to arrive and share the site. The deviation
trainer then lands on a practice mode worth being sent to. Position facts is the
one new pipeline, and three features justify it.

### Decisions for the owner

- **A. Sparring v0 on cached explorer calls**, capped per session, or wait for
  position facts? (Recommended: v0 now.)
- **B. Fold #198 into #195?** (Recommended: yes.)
- **C. Opponent scout and style profile into issues?** (Recommended: yes, as two
  S issues.)
- Still open from September: **2** board search, **3** repertoire, **4**
  position facts.

---

## Sources

Competitor features and prices (search results; vendor pages where noted):

- [Chessbook — Google Play](https://play.google.com/store/apps/details?id=com.chessbook.android&hl=en),
  [App Store](https://apps.apple.com/app/id6466343415),
  [developer's year review](https://mbuffett.com/posts/chessbook-year-review-2024/),
  [Matt Plays Chess review](https://mattplayschess.substack.com/p/chessbook-a-game-changer-for-adult),
  [64 Squares review](https://64squares.substack.com/p/chessbook-review),
  [ChessPivot review](https://www.chesspivot.com/en/reviews/chessbook)
- [ChessAtlas — listing](https://mwm.ai/apps/chess-openings-chessatlas/6770867404),
  [Product Hunt](https://hunted.space/product/chessatlas),
  [vendor comparison](https://chessatlas.net/blog/tool-comparisons/best-chess-opening-trainers-2026-honest-comparison-of-7-tools)
- [Chessreps — App Store](https://apps.apple.com/app/id6744000612),
  [Chessmate — listing](https://appshunter.io/ios/chess-openings-chessmate/id6780793638),
  [Chessmate vendor comparison](https://www.trychessmate.com/blog/best-chess-opening-trainer-apps-2026),
  [ChessFlare comparison](https://chessflare.com/resources/best-chess-opening-trainer),
  [ChessMem](https://apps.apple.com/dk/app/id6762509466)
- [Chessiverse — opening practice tools compared](https://chessiverse.com/compare/chess-opening-practice-tools-compared),
  [best app for practising openings](https://chessiverse.com/compare/best-app-for-practicing-chess-openings),
  [Chessiverse vs chess.com bots](https://chessiverse.com/compare/chessiverse-vs-chess-com-bots)
- [Dark Squares — opening trainers compared](https://darksquares.net/blog/chess-training-apps/best-chess-opening-trainers-2026-compared),
  [ChessDNA — best chess apps 2026](https://chessdna.app/learn/best-chess-apps-2026.html)
- [Chessable 2.9.6 release notes](https://www.apkmirror.com/?p=12873165),
  [Chessable training app comparison](https://chessiverse.com/compare/best-chess-training-app)
- [Chess.com Game Explorer — support](https://support.chess.com/en/articles/8615183-what-is-the-game-explorer),
  [Chess.com explore games and openings](https://www.chess.com/news/explore-games--openings-on-chesscom)
- [Lichess opening explorer](https://lichess.org/@/lichess/blog/opening-explorer/Vs0xMTAA),
  [LiChess Tools: practise with the opening explorer](https://lichess.org/forum/lichess-feedback/practice-with-opening-explorer-in-lichess-tools),
  [Chessboard Magic repertoire builder](https://lichess.org/@/HollowLeaf/blog/repertoire-builder-14-jan-2026-release/QUMETcfi),
  [Chessboard Magic Opponent Prep](https://lichess.org/@/HollowLeaf/blog/opponent-prep-updated/uk1kdQWg),
  [using the explorer to scout](https://zwischenzug.substack.com/p/how-to-use-the-opening-explorer)
- [Chess Prep Pro — App Store](https://apps.apple.com/us/app/-/id1606629475),
  [FlexiChess](https://www.producthunt.com/p/flexichess/flexichess),
  [OpeningTree — App Store](https://apps.apple.com/app/id882614935)
- [Take Take Take — App Store](https://apps.apple.com/us/app/-/id6754937311),
  [AI coach vs human coach](https://taketaketake.com/blog/ai-chess-coach-vs-human-coach),
  [AI Engineer talk: building a chess coach](https://ai.engineer/talks/building-a-chess-coach)
- [Chessigma — best chess AI tools](https://www.chessigma.com/blog/best-chess-ai-tools),
  [Chessigma Supercoach](https://www.chessigma.com/supercoach),
  [Aimchess](https://www.stork.ai/en/aimchess),
  [CheckmateX AI coach comparison](https://checkmatex.app/blog/best-ai-chess-coach-2026-tools-compared),
  [ChessCoach (open source)](https://github.com/CORDOC-LLC/ChessCoach)
- [Maia Chess](https://maiachess.com), [Maia blog](https://maiachess.com/blog),
  [Maia-2 model card](https://huggingface.co/shermansiu/maia2-rapid)
- [Chessly and the March 2026 book](https://www.penguinrandomhouse.com/gothamchess)

Search and AI Overviews:

- [Pew study summary](https://getcoai.com/news/googles-ai-overviews-cut-website-clicks-by-50-pew-study-finds/),
  [Search Engine Journal — publishers into 2026](https://www.searchenginejournal.com/google-ai-overviews-impact-on-publishers-how-to-adapt-into-2026/556843/),
  [Visionary Marketing — AI Overviews traffic 2026](https://visionary-marketing.co.uk/blog/ai-overviews-traffic-impact-2026),
  [Contently — AI Overview traffic impact](https://contently.com/2026/04/27/ai-overview-traffic-impact/)
