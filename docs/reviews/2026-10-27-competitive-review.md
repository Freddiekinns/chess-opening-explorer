# Turn 12,377 reference pages into practice

**Date:** 2026-10-27 · **Supersedes** the first-pass version of this file
(commit 2d8ebf7, same day). Research notes behind every claim:
`docs/reviews/2026-10-27-competitive-review-notes/`.

**As of 27 October 2026, openingbook.xyz is an unusually broad free reference
with a thin improvement layer, and the market has moved so that its best
remaining edge is the landing page itself, not the "your games" moat the backlog
was built on.** The site gives every one of 12,377 named positions a crawlable
page with prose, plans, a researched style taxonomy, curated videos and studies,
and live Lichess statistics by rating band, and it reads any Chess.com or
Lichess username without an account. Its practice mode replays one fixed line
with no memory, it never says whether a move is sound, and its popularity
numbers are fifteen months old and undated. Meanwhile "where did my game leave
my prep" has moved from niche paid apps into Chess.com's own Game Review, spaced
repetition is free in several no-account trainers, and players' loudest
complaint across every tool is that they drill lines they never meet at their
level. The highest-value work is therefore not new surfaces but making each
Google landing page answer "what will I actually face at my rating, and can I
rehearse it against realistic replies": the divergence callout (#197), sparring
against band-sampled replies, and practice memory (#196), with #195 absorbing
#198. Traffic is so small (about 100 visitors a month, 66 of 69 PostHog people
came once) that first-visit value beats retention mechanics, and any AI text
must stay grounded because even frontier models get about one chess claim in
five wrong. The evidence behind the market half of this report is thinner than
it looks: it comes from search snippets, much of it vendor-written, with no
direct Reddit access.

## The site today is a rich reference with an open loop

The product has four routes: Discover, the opening detail page, Analyse and
Repertoire, with paste-a-game as a modal on the landing page
([App.tsx](../../packages/web/src/App.tsx)). The detail page is the product. It
carries an LLM description and common plans, style tags, a win-rate overview, a
"level lens" over live Lichess explorer data in bands from under 1400 to
masters, "Instead of…" alternatives, up to 15 notable master games that link
out, and galleries of matched YouTube videos and Lichess studies
([explorer.routes.js](../../packages/api/src/routes/explorer.routes.js);
[user-journeys.md](../../.github/memory-bank/user-journeys.md)). Practice
replays the page's named line for a chosen colour, extended by up to six plies
along the most-played named child, with hints after two misses; it stores
nothing, and there is no `?practice=` parameter
([OpeningDetailPage.tsx](../../packages/web/src/pages/OpeningDetailPage.tsx)).
Analyse fetches up to 500 rated rapid, blitz and classical games for any
username, groups them by family and colour, and shows "Top-performing" and
"Needs work" cards that since #170 require at least three games
([personalStatsLib.ts](../../packages/web/src/components/personal/personalStatsLib.ts)).
It keeps no history, does not split time controls, and its links to detail pages
carry `?ref=personal` parameters that nothing reads. Repertoire is a
localStorage bookmark list with no colour split and no export
([RepertoirePage.tsx](../../packages/web/src/pages/RepertoirePage.tsx)).

The data behind the pages is broad but mostly borrowed or generated. **All
12,377 positions have LLM-written descriptions and plans**, and the only audit
so far, 105 researched style briefs, **found 43 wrong claims in 32 of them**
(the Dragon page described the Accelerated Dragon); those 43 were fixed, and the
rest of the corpus is unaudited ([backlog](../../docs/backlog.md)). The style
taxonomy in `style-tags.json` is the most distinctive asset: six one-value axes
over 1,411 variations, built from research briefs, classifier agents and a
judge. Its weak axis matters for the backlog, because **1,305 of 1,411
variations are "intermediate" and only 22 are "beginner"**, so the Discover
"Difficulty" facet barely filters. The video index places 1,452 unique videos
from 18 channels across 68% of pages, with Daniel Naroditsky and Hanging Pawns
supplying 60% of placements. Studies cover 36.4% of pages and are links only.
Popularity statistics date from 15 July 2025, and the detail card and Discover
disagree on 1.e4 c5 (693M against 542M games) with neither dated on screen
([2026-09-24 feature review](../../docs/reviews/2026-09-24-feature-review.md)).
About 37% of named boards cannot be reached by clicking, and unnamed
continuations are inert "off-book" rows.

Usage is tiny and arrives through search. The October baseline recorded **102
Vercel visitors and 220 page views in 30 days, about 69 real people in PostHog
of whom 66 came once**, and Search Console at roughly 500 impressions and 14
clicks a week at an average position near 7.6, after a quality purge on 30 to 31
July 2026 that pre-rendering has only partly repaired
([archive.md](../../.github/memory-bank/archive.md)). Google lands people on
obscure named lines (O'Neill, Papa-Ticulat, Linder); of 31 Google-to-detail
sessions, seven used the level tabs, four practised and two searched, and no
real user clicked a video. That last detail matters: the long-tail detail page
is where almost every visitor meets the product, and Analyse, which several
backlog items depend on, is not where they arrive.

### Which unique selling points survive scrutiny

| Asset                                                     | Who else has it (October 2026)                                                                                                                                                                                                                                                                                                                                                                       | Verdict                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A free, crawlable page for each of 12,377 named positions | Lichess opening pages with volunteer text, W/D/L and share ([Lichess Opening](https://lichess.org/opening)); Wikibooks with 2,463 pages ([Wikibooks](https://en.wikibooks.org/wiki/Category:Book:Chess_Opening_Theory)); Chess.com's 3,000 lines ([Chess.com Openings](https://www.chess.com/openings)); Chessiverse's 500 to 550 guides ([Chessiverse](https://chessiverse.com/resources/openings)) | **Real.** Breadth plus combination is unmatched; trust rests on unaudited LLM prose       |
| Live stats by rating band, framed for learners            | Lichess explorer (the source); Chessbook's 3.2M-game stats by rating ([Chessbook blog](https://chessbook.com/blog))                                                                                                                                                                                                                                                                                  | **Parity on data, edge on framing.** Not a moat                                           |
| Fixed style taxonomy over 1,411 variations                | No one at variation scale; player-style profilers exist ([Chessiverse quiz](https://chessiverse.com/chess-style-quiz))                                                                                                                                                                                                                                                                               | **Unique but underused**, and its level axis is weak                                      |
| YouTube and study curation per position                   | Chessvision.ai's Video Opening Explorer finds videos for a position ([chessvision.ai](https://chessvision.ai/blog/)); Lichess searches studies by title only                                                                                                                                                                                                                                         | **Real for studies, weaker for video** than earlier assumed; no recorded user demand      |
| Analyse: any username, no account, 500 games              | Chess.com Opening Insights is Diamond-only ([Chess.com support](https://support.chess.com/en/articles/8708925-what-is-insights-on-chess-com)); ChessMonitor and Chesscope are free ([ChessMonitor](https://chessmonitor.com); [Chesscope](https://alternativeto.net/software/chesscope/about/))                                                                                                      | **Real but shallow**; free no-account stats are plentiful, the link to a full page is not |
| Practice on any page                                      | Almost every trainer, mostly better                                                                                                                                                                                                                                                                                                                                                                  | **Weakest surface** relative to the market                                                |

The honest one-line USP is that openingbook.xyz is the only free, no-sign-up
place where any named opening, including the obscure ones Google sends people
to, has a page that explains it, shows what players at your rating actually play
from it, and gathers the videos and studies for it. Everything after "lets you
practise it" in the earlier review's USP sentence is aspiration rather than
fact.

## Rivals now sell relevance and memory, and both are getting cheaper

The opening market splits into course libraries with drills (Chessable, Chessly,
ChessMood, Chessmate, Chessreps), build-your-own trainers (Chessbook,
ChessAtlas, ChessFlare, Chess Tempo, Listudy, Chess Prep Pro and a long tail),
personal analytics and scouting tools (Aimchess, Chess.com Insights,
ChessMonitor, Chesscope, Chessboard Magic), AI coaches (Take Take Take,
Chess.com Coach, DecodeChess, Chessiverse, Noctie), and free reference sites
(Lichess, Wikibooks, 365chess, Chess.com). The table below keeps to what the
notes could source; prices conflict across sources and should be read as ranges.

| Product                         | What it does well                                                                                                                                                                                                                                                                                                                        | What players praise                                                                                                                | What players complain about                                                                                                                                                                                                                                                                                    | Free tier                                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Chessable / Chess.com Courses   | Authored courses, MoveTrainer spaced repetition, Priority Lines from real games, free Repertoire builder ([Chess.com news](https://www.chess.com/news/view/announcing-chessable-3); [Chessable blog](https://www.chessable.com/blog/chessables-new-repertoire-feature-turns-you-from-active-learner-to-architect-of-your-chess-growth/)) | Explained ideas make lines memorable ([64squares](https://64squares.substack.com/p/chessable-is-better-than-i-thought))            | Drilling rare lines ([datajunkie](https://lichess.org/@/datajunkie/blog/4-lifetime-repertoires-10-things-to-avoid-when-learning-openings-on-chessable/SedowvEI)); price; app crashes and no per-variation review ([JustUseApp](https://justuseapp.com/en/app/1523279049/chessable-learn-chess-online/reviews)) | 5 courses; Basic capped at 10 variations a month on Chess.com ([Announcing Courses](https://www.chess.com/news/view/announcing-courses)) |
| Chessbook                       | Gap finding ("biggest gap"), stats at your rating, 45,000 model games ([Chessbook blog](https://chessbook.com/blog))                                                                                                                                                                                                                     | "Only the moves you'll actually face" ([mattplayschess](https://mattplayschess.substack.com/p/chessbook-a-game-changer-for-adult)) | Explains less than authored courses; support gaps ([64squares](https://64squares.substack.com/p/chessable-is-better-than-i-thought); [Chess.com forum](https://www.chess.com/forum/view/chess-openings/how-helpful-is-chessbook))                                                                              | 200 or 400 moves (sources conflict); Pro about $7 to $8 a month ([chessbook.com](https://chessbook.com/))                                |
| ChessAtlas                      | Deviation flag on every imported game, FSRS, free ([ChessAtlas pricing](https://chessatlas.net/pricing))                                                                                                                                                                                                                                 | Little independent voice; Product Hunt #350 of the day ([hunted.space](https://www.hunted.space/dashboard/chessatlas))             | Not found                                                                                                                                                                                                                                                                                                      | 200 variations, two linked accounts                                                                                                      |
| Chess Prep Pro                  | No account, no move limit, engine, Blind Spot Finder (premium) ([chesspreppro.com](https://chesspreppro.com/))                                                                                                                                                                                                                           | Not found                                                                                                                          | Ads on Android                                                                                                                                                                                                                                                                                                 | Unlimited repertoires                                                                                                                    |
| LiChess Tools Explorer Practice | Computer replies at real explorer frequencies by rating ([Lichess forum](https://lichess.org/forum/lichess-feedback/practice-with-opening-explorer-in-lichess-tools))                                                                                                                                                                    | 10K+ users ([Chrome Web Store](https://chromewebstore.google.com/detail/langlhlcknngldkeliapahbhbcmlcbcj))                         | Desktop extension only                                                                                                                                                                                                                                                                                         | Free                                                                                                                                     |
| Chessly                         | Short videos, plan quizzes, Maia-based "Levi" bot ([ChessPivot](https://www.chesspivot.com/en/reviews/chessly))                                                                                                                                                                                                                          | Videos and the bot ([Chess.com forum](https://chess.com/forum/view/general/gotham-chess-new-chessly-course?page=4))                | "90% of the lines learned don't make it into my games" (same thread)                                                                                                                                                                                                                                           | 7-day trial                                                                                                                              |
| Chessiverse                     | ECO guides with plans, popularity and win rates, then play the opening against a human-like bot ([Chessiverse openings](https://chessiverse.com/resources/openings))                                                                                                                                                                     | Not found independently                                                                                                            | No spaced repetition ([Chesspivot](https://www.chesspivot.com/en/reviews/chessiverse))                                                                                                                                                                                                                         | Paid from about $7.50 a month                                                                                                            |
| Take Take Take                  | Free AI coach over Lichess games: Stockfish evaluates, detectors extract concepts, the LLM only words them ([ai.engineer](https://ai.engineer/talks/building-a-chess-coach))                                                                                                                                                             | 4.4 from 133 App Store ratings ([App Store](https://apps.apple.com/us/app/take-take-take-chess/id6754937311))                      | "Slop machine" critique of invented positional claims ([Intermediate Moves](https://intermediatemoves.substack.com/p/taketaketake-game-review-is-a-slop))                                                                                                                                                      | Free                                                                                                                                     |
| Chessboard Magic                | Two-profile Opponent Prep with a colour-split opening SWOT ([HollowLeaf](https://lichess.org/@/HollowLeaf/blog/opponent-prep-updated/uk1kdQWg)); database or engine practice opponents ([wiki](https://wiki.chessboardmagic.com/Practice_Opponents))                                                                                     | Not found                                                                                                                          | Not found                                                                                                                                                                                                                                                                                                      | Core free                                                                                                                                |
| Lichess                         | Free explorer with Masters, rating-band and Player tabs; opening pages ([Lichess blog](https://lichess.org/@/lichess/blog/opening-explorer/Vs0xMTAA))                                                                                                                                                                                    | Free and deep                                                                                                                      | No native trainer, requested for years ([lila #8118](https://github.com/lichess-org/lila/issues/8118))                                                                                                                                                                                                         | All free                                                                                                                                 |

Three movements change the picture since the backlog was written. First,
**Chess.com has absorbed the deviation idea into the platform**: Game Review
Course Check (May 2026) shows where your game left your courses, and from 8
September 2026 the coach flags repertoire deviations and offers "Study" back
into the course line
([Game Review Course Check](https://www.chess.com/news/view/announcing-game-review-course-check);
[Chess.com news](https://www.chess.com/news/member/chesscom)). Free Game Review
already names the opening and treats the last book move as the first key move,
one game a day
([Chess.com support](https://support.chess.com/en/articles/8584089-how-does-game-review-work)).
Second, **relevance is now marketed by the leaders**: Chessable's Priority
Lines, Chess Tempo's frequency-first learning order and Chessbook's stats at
your level all exist so that players drill what they will meet
([Chess Tempo](https://chesstempo.com/opening-training/)). Third, **spaced
repetition, PGN import and game sync are commoditised**: a crowd of free or
cheap trainers launched in 2025 and 2026, many with self-serving "best trainer"
comparison pages, and none has broken out; outside Chessable's 500K+ downloads
and 17K reviews, public traction is thin
([Google Play](https://play.google.com/store/apps/details?id=com.chessable.chessable&hl=en_US);
[Chessreps](https://play.google.com/store/apps/details?id=com.chessreps.app&hl=en_US)).

One infrastructure fact constrains everyone who builds on Lichess: since March
2026 the explorer accepts only authenticated requests at 25 a minute per
account, according to a third-party tool's README
([Snouzy/chess-trainer](https://github.com/Snouzy/chess-trainer)). That is the
same budget our single-token, CDN-cached proxy already lives within.

## Players want to drill only what they will face, and to know why

The single most consistent complaint across forums, blogs and app reviews is
about relevance, not quantity. Improvers report hours spent on lines they never
meet: a Chessable reviewer argues that rare engine lines weigh the same as
common ones so "reviewing isn't very practical"
([datajunkie](https://lichess.org/@/datajunkie/blog/4-lifetime-repertoires-10-things-to-avoid-when-learning-openings-on-chessable/SedowvEI)),
a commenter calls this Chessable's biggest flaw
([SayChess](https://saychess.substack.com/p/an-interview-with-marcus-buffett/comments)),
and an adult improver describes being "overwhelmed and frustrated" before
switching to Chessbook
([mattplayschess](https://mattplayschess.substack.com/p/chessbook-a-game-changer-for-adult)).
The standard advice is to set the explorer to your rating and time control and
"focus on the moves that are most common at your level, not necessarily the
'book' moves"
([Zwischenzug](https://zwischenzug.substack.com/p/how-to-use-the-opening-explorer)).
A small sample of 2000-level Lichess blitz games left mainstream theory between
moves 3 and 10
([Lichess forum](https://lichess.org/forum/general-chess-discussion/white-player-vs-sicilian-which-sicilian-gives-the-least-theory-to-learn-please?page=3));
no figure exists for 800 to 1500, where departures are presumably earlier.

The second complaint is "I don't know why". Chessable's defenders cite authored
explanation
([64squares](https://64squares.substack.com/p/chessable-is-better-than-i-thought))
and Chessly's fans cite plan quizzes rather than rote moves
([r/GothamChess mirror](https://lr.in.psf.lt/r/GothamChess)). Coaching
consensus, much of it second-hand, points the same way: a small repertoire,
understood rather than memorised, from roughly 900 to 1000 upwards
([Listudy, reporting Naroditsky](https://listudy.org/en/blog/when-to-learn-chess-openings)),
little value in memorising long lines
([Lichess forum, quoting Heisman](https://lichess.org/forum/general-chess-discussion/how-should-i-study-chess-openings)),
and traps learnt mainly so you do not fall into them
([ChessBase](https://en.chessbase.com/post/learn-the-best-opening-traps)).
Retention advice converges on spaced repetition that "only works if you actually
do it", recall from memory, understanding the idea and playing the lines in
games
([Zwischenzug](https://zwischenzug.substack.com/p/how-to-stop-forgetting-your-openings)).

Read together, the jobs form one loop: see what is common at my rating, choose a
small set of replies, rehearse them against realistic opposition, and check
where my real games left them. **No free tool owns the whole loop.** Lichess has
the first and last steps but no trainer, and its users keep asking for one,
including a bot that varies sub-variations
([Lichess forum](https://lichess.org/forum/lichess-feedback/learning-openings-with-bots-?page=1)).
Chessbook comes closest and is paid beyond its cap. Opponent preparation is a
smaller but intense job for club and league players, who spend "10–15 minutes
most weeks" and warn about small samples
([pulsar512b](https://en.lichess.org/@/pulsar512b/blog/prep-a-discussion/5C1Uu2Ze));
OpeningTree, once the favourite, is listed as discontinued
([AlternativeTo](https://alternativeto.net/software/openingtree/about)). "Which
opening suits me?" is a real but softer job served by quizzes
([Chessiverse](https://chessiverse.com/chess-style-quiz);
[Chess.com](https://www.chess.com/news/view/chess-personality?page=4)). The
table summarises the jobs and how well we serve each today.

| Job                                      | Strength of signal              | Our coverage today                                                                                                  |
| ---------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Learn only what I will face at my rating | High                            | Partial: level lens shows band moves, but nothing says "this is what you will meet, and this is where you can stop" |
| Remember my lines                        | High                            | None: practice has no memory                                                                                        |
| Practise against realistic replies       | Medium, unmet in free web tools | None: one fixed line                                                                                                |
| Understand why, from a trusted source    | Medium to High                  | Partial: static LLM prose, partly unaudited                                                                         |
| See where my games left theory           | Medium                          | None beyond identifying the opening                                                                                 |
| Prepare for a named opponent             | Low to Medium, intense          | Partial: Analyse accepts any username but is not framed for it                                                      |
| Pick an opening that suits me            | Medium                          | Partial: style facets and search, no personal profile                                                               |

## Grounded AI is the only kind players will trust

The AI evidence is unusually consistent. Frontier models without tools still get
chess facts wrong: the ACT-Eval preprint found **22.0% of atomic claims
incorrect for GPT-5.4 without tools and over 40% for smaller open models**, with
tools fixing facts but not strategic coverage, and a naive LLM judge awarding
near-perfect scores to fluent but unfaithful commentary
([arXiv 2608.04240](https://arxiv.org/abs/2608.04240)). Raw models still play
illegal moves in a third of positions or more
([arXiv 2601.16823](https://arxiv.org/pdf/2601.16823)). Engaged players notice:
ChatGPT named the right family but wrong variation and misdescribed a structure
([Zwischenzug](https://zwischenzug.substack.com/p/my-new-ai-chess-coach)), and
an AI opening builder's annotations were "often wrong and lacked substance"
([SayChess](https://saychess.substack.com/p/openinggpt-is-ready-with-its-first/comments)).

The products that are taken seriously keep the model out of the calculation.
Take Take Take's published design is "Stockfish evaluates, detectors extract
tactical concepts, the LLM just translates into English", with expert review of
scenarios and a feedback loop that revises detectors
([traeai summary](https://www.traeai.com/articles/e50e3576-4fcf-4f7b-aafd-63bbeaf370bf);
[ai.engineer](https://ai.engineer/orgs/take-take-take)), and it still drew a
public critique for claims no detector checked
([Intermediate Moves](https://intermediatemoves.substack.com/p/taketaketake-game-review-is-a-slop)).
Concept-guided commentary ranks concepts with an expert model before the LLM
speaks ([arXiv 2410.20811](https://arxiv.org/abs/2410.20811)). For
openingbook.xyz this cuts two ways. It confirms AD-005 and the backlog's
"grounded why after position facts" ordering. It also exposes a liability
already in production: our 12,377 descriptions are exactly the untooled LLM
output the benchmark measures, and our own audit found wrong claims in roughly
30% of the briefs it checked. That is a stronger case for auditing what we
already publish than for generating anything new.

Human-like move models offer a hallucination-free form of AI. Maia-2
(NeurIPS 2024) is a rating-conditioned move predictor whose code is
MIT-licensed, and a developer runs a 22.7 MB quantised rapid model in the
browser with ONNX Runtime Web ([CSSLab/maia2](https://github.com/CSSLab/maia2);
[DEV Community](https://dev.to/mrdimosthenis/why-stockfish-isnt-enough-running-maia-2-in-the-browser-for-human-chess-analysis-53no)).
Maia-3 (May 2026) claims state-of-the-art accuracy across 600 to 2600 with
checkpoints down to about 10.8 MB, but its repository and largest model card are
AGPL-3.0 while another card says CC BY 4.0
([CSSLab/maia3](https://github.com/CSSLab/maia3);
[Hugging Face](https://huggingface.co/UofTCSSLab/Maia3-79M)). Chessly's practice
bot is reportedly Maia-based
([ChessPivot](https://www.chesspivot.com/en/reviews/chessly)). A Maia reply is a
prediction, not a statistic, so it must be labelled "a model's guess at typical
1400 play", but it never writes a sentence and it costs no explorer calls. It is
a credible fallback for sparring once the explorer runs thin or the per-session
cap is reached, subject to the owner's licence call.

## Search still pays, but only for pages a summary cannot replace

The evidence on AI search is directionally clear and numerically wide. Pew found
users clicked a traditional result on 8% of visits with an AI summary against
15% without
([Pew](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/));
Ahrefs measured **−58% click-through at position 1 but about −19% at position
10** in December 2025 data
([Ahrefs](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/?pp=iaqb));
a randomised study found −39.8% organic clicks
([PPC Land](https://ppc.land/ai-overviews-cut-publisher-clicks-39-8-in-first-randomized-study/));
and sources cited inside an overview recovered about 35% more clicks
([Seer Interactive](https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-september-2025-update)).
AI chatbots sent only 0.25% of worldwide referrals in August 2026
([upgrowth, citing Statcounter](https://upgrowth.in/ai-traffic-share-report-2026/)),
and 60% of AI-referred visits land on home pages
([SE Ranking](https://seranking.com/blog/chatgpt-referral-traffic-may-2026/)).
No study isolates chess, and modelled traffic for Lichess was up 9% in August
2026 ([Semrush](https://www.semrush.com/website/lichess.org/overview/)).

Two implications follow. Head terms such as "sicilian najdorf" belong to
Wikipedia, the Knowledge Graph and Chess.com, and are the most exposed; our
traffic comes from the long tail at an average position near 7.6, where measured
losses are smaller and where competition is thin enough that spam PDF mirrors
rank. And the parts of a page a summary cannot reproduce, live band statistics,
"what you will face here", rehearsal against realistic replies, are both the
reason to click and the features players most want. Acquisition and the learning
loop point at the same work on the same page.

## The earlier reviews got five things wrong or now overstate them

The 2026-10-27 shallow review and backlog rev 6 hold up on direction, but
several premises are weaker than they state, and the owner should not inherit
them unexamined.

**The moat thesis is weaker than "narrowed".** Rev 6 says paid apps now do the
"walks your games" half. The larger change is that Chess.com does it inside Game
Review, and its free tier already marks the last book move of each reviewed
game. A single-game "where did I leave theory" post-mortem (J3, proposed as the
deviation trainer's public face) is now near parity with a free Chess.com
feature. What remains distinct is aggregation: the recurring leak across 500
games, measured against theory rather than a course you had to buy, landing on a
full page. The deviation trainer should lead with the aggregate, and J3 should
be a secondary entry point.

**"Free, no account" is not a differentiator for a trainer.** Chess Prep Pro has
no account and no limits, Listudy and Chessdriller are free and open source, and
Chessable's MoveTrainer and Repertoire builder are free in part
([Chess Prep Pro](https://chesspreppro.com/);
[Listudy](https://listudy.org/en/blog/spaced-repetition-for-chess);
[Chessable support](https://support.chessable.com/en/articles/9016006-are-chessable-accounts-really-free)).
Our trainer can only win by being attached to the page someone already landed on
and by needing no repertoire built first. #196 is table stakes, not
differentiation, and the scores below treat it so.

**"Traps sell" is not supported by these notes.** The shallow review cited a
Chessmate trap filter and ChessMem's 31 traps; this research could not confirm
either and found no dedicated trainer with a trap filter. The available data
cuts the other way: one blog analysis found 1,146 of 1,193 opening and
rating-band rows had a zero trap hit rate, and trap scoring is a niche
open-source method
([The Opening Club](https://theopeningclub.com/blog/best-aggressive-chess-openings);
[chess-trap-scorer](https://github.com/davidADSP/chess-trap-scorer)). Coaching
advice frames traps as things to avoid. Traps still earn search interest, but
they belong behind position facts, framed as "traps to know", with low
confidence.

**"Every competitor that does practice plays realistic replies" overstates the
market.** Course trainers play the author's line, and Chess Opener PRO samples
randomly from your own repertoire
([App Store](https://apps.apple.com/us/app/chess-opener-pro/id1489282483)).
Realistic replies come from a subset: LiChess Tools, openingtrainer.com,
Chessreps, Chessboard Magic and Chessly's bot
([openingtrainer.com](https://openingtrainer.com/)). The demand is real and
unmet on free mobile web, which is precisely our opening, but the free desktop
extension already serves power users, so sparring's differentiation is moderate.

**Two "unique" claims are softer.** The style taxonomy is unique as data, but
"your style from your games" enters a crowded field of player-style products
(Chessiverse's 31 archetypes and claimed 50,000+ players, Chess DNA's radar,
Chessigma's Wrapped card) with no evidence of accuracy or demand
([Chessiverse](https://chessiverse.com/chess-style-quiz);
[Chess DNA](https://apps.apple.com/app/id6762600434);
[Chessigma](https://www.chessigma.com/blog/chess-wrapped-2025)), and the level
axis is near-uniform. Per-position video curation is not unique either, given
Chessvision.ai's Video Opening Explorer, and no real user has yet clicked a
video in PostHog. Finally, the earlier "AI-search readiness" candidate rests on
measuring AI referrers that, at 0.25% of referrals and about 100 visitors a
month, will read zero; it belongs as one line in #188, not as a ranked item.

There is also a structural point the backlog has not confronted. Five of its
candidates (#195, #198, opponent scout, your style, run-over-run) and the
deviation trainer begin in Analyse, while the recorded traffic begins on
long-tail detail pages and 66 of 69 people never return. The late-November
analytics revisit should report `analyse_run` volume before any Analyse-first
item beyond #195 is scheduled.

## Adopt, evolve or adapt: what to take from each rival

The test for borrowing is whether a feature serves the "what will I face, can I
rehearse it" loop on a page someone already reached, and fits one developer, a
single 25-per-minute token, Vercel Hobby, no accounts and a grounded-only AI
policy.

| Feature (source)                                                       | Verdict                                | How it fits openingbook.xyz                                                                                                    |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Priority Lines, frequency-first order (Chessable, Chess Tempo)         | **Adopt**                              | Order practice extensions and "Instead of…" rows by band share; say "you can stop here at your level" where band play scatters |
| Opponent replies at real frequency (LiChess Tools, openingtrainer.com) | **Adopt** as sparring v0               | Sample from the selected band's cached explorer data with a per-session cap and fallback to the named line                     |
| Human-like bot beyond the data (Chessly Levi, Maia)                    | **Adapt**                              | Lazy-load a small Maia-2 model only on the practice board when the explorer runs thin; label it a model's prediction           |
| Spaced repetition (everyone)                                           | **Adapt** to stateless                 | #196 in localStorage: "Lines to review" and "last time you missed move 7"; no due dates or streaks without accounts            |
| Deviation flag on imported games (ChessAtlas, Chess.com Course Check)  | **Evolve**                             | Measure against theory and band play, aggregate the recurring leak across games, land on the page and the drill                |
| Gap finding "1 in N games" (Chessbook)                                 | **Evolve**, later                      | Expressed per page from band shares: "1 in 6 of your opponents at 1400 play this, and the page has no line for it"             |
| Model games (Chessbook, Tamburro's model-game method)                  | **Adapt**, later                       | Replay the notable games already fetched on the practice board; needs the Lichess game-export API                              |
| Two-profile opponent SWOT (Chessboard Magic)                           | **Adapt**                              | Opponent scout framing on Analyse, each line linking to a page and a drill in your colour                                      |
| Time-control split (Lichess Player tab)                                | **Adopt**                              | The fetched games already carry speed; a filter on Analyse                                                                     |
| Detectors-then-LLM explanations (Take Take Take)                       | **Adopt** the pattern, not the product | Only after position facts; every claim checked by a detector or engine, every line replayed                                    |
| Claim-level verification gate (ACT-Eval)                               | **Adapt**                              | Apply to the existing descriptions first, as a CI or batch audit                                                               |
| Play the opening against a bot from the guide (Chessiverse)            | **Evolve**                             | Our page-to-practice link already exists; sparring makes it real                                                               |
| Leaderboards, XP, social feeds, native apps, ungrounded chat           | **Reject**                             | Retention mechanics need an audience; chat breaks AD-005                                                                       |

## Our gaps, ranked by what they cost a visitor from Google

The most expensive gap is that **the landing page never says "this is what you
will face, and this is enough"**: the level lens shows the data, but it does not
turn band against masters divergence into a sentence, and it does not tell a
1400 player where they can stop. Second, **practice resembles nothing real**:
one fixed line with the same replies, so the four in 31 Google visitors who
practised met the market's weakest drill. Third, **credibility debt on every
page**: popularity counts fifteen months old, undated and inconsistent between
surfaces, beside a competitor that advertises September 2026 data
([Chessbook blog](https://chessbook.com/blog)), and LLM prose of unmeasured
accuracy in a market primed to call AI text slop. Fourth, **nothing remembers
the visitor**: no practice memory, no Analyse history, no portable repertoire.
Fifth, **we never say what is sound**: no evaluation, no "dubious" per move, no
traps, which needs the position-facts batch. Sixth, **dead ends**: unnamed
continuations are inert and 37% of named boards cannot be reached by clicking,
which hurts both the learner and the crawler. Seventh, **Analyse's insight stops
at the card**: no time-control split, no trend, no recurring-leak view, and
context dropped on the way to the page. Eighth, **acquisition has one channel**:
there is no shareable artefact and no tool a club player sends a teammate before
a match.

## A scored backlog: realism first, then memory, then depth

### Scoring method

Each candidate is scored 1 to 5 on six criteria, multiplied by its weight,
summed and scaled to 100 (score = Σ weight × rating ÷ 5). The weights
deliberately differ from the shallow review's: user value is anchored to the
strength of the job in the evidence above, first-visit acquisition is separated
from return visits because almost nobody returns today, and confidence rewards
evidence from users or our own data over vendor marketing.

| Criterion                         | Weight | 1 means                                                          | 5 means                                                           |
| --------------------------------- | -----: | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| **V** User value                  |    25% | serves a weak or unevidenced job                                 | directly serves "what will I face" or "remember it"               |
| **F** Fit and ease                |    20% | L size, new pipeline, policy or rate-limit risk, pending licence | days, existing data, no decision needed                           |
| **C** Confidence                  |    15% | vendor claim or guess                                            | proven by user sentiment, a competitor's traction or our own data |
| **D** Differentiation             |    15% | table stakes, free elsewhere                                     | nobody free does it, or only our assets can                       |
| **A** First-visit and acquisition |    15% | invisible to a Google visitor                                    | improves the landing page, search quality or shareability         |
| **R** Return visits               |    10% | no reason to come back                                           | creates a reason to return                                        |

Sizes follow the house convention for one developer working with Claude: **S**
days, **M** one to two weeks, **L** several weeks.

### Ranked candidates

| Rank | Candidate                                                                                                                     | Maps to                                              | Size |  V  |  F  |  C  |  D  |  A  |  R  | **Score** | Rationale                                                                                             |
| ---: | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | :--: | :-: | :-: | :-: | :-: | :-: | :-: | --------: | ----------------------------------------------------------------------------------------------------- |
|    1 | Divergence callout, evolved: band against masters share as a sentence, plus "you can stop here at your level"                 | #197                                                 |  S   |  4  |  5  |  4  |  4  |  3  |  2  |    **77** | Serves the strongest job on every landing page using data already fetched                             |
|    2 | Sparring v0: opponent replies sampled from the band's cached explorer shares, capped, falling back to the named line          | backlog Soon (decision A)                            |  M   |  5  |  3  |  4  |  2  |  3  |  4  |    **72** | Fixes the weakest surface; demand is explicit, risk is the token budget                               |
|    3 | Deviation trainer v1, aggregate-led (recurring leak across games), with paste-a-game as secondary entry                       | backlog Then (slice 2, J3)                           |  M   |  5  |  2  |  4  |  3  |  3  |  4  |    **71** | Still the best payoff, but must beat Chess.com's free single-game check by aggregating                |
|    4 | Practice memory: "Lines to review", last miss, local only                                                                     | #196                                                 |  S   |  4  |  5  |  5  |  1  |  1  |  5  |    **71** | Table stakes and cheap; helps the few who return                                                      |
|    5 | Personal strip and "Drill this line" with `?practice=`, absorbing the bridge line                                             | #195 (+ #198, decision B)                            |  S   |  3  |  5  |  4  |  3  |  2  |  4  |    **70** | Closes an open loop cheaply and creates the deep link sparring needs                                  |
|    6 | Opponent scout framing on Analyse, linking to pages and drills                                                                | backlog Soon                                         |  S   |  3  |  4  |  3  |  3  |  4  |  3  |    **67** | OpeningTree's exit leaves a gap; plausible club-chat sharing, unproven                                |
|    7 | Description claim audit on the most-landed pages: legal replay, piece-and-square checks, Jev first pass, human-reviewed fixes | new (extends backlog Enabler "fix the descriptions") |  M   |  4  |  3  |  4  |  3  |  3  |  1  |    **64** | Our only shipped LLM liability; 43 wrong claims in 32 of 105 audited briefs                           |
|    8 | "Start here" shelf, chosen by hand by colour                                                                                  | #199                                                 |  S   |  3  |  4  |  3  |  2  |  3  |  2  |    **59** | Fixes Discover's first impression, but few visitors arrive on Discover and the level axis cannot help |
|    9 | Run-over-run snapshot plus time-control split on Analyse                                                                      | backlog Then                                         |  S   |  3  |  4  |  3  |  2  |  1  |  4  |    **57** | Speed data already fetched; only matters if Analyse has users                                         |
|   10 | Repertoire from your games, gaps and PGN export                                                                               | backlog Then (decision 3)                            |  M   |  4  |  2  |  3  |  2  |  2  |  4  |    **57** | Valuable but crowded and large; defer until memory shows return use                                   |
|   11 | Position facts: offline Stockfish and club-move batch per FEN                                                                 | backlog Platform (decision 4)                        |  M   |  4  |  2  |  4  |  2  |  2  |  2  |    **56** | Enabler for soundness labels, traps and grounded "why"                                                |
|   12 | Unnamed continuations as links, then the position graph                                                                       | backlog Platform (decision 2), audit E2/E3           |  M   |  3  |  2  |  4  |  1  |  4  |  2  |    **54** | Reaches 37% of unreachable boards for users and crawlers                                              |
|   13 | Your style, from your games                                                                                                   | backlog Soon                                         |  S   |  2  |  4  |  2  |  3  |  3  |  2  |    **54** | Unique data, crowded concept, weak level axis, no demand signal                                       |
|   14 | Traps to know (to avoid), mechanically found                                                                                  | backlog Platform (J2)                                |  M   |  3  |  2  |  2  |  3  |  4  |  2  |    **54** | Search interest, but data suggests traps rarely fire; behind position facts                           |
|   15 | Model games: guess the move through notable games                                                                             | backlog Later                                        |  M   |  3  |  3  |  3  |  2  |  2  |  3  |    **54** | Coaching-endorsed and Chessbook's praised feature; export API limits                                  |
|   16 | Popularity refresh with dated, reconciled counts                                                                              | backlog Parked                                       |  S   |  3  |  3  |  4  |  1  |  3  |  1  |    **53** | Credibility hygiene on every page; competes with the proxy for the token                              |
|   17 | Maia-2 in-browser fallback for sparring                                                                                       | new                                                  |  M   |  3  |  2  |  3  |  3  |  2  |  3  |    **53** | No hallucination and no explorer cost, but a licence call and a 10 to 23 MB lazy load                 |
|   18 | Grounded LLM "why this move"                                                                                                  | backlog Later                                        |  L   |  4  |  1  |  2  |  3  |  3  |  2  |    **52** | Right pattern, wrong time: needs position facts and a claim gate                                      |
|   19 | Analyse bridge line as a separate item                                                                                        | #198                                                 |  S   |  2  |  5  |  2  |  2  |  2  |  2  |    **52** | Lowest-value open issue; fold into #195                                                               |
|   20 | Shareable opening report card                                                                                                 | backlog Later                                        |  S   |  2  |  4  |  1  |  2  |  3  |  2  |    **48** | No evidence opening cards get shared                                                                  |
|   21 | Monthly traffic and SEO report, with AI referrers as one line                                                                 | #188                                                 |  S   |  1  |  4  |  5  |  1  |  2  |  1  |    **47** | No user value, but cheap and needed to judge everything above                                         |
|   22 | Accounts and sync                                                                                                             | rejected in backlog                                  |  L   |  3  |  1  |  2  |  1  |  1  |  5  |    **41** | Still fails at this traffic; recorded for completeness                                                |

The scores are structured judgement, not measurement, and two families of item
deserve a caveat. Hygiene items (#188, the popularity refresh) score low because
they deliver little user value on their own, yet each is cheap and either
unblocks judgement or removes visible inaccuracy, so they belong in the plan
regardless of rank. Analyse-led items (ranks 3, 5, 6, 9, 13) carry an unmeasured
assumption that people use Analyse; if the November revisit shows almost no
`analyse_run` events, ranks 6, 9 and 13 should drop below the description audit
and the continuation links.

### Recommended sequence

The first two to three weeks should ship the three specified S issues that make
the landing page and practice coherent: #197 evolved as above, #195 with #198
folded in, and #196. Alongside them, run #188 and decide whether to un-park the
popularity refresh, because a single pass over 12,377 positions at 25 requests a
minute consumes at least eight hours of the shared token and must run off-peak.
The next block should be sparring v0 on the cached explorer, then the
description claim audit on the pages Google actually lands on, then the opponent
scout if Analyse usage justifies it. The deviation trainer follows, led by the
recurring-leak view and landing on a practice board that now plays like real
opponents. Position facts is the one new pipeline worth approving, because
soundness labels, traps and any grounded "why" all depend on it; Maia, model
games, repertoire, style profile and run-over-run sit behind evidence of return
use.

### Decisions the owner must make

| Decision                            | Options                                                                                    | Recommendation                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Strategy: first-visit value or loop | Prioritise what a Google visitor sees on a detail page, or the Analyse-led loop            | First-visit value; re-check after the November analytics revisit                            |
| A. Sparring data source             | Cached explorer with a per-session cap now; wait for position facts; add Maia later        | Cached explorer now, Maia-2 as a later fallback                                             |
| Maia licence                        | Maia-2 (MIT code; community ONNX weights labelled CC BY 4.0) or Maia-3 (AGPL-3.0 per repo) | Maia-2, after confirming the weights' licence                                               |
| B. Bridge line                      | Fold #198 into #195 or keep separate                                                       | Fold                                                                                        |
| Description audit                   | Spend usage windows auditing existing prose, or keep generating                            | Audit the most-landed pages first                                                           |
| Popularity refresh                  | Keep parked, or run off-peak and date counts on screen                                     | Un-park, with dates and reconciled totals                                                   |
| 4. Position facts                   | Approve the offline batch and per-FEN store                                                | Approve once sparring v0 ships                                                              |
| 2 and 3. Board search, Repertoire   | As in the backlog                                                                          | Continuation links first; fold Repertoire into "Lines to review" until return use is proven |

## What the evidence can and cannot carry

Every market finding in this report comes from search-engine snippets: web
pages, including lichess.org, could not be fetched, so claims were not checked
against full pages. Many comparison articles are written by vendors ranking
themselves first (ChessAtlas, Chessmate, ChessFlare, Chessiverse, CheckmateX,
Chessvia), and prices conflict across sources, sometimes by a factor of two.
Reddit, the largest venue for player opinion, was not searchable directly and
appears only through mirrors and quotations, so sentiment frequency is a
judgement from about twenty searches, not a count. The AI benchmarks are
preprints read from abstracts, the AI Overview studies are US-based and none
isolates chess, and traffic figures for other sites are modelled estimates. Our
own product audit read code and documents but did not run the app. On our side,
usage data is anecdotal at about 69 people a month and will stay so for months,
which is why this report leans on market evidence and why each score should be
revisited when the November analytics review lands.

## Conclusion

The research shifts the project's centre of gravity from the user's games to the
user's landing page. The backlog assumed the defensible thing was walking a
player's games; the market has made that common and Chess.com has made it free
for a single game, while the job players complain about most, drilling lines
they will never meet, is one our existing band data answers on every page, for
every visitor, without an account or a repertoire. The cheapest strong move is
to say plainly what a player at a given rating will face and let them rehearse
it against replies drawn from real play, and to make practice remember them.

The second shift is in how to think about AI. The credible use for this site is
not a chatty coach but restraint: a rating-conditioned move model that never
writes a sentence, a claim-checking gate over prose already published, and
engine-grounded explanations only once position facts exist. Given that a fifth
of an untooled frontier model's chess claims are wrong and that a third of our
audited briefs contained an error, the most valuable AI work of the next quarter
may be removing inaccurate text rather than adding fluent text.

## Sources

### Internal (repository, paths relative to the repo root)

[packages/web/src/App.tsx](../../packages/web/src/App.tsx) ·
[packages/web/src/pages/OpeningDetailPage.tsx](../../packages/web/src/pages/OpeningDetailPage.tsx)
·
[packages/web/src/pages/RepertoirePage.tsx](../../packages/web/src/pages/RepertoirePage.tsx)
·
[packages/web/src/components/personal/personalStatsLib.ts](../../packages/web/src/components/personal/personalStatsLib.ts)
·
[packages/api/src/routes/explorer.routes.js](../../packages/api/src/routes/explorer.routes.js)
· [api/data/style-tags.json](../../api/data/style-tags.json) ·
[api/data/popularity_stats.json](../../api/data/popularity_stats.json) ·
[api/data/video-index.json](../../api/data/video-index.json) ·
[api/data/courses.json](../../api/data/courses.json) ·
[docs/backlog.md](../../docs/backlog.md) ·
[docs/reviews/2026-10-27-competitive-review.md](../../docs/reviews/2026-10-27-competitive-review.md)
·
[docs/reviews/2026-09-24-feature-review.md](../../docs/reviews/2026-09-24-feature-review.md)
·
[docs/reviews/2026-08-11-product-ux-audit.md](../../docs/reviews/2026-08-11-product-ux-audit.md)
· [.github/memory-bank/archive.md](../../.github/memory-bank/archive.md) ·
[.github/memory-bank/user-journeys.md](../../.github/memory-bank/user-journeys.md)
· [.github/memory-bank/context.md](../../.github/memory-bank/context.md) ·
[AGENTS.md](../../AGENTS.md) · GitHub issues
[#188](https://github.com/Freddiekinns/chess-opening-explorer/issues/188),
[#195](https://github.com/Freddiekinns/chess-opening-explorer/issues/195),
[#196](https://github.com/Freddiekinns/chess-opening-explorer/issues/196),
[#197](https://github.com/Freddiekinns/chess-opening-explorer/issues/197),
[#198](https://github.com/Freddiekinns/chess-opening-explorer/issues/198),
[#199](https://github.com/Freddiekinns/chess-opening-explorer/issues/199)

**External.** All links from the research notes, deduplicated and grouped by
note.

#### Opening trainers and repertoire builders

[Chessable MoveTrainer page](https://www.chessable.com/movetrainer/) ·
[Chessable review 2026, checkmatex.app](https://checkmatex.app/blog/chessable-review-i-tried-it-for-30-days)
· [ChessDir review 2026](https://chessdir.app/apps/chessable) ·
[checkmatex.app, Chessbook vs Chessable](https://checkmatex.app/blog/chessbook-vs-chessable-2026-which-is-better)
·
[Chessable blog: Changes to Chessable and Chessable PRO](https://www.chessable.com/blog/new-year-big-changes-to-chessable-pro/)
·
[Chessable support](https://support.chessable.com/en/articles/9016006-are-chessable-accounts-really-free)
·
[Google Play listing](https://play.google.com/store/apps/details?id=com.chessable.chessable&hl=en_US)
·
[Chess.com news: Announcing Chessable 3.0](https://www.chess.com/news/view/announcing-chessable-3)
·
[Chessable blog](https://www.chessable.com/blog/introducing-chessable-3-0-join-the-next-generation-of-chess-training/)
·
[Chessable blog: Repertoire feature](https://www.chessable.com/blog/chessables-new-repertoire-feature-turns-you-from-active-learner-to-architect-of-your-chess-growth/)
·
[Chessable Roundup March 29, 2026](https://www.chessable.com/blog/chessable-roundup-march-29-2026/)
· [Chessable blog on Chess.com](https://www.chess.com/blog/Chessable) ·
[Chessable 3.0 search summary / APKMirror](https://www.apkmirror.com/apk/chess-com/chessable/chessable-study-chess-smarter-3-0-0-release/)
· [chessbook.com](https://chessbook.com/) ·
[Pre-made repertoires](https://chessbook.com/repertoires/) ·
[App Store](https://apps.apple.com/us/app/chessbook-master-openings/id6466343415)
·
[darksquares.net](https://darksquares.net/blog/chess-training-apps/best-chess-opening-trainers-2026-compared)
· [Chessbook blog](https://chessbook.com/blog) ·
[64squares Substack review](https://64squares.substack.com/p/chessbook-review) ·
[ChessPivot review](https://www.chesspivot.com/en/reviews/chessbook) ·
[Say Chess interview with Marcus Buffett](https://saychess.substack.com/p/an-interview-with-marcus-buffett)
·
[Google Play](https://play.google.com/store/apps/details?id=com.chessbook.android&hl=en_US)
·
[Chess.com forum](https://www.chess.com/forum/view/chess-openings/how-helpful-is-chessbook)
· [ChessAtlas pricing](https://chessatlas.net/pricing) ·
[ChessAtlas vs ChessFlare](https://chessatlas.net/features/vs-chessflare) ·
[MWM app listing](https://mwm.ai/apps/chess-openings-chessatlas/6770867404) ·
[ChessAtlas FSRS guide](https://chessatlas.net/blog/spaced-repetition-training/spaced-repetition-for-chess-openings-complete-fsrs-guide)
· [App Store](https://apps.apple.com/app/id6744000612) ·
[App Store AU](https://apps.apple.com/au/app/chessreps-master-openings/id6744000612)
·
[Google Play](https://play.google.com/store/apps/details?id=com.chessreps.app&hl=en_US)
· [trychessmate.com](https://www.trychessmate.com/) ·
[Chessmate 2026 comparison](https://www.trychessmate.com/blog/best-chess-opening-trainer-apps-2026)
· [chessflare.com](https://chessflare.com/) ·
[Opening Trainer](https://chessflare.com/opening-trainer) ·
[Chess Tempo opening training](https://chesstempo.com/opening-training/) ·
[Chess Tempo App Store listing (version history; listing ~7 years old)](https://apps.apple.com/us/app/chess-tempo-chess-tactics/id1441878094)
·
[Chess Tempo forum](https://chesstempo.com/forum/topic/opening-training-best-practice/11409/)
·
[Listudy blog: Spaced repetition](https://listudy.org/en/blog/spaced-repetition-for-chess)
· [AlternativeTo](https://alternativeto.net/software/listudy/about/) ·
[ChessAtlas comparison](https://chessatlas.net/blog/tool-comparisons/best-chess-opening-trainers-2026-honest-comparison-of-7-tools)
· [Chessboard Magic wiki: Releases](https://wiki.chessboardmagic.com/Releases) ·
[Wiki: Practice Opponents](https://wiki.chessboardmagic.com/Practice_Opponents)
· [Wiki home](https://wiki.chessboardmagic.com/) ·
[Patreon gift page](https://www.patreon.com/ChessboardMagic/redeem/36FCF) ·
[Exeter Chess Club](https://exeterchessclub.org.uk/node/1567) ·
[Chess.com forum](https://chess.com/forum/view/general/chess-position-trainer-software-1)
· [ChessPivot review of Chessly](https://www.chesspivot.com/en/reviews/chessly)
·
[old.chessly.com Caro-Kann course](https://old.chessly.com/courses/a7d23f32-20fb-4cf9-9b56-7e63329f55e7)
·
[Chess.com forum: Chessly 2.0](https://www.chess.com/forum/view/chess-equipment/new-chess-equipment-sort-of-chessly-2-0-initial-impressions)
· [Chess Advisor review](https://thechessadvisor.com/website-review/chessly/) ·
[chessmood.com](https://chessmood.com) ·
[Chessentials review](https://chessentials.com/is-chessmood-all-its-cracked-to-be-an-honest-review/)
· [ChessFox review](https://chessfox.com/?p=30819) ·
[App Store](https://apps.apple.com/rw/app/openings-mastermind/id6448386251) ·
[App Store](https://apps.apple.com/us/app/chess-opener-pro/id1489282483) ·
[AppBrain](https://www.appbrain.com/app/chess-opener-pro/com.chessopenerapp.pro)
· [chessopenerapp.com](https://www.chessopenerapp.com/) ·
[GitHub README](https://github.com/gtim/chessdriller/blob/main/README.md) ·
[ChessAtlas repertoire guide](https://chessatlas.net/blog/opening-repertoire-building/how-to-build-a-chess-opening-repertoire-that-actually-sticks-2026-guide)
· [openingtree.com](https://www.openingtree.com/) ·
[Adventures of a Chess Noob](https://adventuresofachessnoob.com/2023/08/06/powerful-free-tool-to-improve-your-chess-openingtree-com/)
·
[Lichess forum](https://lichess.org/forum/general-chess-discussion/how-to-prep-against-your-opponent-using-openingtree)
· [App Store](https://apps.apple.com/app/id882614935) ·
[chesspreppro.com](https://chesspreppro.com/) ·
[Google Play](https://play.google.com/store/apps/details?id=chess.prep.app&hl=en_US)
· [openingtrainer.com](https://openingtrainer.com/) ·
[conqueran](https://github.com/conqueran/lichess-opening-trainer) ·
[tabia](https://github.com/daxaur/tabia) ·
[Snouzy](https://github.com/Snouzy/chess-trainer) ·
[slippeee](https://github.com/slippeee/Chess-Opening-Trainer) ·
[lila issue #8118](https://github.com/lichess-org/lila/issues/8118) ·
[AlternativeTo: Chessstack](https://alternativeto.net/software/chessstack/about/)
· [ChessDesk](https://chessdesk.app/opening-repertoire-builder) ·
[Repertree](https://repertree.com/) ·
[OpenBook Chess](https://openbookchess.com/) ·
[freechesstrainer.org](https://freechesstrainer.org/) ·
[PyPI chess-opening-tool](https://pypi.org/project/chess-opening-tool/0.1.2/) ·
[chess-trap-scorer](https://github.com/davidADSP/chess-trap-scorer) ·
[The Opening Club](https://theopeningclub.com/blog/best-aggressive-chess-openings)
· [AppBrain](https://www.appbrain.com/app/chessable/com.chessable.chessable) ·
[AppBrain](https://www.appbrain.com/app/chessreps-master-openings/com.chessreps.app)
· [hunted.space](https://www.hunted.space/dashboard/chessatlas) ·
[Wikipedia: Levy Rozman](https://en.wikipedia.org/wiki/Levy_Rozman)

#### Platforms, reference sites and AI search

[Chess.com Openings](https://www.chess.com/openings) ·
[Chess.com support: Game Explorer](https://support.chess.com/en/articles/8615183-what-is-the-game-explorer)
·
[How do I look at master games](https://support.chess.com/en/articles/8708939-how-do-i-look-at-chess-games-played-by-the-masters)
·
[Chess.com news: Games Database](https://www.chess.com/news/view/announcing-chesscom-games-database)
·
[Chess.com Premium plans](https://support.chess.com/article/442-what-is-the-difference-between-gold-vs-platinum-vs-diamond-memberships)
· [ChessDeeper](https://chessdeeper.com/en/blog/chesscom-explorer-explained) ·
[Chess.com Premium plans](https://support.chess.com/en/articles/8562418) ·
[Stork](https://www.stork.ai/en/chess-com) ·
[mydealz](https://www.mydealz.de/deals/50-auf-chesscom-premium-mitgliedschaften-1-jahr-diamond-6200eur-statt-12499-platin-4249-statt-8499-und-gold-2499-statt-4999-2782320)
·
[Chess.com support: Game Review](https://support.chess.com/en/articles/8584089-how-does-game-review-work)
·
[Game Review v2](https://www.chess.com/news/view/chesscom-launches-game-review-v2)
·
[Announcing Opening Insights](https://www.chess.com/news/view/announcing-opening-insights)
·
[50 Opening Lessons](https://www.chess.com/news/view/chesscom-releases-50-opening-lessons)
·
[Learn Openings](https://www.chess.com/announcements/view/new-learn-openings-on-chess-com)
·
[Chess.com Update April 2026](https://www.chess.com/article/view/chesscom-update-april-2026)
·
[Game Review Course Deviations](https://www.chess.com/news/view/announcing-game-review-course-check)
·
[Chessable blog](https://www.chessable.com/blog/check-your-opening-play-with-game-review-course-check/)
· [Chess.com news (CHESScom)](https://www.chess.com/news/member/chesscom) ·
[Announcing Courses](https://www.chess.com/news/view/announcing-courses) ·
[October 2026 Community Update](https://www.chess.com/article/view/chesscom-update-october-2026)
· [Semrush chess.com](https://www.semrush.com/website/chess.com/overview/) ·
[ahrefstop](https://ahrefstop.com/websites/chess.com) ·
[startupspells case study](https://startupspells.com/p/chess-com-seo-case-study)
·
[Lichess blog: Opening Explorer](https://lichess.org/@/lichess/blog/opening-explorer/Vs0xMTAA)
·
[Personal Opening Explorer](https://lichess.org/blog/YXMPxxMAACEAy3g4/announcing-the-personal-opening-explorer)
· [lila-openingexplorer](https://github.com/lichess-org/lila-openingexplorer) ·
[Chess.com forum](https://www.chess.com/forum/view/chess-openings/opening-explorer-doesnt-actually-show-the-popularity-of-moves-lichess-is-better)
· [Lichess Opening](https://lichess.org/opening) ·
[Writing Lichess Opening Pages](https://lichess.org/page/opening-content) ·
[Wikibooks: How to navigate](https://en.wikibooks.org/wiki/Chess_Opening_Theory/How_to_navigate_this_wikibook)
· [lila issue #17957](https://github.com/lichess-org/lila/issues/17957) ·
[GitHub chess-openings](https://github.com/lichess-org/chess-openings) ·
[Lichess training/openings](https://lichess.org/training/openings) ·
[Lichess changelog](https://lichess.org/changelog) ·
[March 2026 changelog thread](https://lichess.org/forum/lichess-feedback/lichess-changelog-march-2026)
·
[More Than a Half-Year Update 2026](https://lichess.org/@/lichess/blog/more-than-a-half-year-update-2026/Bu77Rba1)
·
[Lichess forum](https://lichess.org/forum/lichess-feedback/practice-with-opening-explorer-in-lichess-tools)
·
[Siderite blog](https://siderite.dev/blog/how-to-learn-and-test-any-opening-in-hours-with-li/)
·
[Chrome Web Store](https://chromewebstore.google.com/detail/langlhlcknngldkeliapahbhbcmlcbcj)
· [Semrush lichess.org](https://www.semrush.com/website/lichess.org/overview/) ·
[365chess](https://www.365chess.com/) ·
[365chess explorer](https://www.365chess.com/opening.php) ·
[Semrush 365chess](https://www.semrush.com/website/365chess.com/overview/) ·
[365chess beginners article](https://365chess.com/view/best-chess-openings-for-beginners/)
· [chessgames explorer](https://www.chessgames.com/perl/explorer) ·
[chessgames premium help](https://chessgames.com/premiumhelp.html) ·
[Lichess forum: which explorers](https://lichess.org/forum/general-chess-discussion/what-online-chess-opening-explorers-you-use)
·
[Chess.com forum](https://www.chess.com/forum/view/general/best-online-opening-explorer)
·
[Wikibooks category](https://en.wikibooks.org/wiki/Category:Book:Chess_Opening_Theory)
· [Named Chess Openings](https://en.wikibooks.org/wiki/Named_Chess_Openings) ·
[Chess.com blog review](https://www.chess.com/blog/vitualis/powerful-free-tool-to-improve-your-chess-openingtree-com)
· [chessvision.ai blog](https://chessvision.ai/blog/) ·
[awesome-chess](https://github.com/atamano/awesome-chess) ·
[RamaChess](https://www.ramachess.com/articles/opening/famous-opening-traps.html)
· [Openings.gg](https://openings.gg/blog/best-free-chess-opening-tools-2026) ·
[Chessatlas](https://chessatlas.net/features/opening-trainer) ·
[Chessiverse](https://chessiverse.com/compare/best-app-for-practicing-chess-openings)
·
[Wikipedia Najdorf](https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation)
· [Lichess video](https://en.lichess.org/video/Ls5I8pC26Zc) ·
[Chess.com article](https://www.chess.com/article/view/sicilian-najdorf---the-lethal-weapon-by-gm-prasad-and-gm-panchanathan)
·
[The Chess World](https://thechessworld.com/store/product/caro-kann-advance-variation-a-complete-repertoire-for-white-by-im-mateusz-kolosowski/)
· [ChessBase](https://en.chessbase.com/post/inspiration-advanced-caro-kann) ·
[Wholesale Chess](https://www.wholesalechess.com/chess-blog/caro-kann-advance-variation)
·
[The Chess World](https://thechessworld.com/articles/general-information/10-best-chess-openings-for-beginners/)
· [Wargamer](https://www.wargamer.com/best-chess-openings-for-beginners) ·
[USCF Sales](https://www.uscfsales.com/blogs/chess-openings/best-chess-openings-for-beginners)
· [fightcancer.org](https://m.fightcancer.org/play-caro-kann) ·
[Chess.com blog: Free explorer](https://www.chess.com/blog/schofio/free-chess-openings-explorer)
·
[Pew Research](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)
·
[Ahrefs update](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/?pp=iaqb)
·
[Medianama](https://www.medianama.com/2026/02/223-google-ai-overviews-click-through-rates-58-study/)
·
[Seer Interactive](https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-september-2025-update)
·
[Search Engine Land](https://searchengineland.com/google-ai-overviews-drive-drop-organic-paid-ctr-464212)
·
[Search Engine Roundtable](https://www.seroundtable.com/similarweb-google-zero-click-search-growth-39706.html?frame=0)
·
[TechCrunch](https://techcrunch.com/2025/07/02/chatgpt-referrals-to-news-sites-are-growing-but-not-enough-to-offset-search-declines)
·
[Search Engine Land](https://searchengineland.com/google-ai-mode-cuts-clicks-satisfaction-study-490494)
·
[Relevant Audience](https://www.relevantaudience.com/geo/ai-mode-field-experiment-clicks-drop-18-8-points/)
·
[PPC Land](https://ppc.land/ai-overviews-cut-publisher-clicks-39-8-in-first-randomized-study/)
·
[The Next Web](https://thenextweb.com/news/google-ai-overviews-publisher-links-search-traffic)
·
[TechCrunch](https://techcrunch.com/2025/10/18/wikipedia-says-traffic-is-falling-due-to-ai-search-summaries-and-social-video)
·
[Decrypt](https://decrypt.co/344845/wikipedia-traffic-drops-ai-answers-eat-free-encyclopedia)
· [upgrowth](https://upgrowth.in/ai-traffic-share-report-2026/) ·
[SE Ranking](https://seranking.com/blog/chatgpt-referral-traffic-may-2026/) ·
[Similarweb](https://www.similarweb.com/blog/marketing/geo/gen-ai-stats/)

#### Personal analytics and opponent scouting

[App Store](https://apps.apple.com/us/app/aimchess-learn-chess-online/id1524941307?uo=4)
·
[summary via search of Aimchess listings/review](https://www.stork.ai/en/aimchess)
·
[Zwischenzug, player deep dive](https://zwischenzug.substack.com/p/player-deep-dive-ike-haxton)
·
[Chess.com support](https://support.chess.com/en/articles/8708925-what-is-insights-on-chess-com)
·
[Chess.com news: Explore tab](https://www.chess.com/news/view/announcing-explore-tab)
·
[Lichess blog: Chess Insights](https://es.lichess.org/blog/VmZbaigAABACtXQC/chess-insights)
·
[CheckRaiseMate, Lichess blog](https://lichess.org/@/CheckRaiseMate/blog/how-to-use-the-opening-explorer/H4PMsjTh)
·
[Zwischenzug](https://zwischenzug.substack.com/p/how-to-use-the-opening-explorer)
· [chessmonitor.com](https://chessmonitor.com) ·
[ChessMonitor, Lichess blog](https://lichess.org/@/ChessMonitor_Stats/blog/introducing-chessmonitor/FWt5cR1E)
·
[Nikhil Chess Substack](https://nikhilchess.substack.com/p/chessmonitor-review)
· [AlternativeTo](https://alternativeto.net/software/openingtree/about) ·
[AlternativeTo](https://alternativeto.net/software/chesscope/about/) ·
[App Store](https://apps.apple.com/us/app/id882614935) ·
[Lichess blog (ChessAtlasApp account)](https://lichess.org/@/ChessAtlasApp/blog/i-built-a-free-tool-to-analyze-your-chess-openings-repertoire-weaknesses/UoOVBu2X)
· [hunted.space](https://hunted.space/product/chessatlas) ·
[HollowLeaf, Lichess blog](https://lichess.org/@/HollowLeaf/blog/opponent-prep-updated/uk1kdQWg)
·
[original launch post](https://lichess.org/@/HollowLeaf/blog/chessboardmagiccom-new-opponent-preparation-tool-and-more/acXzKvIl)
·
[opening inaccuracies](https://lichess.org/@/HollowLeaf/blog/opening-inaccuracies-tool/MePEn39I)
·
[Repertoire builder v1.0](https://lichess.org/@/HollowLeaf/blog/repertoire-builder-v10/wZUTjfXG)
· [App Store](https://apps.apple.com/us/app/-/id1606629475) ·
[Product Hunt](https://www.producthunt.com/p/flexichess/flexichess) ·
[AlternativeTo](https://alternativeto.net/software/flexichess/about/) ·
[ChessBase support wiki](https://support.chessbase.com/en/content/details/e3b81ada-16d3-4abf-ac2f-6b12784b5648)
·
[ChessBase 14 player search](https://en.chessbase.com/newsroom/post/player-search-with-chessbase-14?page=0)
· [ChessBase 18 help](https://help.chessbase.com/CBase/18/Eng/style_report.htm)
·
[ChessBase 26 Players Guide (3)](https://en.chessbase.com/post/chessbase-2026-a-players-guide-3)
·
[ChessBase newsroom](https://en.chessbase.com/newsroom/post/chessbase-18-opponent-preparation-with-lichess-games?page=0)
· [Chessigma launch post](https://chessigma.com/blog/launching-chessigma) ·
[Chessigma blog](https://www.chessigma.com/blog/chess-wrapped-2025) ·
[App Store](https://apps.apple.com/app/id6762600434) ·
[hunted.space](https://hunted.space/product/chess-dna) ·
[Chess.com blog](https://www.chess.com/blog/aOldMan78/chess-stats) ·
[App Store](https://apps.apple.com/us/app/id1538625322) ·
[Apify](https://apify.com/trovevault/chess-opponent-analyzer) ·
[Chess Engine Lab](https://chessenginelab.substack.com/p/accuracy-rapid-blitz) ·
[Chess Engine Lab](https://chessenginelab.substack.com/p/scores-of-openings) ·
[Chess for Life comments](https://chessforlife.substack.com/p/stepping-up-vs-stepping-down/comments)
· [Chessiverse chess style quiz](https://chessiverse.com/chess-style-quiz) ·
[Chess DNA page](https://chessiverse.com/chess-dna) ·
[Chessiverse personality](https://chessiverse.com/chess-personality) ·
[Chessiverse blog](https://chessiverse.com/blog/famous-chess-players-by-personality-type)
· [Karpov profile](https://chessiverse.com/resources/players/anatoly-karpov) ·
[Chess.com blog](https://www.chess.com/blog/mocl125/my-chess-playing-style)

#### AI and LLM chess products, human-like engines

[ai.engineer talk page](https://ai.engineer/talks/building-a-chess-coach) ·
[ai.engineer companion page](https://ai.engineer/talks/FlzpEGHNVKQ-building-chess-coach)
· [YouTube](https://www.youtube.com/watch?v=FlzpEGHNVKQ) ·
[traeai summary](https://www.traeai.com/articles/e50e3576-4fcf-4f7b-aafd-63bbeaf370bf)
· [ai.engineer org page](https://ai.engineer/orgs/take-take-take) ·
[startuphub.ai](https://www.startuphub.ai/ai-news/artificial-intelligence/2026/building-an-ai-chess-coach-take-take-take)
· [App Store](https://apps.apple.com/us/app/take-take-take-chess/id6754937311) ·
[taketaketake.com](https://taketaketake.com/) ·
[aitoolsbakery](https://aitoolsbakery.com/blog/best-ai-chess-coach-apps/) ·
[Fast Company](https://www.fastcompany.com/91215898/take-take-take-magnus-carlsen-chess-app)
·
[Substack](https://intermediatemoves.substack.com/p/taketaketake-game-review-is-a-slop)
·
[improvemychess.co (Oct 2026)](https://www.improvemychess.co/learn/best-ai-chess-coaches-2026)
·
[checkmatex.app](https://checkmatex.app/blog/best-ai-chess-coach-2026-tools-compared)
·
[Chess.com forum](https://www.chess.com/forum/view/game-analysis/chess-com-membership-game-review-features)
·
[Chess.com forum](https://www.chess.com/forum/view/general/game-review-estimated-game-rating-is-a-lie-and-deceit)
· [Chessvia (competitor)](https://www.chessvia.ai/blog/vs-decodechess) ·
[mychessplan](https://mychessplan.com/decodechess-review-2026/) ·
[opentools](https://opentools.ai/tools/decode-chess-ai-chess-coach) ·
[betterchess.co](https://betterchess.co/best-ai-chess-coaches) ·
[Chessvia blog (self-published)](https://www.chessvia.ai/blog/best-ai-chess-coach)
· [chesscore](https://chesscore.io/blog/noctie-ai-chess-review) ·
[Product Hunt](https://www.producthunt.com/products/noctie-ai/reviews) ·
[Medium](https://medium.com/@dcdelapointe/an-honest-review-of-noctie-ai-told-by-a-regular-chess-player-45b2e7612190)
· [Chessiverse openings](https://chessiverse.com/resources/openings) ·
[Chessiverse Guided Play](https://chessiverse.com/guided-play) ·
[Chesspivot review](https://www.chesspivot.com/en/reviews/chessiverse) ·
[GitHub](https://github.com/ai-chess-training/LLM-ChessCoach) ·
[thesis PDF](https://amslaurea.unibo.it/35457/1/ShashGuru%20Bridging%20Chess%20Engines%20and%20Large%20Language%20Models%20for%20Human-Interpretable%20Analysis.pdf)
· [GitHub](https://github.com/ronaldsuwandi/thinkfish) ·
[App Store](https://apps.apple.com/br/app/id6481724799) ·
[arXiv abs](https://arxiv.org/abs/2608.04240) ·
[arXiv HTML](https://arxiv.org/html/2608.04240) ·
[arXiv](https://arxiv.org/abs/2410.20811) ·
[ACL Anthology](https://aclanthology.org/2025.naacl-long.481) ·
[arXiv HTML](https://arxiv.org/html/2610.03695v1) ·
[deeplearn.org](https://deeplearn.org/arxiv/838605/language-models-that-play-chess-and-explain-their-moves)
· [arXiv](https://arxiv.org/html/2609.22245) ·
[NeurIPS](https://proceedings.neurips.cc/paper_files/paper/2023/hash/16b14e3f288f076e0ca73bdad6405f77-Abstract-Datasets_and_Benchmarks.html)
· [GitHub](https://github.com/waterhorse1/ChessGPT) ·
[arXiv 2601.16823](https://arxiv.org/pdf/2601.16823) ·
[Mathieu Acher blog](https://blog.mathieuacher.com/GPT5-IllegalChessBench/) ·
[arXiv 2512.01992](https://arxiv.org/pdf/2512.01992) ·
[arXiv 2509.24239](https://arxiv.org/pdf/2509.24239) ·
[HN](https://news.ycombinator.com/item?id=47079621) ·
[NeurIPS proceedings](https://proceedings.neurips.cc/paper_files/paper/2024/hash/250190819ff1dda47cd23cecc0c5a69b-Abstract.html)
· [arXiv 2409.20553](https://arxiv.org/html/2409.20553v2) ·
[CSSLab/maia2](https://github.com/CSSLab/maia2) ·
[dxg7/maia-chess-models](https://github.com/dxg7/maia-chess-models) ·
[DEV Community](https://dev.to/mrdimosthenis/why-stockfish-isnt-enough-running-maia-2-in-the-browser-for-human-chess-analysis-53no)
·
[macimoar/nemesis release](https://github.com/macimoar/nemesis/releases/tag/maia2-onnx-v1)
· [Maia Chess on X](https://x.com/maiachess/status/2058643976136069365) ·
[CSSLab/maia3](https://github.com/CSSLab/maia3) ·
[chessdrive.io](https://chessdrive.io/blog/maia-chess) ·
[HF Maia3-79M](https://huggingface.co/UofTCSSLab/Maia3-79M) ·
[HF Maia3-23M](https://huggingface.co/UofTCSSLab/Maia3-23M) ·
[gr-g/maia-local](https://github.com/gr-g/maia-local) ·
[Siege Chess source page](https://siegechess.com/opensource/source.html) ·
[chessoracle-maia](https://github.com/BastiQ/chessoracle-maia) ·
[maiachess.com](https://www.maiachess.com/) ·
[CSSLab/maia-platform-frontend](https://github.com/csslab/maia-platform-frontend)

#### Player needs and sentiment

[Lichess blog, datajunkie, "10 things to avoid when learning openings on Chessable"](https://lichess.org/@/datajunkie/blog/4-lifetime-repertoires-10-things-to-avoid-when-learning-openings-on-chessable/SedowvEI)
·
[SayChess, interview with Marcus Buffett (Chessbook founder), comments](https://saychess.substack.com/p/an-interview-with-marcus-buffett/comments)
·
[mattplayschess Substack](https://mattplayschess.substack.com/p/chessbook-a-game-changer-for-adult)
·
[Zwischenzug Substack, "How to use Chessable", comments](https://zwischenzug.substack.com/p/how-to-use-chessable/comments)
·
[Chessily review](https://chessily.com/review/chessable-review-is-it-worth-it/)
·
[JustUseApp review aggregator](https://justuseapp.com/en/app/1523279049/chessable-learn-chess-online/reviews)
·
[marlvel.ai](https://marlvel.ai/api/llm/apps/education/chessable-study-chess-smarter)
·
[64squares Substack, "Chessable is better than I thought"](https://64squares.substack.com/p/chessable-is-better-than-i-thought)
·
[Zwischenzug comments](https://zwischenzug.substack.com/p/how-to-learn-an-opening-in-2023/comments)
·
[Chess.com forum, "Chessable alternatives?"](https://www.chess.com/forum/view/general/chessable-alternatives)
·
[Lichess forum, "chessable 2"](https://lichess.org/forum/general-chess-discussion/chessable-2)
· [ChessAtlas comparison](https://chessatlas.net/features/vs-chessbook) ·
[Lichess forum, "Learning openings with bots?"](https://lichess.org/forum/lichess-feedback/learning-openings-with-bots-?page=1)
· [Lichess forum post](https://sv.lichess.org/forum/redirect/post/p02VrUbJ) ·
[Lichess forum](https://lichess.org/forum/general-chess-discussion/how-do-i-search-openings-played-by-rating-range)
·
[Lichess blog, "Why opening statistics are wrong"](https://lichess.org/@/D2D4C2C4/blog/why-opening-statistics-are-wrong/VKNZ1oKw)
·
[Lichess feedback forum](https://lichess.org/forum/lichess-feedback/game-database-of-opening-explorer-is-not-working-properly)
· [GitHub](https://github.com/gtim/chessdriller) ·
[Lichess forum](https://lichess.org/forum/general-chess-discussion/free-open-source-pgn-trainer-software-with-spaced-repetition)
· [Raven Report](https://ravenreport.org/5870/oped/the-better-chess-website) ·
[Chess.com forum, "Openings Explorer versus a Proper Database"](https://chess.com/forum/view/chess-openings/openings-explorer-versus-a-proper-database)
·
[Chess.com forum, "Explorer During Games"](https://chess.com/forum/view/general/explorer-during-games)
·
[Chess.com forum, "dream feature"](https://www.chess.com/forum/view/general/whats-your-dream-feature-you-wish-chess-com-would-implement?lc=1)
· [r/GothamChess mirror](https://lr.in.psf.lt/r/GothamChess) ·
[Chess.com forum, "New Chessly course"](https://chess.com/forum/view/general/gotham-chess-new-chessly-course?page=4)
·
[Zwischenzug, "My new AI chess coach"](https://zwischenzug.substack.com/p/my-new-ai-chess-coach)
·
[Chess.com blog, damafe](https://www.chess.com/blog/damafe/i-tested-chatgpt-as-a-chess-coach-does-it-actually-work)
·
[SayChess, OpeningGPT comments](https://saychess.substack.com/p/openinggpt-is-ready-with-its-first/comments)
·
[Lichess blog, Busbar](https://lichess.org/@/Busbar/blog/can-ai-help-me-us-build-better-chess-training-part-1/TtEM87xh)
·
[RV Chess ChatGPT app](https://chatgpt.com/plugins/plugin_asdk_app_6ac04ce1b5448191837e6fea806c0084)
·
[Lichess forum, "which Sicilian gives the least theory"](https://lichess.org/forum/general-chess-discussion/white-player-vs-sicilian-which-sicilian-gives-the-least-theory-to-learn-please?page=3)
·
[Zwischenzug, "How to stop forgetting your openings"](https://zwischenzug.substack.com/p/how-to-stop-forgetting-your-openings)
·
[Zwischenzug, "How to remember your openings"](https://zwischenzug.substack.com/p/how-to-remember-your-openings)
·
[Chess.com forum](https://chess.com/forum/view/for-beginners/how-do-people-remember-all-chess-moves-in-openings)
·
[Chess.com blog, EKislik](https://chess.com/blog/EKislik/what-to-do-when-you-forget-your-openings)
· [Chess.com news](https://www.chess.com/news/view/chess-personality?page=4) ·
[Chessiverse guide](https://chessiverse.com/blog/chess-personality-and-opening-choice)
· [Lichess blog](https://lichess.org/ublog/sA7Vyofp/redirect) ·
[Chess.com forum](https://chess.com/forum/view/chess-openings/in-need-of-chess-books-for-chess-openings)
·
[Lichess blog, pulsar512b](https://en.lichess.org/@/pulsar512b/blog/prep-a-discussion/5C1Uu2Ze)
·
[Chess.com forum, "Opening repertoire trainer?"](https://chess.com/forum/view/chess-openings/opening-repertoire-trainer)
·
[Lichess blog, datajunkie "Studying chess openings: 10 tips"](https://lichess.org/@/datajunkie/blog/studying-chess-openings-10-tips/Mulq2TCS)
· [Bokus listing](https://www.bokus.com/bok/9781936277575/openings-for-amateurs)
·
[Listudy blog, "When to start learning chess openings?"](https://listudy.org/en/blog/when-to-learn-chess-openings)
·
[Lichess forum](https://lichess.org/forum/general-chess-discussion/how-should-i-study-chess-openings)
·
[Chess.com forum](https://chess.com/forum/view/chess-openings/how-do-we-study-openings)
·
[Chess.com blog, Kingpatzer](https://www.chess.com/blog/Kingpatzer/yes-study-openings)
·
[US Chess forum](https://forum.uschess.org/t/what-openings-to-teach/173?page=2)
·
[Lichess blog discussion, "Why beginners shouldn't study openings"](https://lichess.org/ublog/8lDyZijK/discuss)
· [Lichess forum post](https://www.lichess.org/forum/redirect/post/adn3GXEa) ·
[ChessBase, 2020](https://en.chessbase.com/post/learn-the-best-opening-traps) ·
[ChessClub.com](https://www.chessclub.com/article/tricks-and-traps-everywhere) ·
[Obsidian Chess Studio guide](https://www.mintlify.com/luisrivasnoriega/Obsidian-Chess-Studio/guide/opening-repertoire)
