# AI- and LLM-based chess learning products and human-like engines (as of October 2026)

Method note: WebFetch was blocked (one attempt on ai.engineer failed with DNS
error), so every finding below comes from search-engine snippets and summaries,
not full page reads. Numbers from snippets should be re-checked against primary
pages before publication. Many "comparison" pages are written by competitors
(Chessvia, Chessiverse, CheckmateX, aitoolsbakery) and are flagged as such.

## 1. Take Take Take (Magnus Carlsen): AI coach architecture, features, talk, pricing

### Takeaway

Take Take Take runs a free (as of early October 2026) iOS/Android app whose AI
coach is publicly described as "Stockfish evaluates, detectors extract concepts,
the LLM only translates into English". It is the clearest documented example of
the engine-plus-detectors-plus-LLM pattern, and it still drew a prominent "slop
machine" critique at launch for hallucinated explanations.

### Cited Findings

- Talk: "Building a Chess Coach", AI Engineer Europe 2026, by Anant Dole and
  Asbjørn Steinskog of Take Take Take. Abstract: a consumer coach combining
  Stockfish analysis and grounded chess signals with LLM-generated explanations;
  covers why general-purpose LLMs cannot play reliably, a Claude-and-Slack
  feedback loop that revises detectors and regenerates commentary, and
  accuracy-versus-latency trade-offs for production —
  [ai.engineer talk page](https://ai.engineer/talks/building-a-chess-coach);
  [ai.engineer companion page](https://ai.engineer/talks/FlzpEGHNVKQ-building-chess-coach);
  [YouTube](https://www.youtube.com/watch?v=FlzpEGHNVKQ)
- Architecture as summarised: "LLMs hallucinate when asked to reason about
  positions, so they split the work. Stockfish evaluates, detectors extract
  tactical concepts, the LLM just translates into English." A promotional post
  reports "sub 3 seconds on Gemini Flash" (secondary, unverified against the
  talk) —
  [traeai summary](https://www.traeai.com/articles/e50e3576-4fcf-4f7b-aafd-63bbeaf370bf)
- Evaluation is scenario-based (blunders, tactical patterns, hallucinations),
  with experienced players judging whether explanations are accurate and
  instructive; the LLM is kept anchored to verifiable features of the position —
  [ai.engineer org page](https://ai.engineer/orgs/take-take-take);
  [startuphub.ai](https://www.startuphub.ai/ai-news/artificial-intelligence/2026/building-an-ai-chess-coach-take-take-take)
- Features: AI Coach pulls games automatically from Lichess and, with Game
  Review, explains mistakes and missed opportunities "in plain language, not
  engine lines"; flags one thing to work on; progress graphs and trends; social
  feed, medals, competitions; Play Zone runs on Lichess accounts and servers
  with Lichess moderation —
  [App Store](https://apps.apple.com/us/app/take-take-take-chess/id6754937311);
  [ai.engineer org page](https://ai.engineer/orgs/take-take-take);
  [taketaketake.com](https://taketaketake.com/)
- No evidence found of an opening explorer or opening-specific knowledge feature
  in the app — searches only (gap, see below).
- Pricing: App Store lists it as Free; a comparison blog (updated 16 Oct 2026)
  says on 9 October neither store listed in-app purchases; a 2024 report said it
  would be free with possible ads and premium features later —
  [App Store](https://apps.apple.com/us/app/take-take-take-chess/id6754937311);
  [aitoolsbakery](https://aitoolsbakery.com/blog/best-ai-chess-coach-apps/);
  [Fast Company](https://www.fastcompany.com/91215898/take-take-take-magnus-carlsen-chess-app)
- Reception: App Store 4.4/5 from 133 ratings; one user wanted the top three
  lines rather than only the top engine move —
  [App Store](https://apps.apple.com/us/app/take-take-take-chess/id6754937311).
  aitoolsbakery calls it the best free option and "the only app here that
  documents its language-model coach" —
  [aitoolsbakery](https://aitoolsbakery.com/blog/best-ai-chess-coach-apps/)
- Failure mode: "TakeTakeTake Game Review is a Slop Machine" (Intermediate Moves
  Substack, roughly April 2026, from the launch stream). Author infers the model
  receives position, recent moves, Stockfish PV and eval, then writes a summary;
  cites a claim that a rook on d3 "cut the defence" between two pieces as
  nonsense; worries it will mislead beginners —
  [Substack](https://intermediatemoves.substack.com/p/taketaketake-game-review-is-a-slop)

### Inferences

- Even with engine grounding, the LLM still produced positional claims not
  supported by detectors. The weak point is any free-text claim about piece
  relations that no detector checked. The Claude-and-Slack loop described in the
  talk (revise detectors, regenerate) reads as the response to this.
- Take Take Take competes on game review, not opening study, so opening
  knowledge looks like an open niche for a free site.

### Gaps

- Talk transcript not accessible (ai.engineer and YouTube not fetchable); the
  detector list, the exact model (Gemini Flash is from a promotional post only)
  and the evaluation metrics are unconfirmed.
- No confirmed paid tier or price as of late October 2026.

## 2. Other AI chess products: how they work, pricing, failure modes

### Takeaway

The market splits into (a) engine review with templated or LLM explanations
(Chess.com Coach, DecodeChess, Aimchess, Chessigma, Chessvia, CheckmateX), and
(b) human-like bot play (Noctie, Chessiverse, Maia). Common criticism:
explanations are generic or shallow, and prices conflict wildly across sources.

### Cited Findings

- **Chess.com Game Review / Coach**: free plan reportedly gives one full game
  review a day; Diamond adds coach explanations on every move and Insights —
  [improvemychess.co (Oct 2026)](https://www.improvemychess.co/learn/best-ai-chess-coaches-2026).
  Diamond price conflicts: $14/month, $19.99/month, $30/month and $119.99/year
  are all quoted by different third parties —
  [improvemychess.co](https://www.improvemychess.co/learn/best-ai-chess-coaches-2026);
  [checkmatex.app](https://checkmatex.app/blog/best-ai-chess-coach-2026-tools-compared);
  [aitoolsbakery](https://aitoolsbakery.com/blog/best-ai-chess-coach-apps/).
  Criticism: "same coaching language for 400 Elo and 2000 Elo players"; coach
  detects a pattern but "misses the bigger picture"; "tells you what you did
  wrong but not really why"; Coach is not described as an LLM, better read as
  engine analysis plus commentary — same sources and
  [Chess.com forum](https://www.chess.com/forum/view/game-analysis/chess-com-membership-game-review-features).
  Users also dispute Game Review's estimated rating —
  [Chess.com forum](https://www.chess.com/forum/view/general/game-review-estimated-game-rating-is-a-lie-and-deceit)
- **DecodeChess**: written, plain-English explanations of a single game
  (regarded as strong), weak at cross-game patterns; Unlimited $8.25/month or
  $84/year; credit packs $15/60 and $25/120; free tier given as 1 decoded game a
  day by one source, 2 by another —
  [Chessvia (competitor)](https://www.chessvia.ai/blog/vs-decodechess);
  [mychessplan](https://mychessplan.com/decodechess-review-2026/);
  [opentools](https://opentools.ai/tools/decode-chess-ai-chess-coach)
- **Aimchess**: weakness-reporting dashboard rather than a coach; price
  $57.99/year in one source, about $8/month in others —
  [checkmatex.app](https://checkmatex.app/blog/best-ai-chess-coach-2026-tools-compared);
  [betterchess.co](https://betterchess.co/best-ai-chess-coaches)
- **Chessvia**: AI coach you can question; free tier; paid quoted as
  $7.99–$29.99/month or from $7/month —
  [Chessvia blog (self-published)](https://www.chessvia.ai/blog/best-ai-chess-coach)
- **CheckmateX**: core features reportedly $0 (single, self-interested source) —
  [checkmatex.app](https://checkmatex.app/blog/best-ai-chess-coach-2026-tools-compared)
- **Chessigma**: report tool free; plain-language coaching sits in a capped paid
  chat; no prices found —
  [betterchess.co](https://betterchess.co/best-ai-chess-coaches)
- **Noctie.ai**: model mimics human opening choices, mistakes and move timing;
  users can choose the openings the bot plays; price €14/month or €96/year with
  7-day trial (one source), $13.90/month or $99.99/year (another); a 2025 Medium
  review calls the coaching limited —
  [chesscore](https://chesscore.io/blog/noctie-ai-chess-review);
  [Product Hunt](https://www.producthunt.com/products/noctie-ai/reviews);
  [aitoolsbakery](https://aitoolsbakery.com/blog/best-ai-chess-coach-apps/);
  [Medium](https://medium.com/@dcdelapointe/an-honest-review-of-noctie-ai-told-by-a-regular-chess-player-45b2e7612190)
- **Chessiverse** (Swedish): 1,000+ neural-network bots from about 0 to 3300
  Elo; 500–550+ opening guides by ECO code with main lines, plans for both
  sides, popularity and win-rate data, and a button to start a game against a
  bot with the opening already on the board; "Guided Play" coach grades every
  move, help level adjustable from a nudge to a full explanation. Independent
  review notes no spaced repetition. Price: from $7.50/month (own site) or
  $12.99/month, $89.99/year, $299 lifetime (third party) —
  [Chessiverse openings](https://chessiverse.com/resources/openings);
  [Chessiverse Guided Play](https://chessiverse.com/guided-play);
  [Chesspivot review](https://www.chesspivot.com/en/reviews/chessiverse);
  [aitoolsbakery](https://aitoolsbakery.com/blog/best-ai-chess-coach-apps/)
- **Open-source / hobby coaches**: LLM-ChessCoach uses GPT-5-Nano with Stockfish
  and a rule-based fallback when the LLM is unavailable —
  [GitHub](https://github.com/ai-chess-training/LLM-ChessCoach). ShashGuru
  (Bologna thesis) pairs ShashChess with LLaMA 3.1-8B —
  [thesis PDF](https://amslaurea.unibo.it/35457/1/ShashGuru%20Bridging%20Chess%20Engines%20and%20Large%20Language%20Models%20for%20Human-Interpretable%20Analysis.pdf).
  ThinkFish (Stockfish + LLM) author reports GPT-4o claiming a knight on c6 that
  did not exist — [GitHub](https://github.com/ronaldsuwandi/thinkfish)

### Inferences

- Chessiverse is the closest direct competitor to openingbook.xyz's opening
  pages: ECO-indexed guides with stats plus "play this opening against a
  human-like bot". Its gap (per Chesspivot) is spaced repetition.
- Price data in this market is unreliable; quote ranges, not single figures.

### Gaps

- No primary source found for "AI Chess Teacher" or a project literally named
  "ChessCoach"; nothing found on GPT-store chess tutors beyond a "ChessGPT: AI
  Chess Coach" App Store listing
  ([App Store](https://apps.apple.com/br/app/id6481724799)).
- Official Chess.com pricing page and Coach architecture not retrieved.

## 3. How good are general LLMs at chess explanation (2025–2026)? Benchmarks and studies

### Takeaway

Frontier LLMs still hallucinate in chess commentary at material rates: the
best-measured figure is 22% of atomic claims wrong for GPT-5.4 without tools
(over 40% for smaller open models), and tool use fixes facts but not strategic
coverage. Raw LLMs also still play illegal moves.

### Cited Findings

- "Hallucinations on the Board: Tool-Augmented Evaluation of LLM Chess
  Commentary" (arXiv 2608.04240, Hebbar et al., Aug 2026 preprint): ACT-Eval
  splits commentary into atomic claims, verifies them with engine and
  board-state tools, and scores strategic coverage against expert gold
  references. 325 position-move pairs (125 with expert-verified gold atoms),
  five-class error taxonomy. GPT-5.4 without tools: 22.0% of sub-claims
  incorrect; smaller open-weight models over 40%. Tools substantially improve
  factual correctness and move-quality assessment but coverage of expert ideas
  stays limited for all models. A naive LLM judge (GCC-Eval) gave near-perfect
  scores to fluent but unfaithful commentary —
  [arXiv abs](https://arxiv.org/abs/2608.04240);
  [arXiv HTML](https://arxiv.org/html/2608.04240)
- Concept-guided commentary (Kim et al., arXiv 2410.20811, NAACL 2025): an
  expert chess model ranks the concepts a move most affects, then the LLM
  explains those concepts; few-shot and chain-of-thought plus a list of attacks
  to cut invented pieces and illegal moves; introduces GCC-Eval; claims
  human-level correctness — [arXiv](https://arxiv.org/abs/2410.20811);
  [ACL Anthology](https://aclanthology.org/2025.naacl-long.481)
- "Language Models that Play Chess and Explain Their Moves" (Bhaskar, Cheng,
  Chen; arXiv 2610.03695, Oct 2026): "Queen", a 4B chess-language model
  reportedly at typical grandmaster level, builds explanations by analysing
  positions after top candidate moves and distilling them back; explanations
  approach GPT-5.6-Sol (high) in coherence on LM-based evaluation. A search
  summary says it defines "conceptual hallucinations" (e.g. calling a move a
  fork when it is not) — not confirmed in the snippet —
  [arXiv HTML](https://arxiv.org/html/2610.03695v1);
  [deeplearn.org](https://deeplearn.org/arxiv/838605/language-models-that-play-chess-and-explain-their-moves)
- Faithfulness: arXiv 2609.22245 tests whether chess explanations reflect model
  decisions (behavioural and token-level tests) —
  [arXiv](https://arxiv.org/html/2609.22245)
- ChessGPT (Feng et al., NeurIPS 2023 Datasets and Benchmarks): GPT trained on
  game data plus chess language data; released ChessCLIP and ChessGPT with
  public code, models and dataset —
  [NeurIPS](https://proceedings.neurips.cc/paper_files/paper/2023/hash/16b14e3f288f076e0ca73bdad6405f77-Abstract-Datasets_and_Benchmarks.html);
  [GitHub](https://github.com/waterhorse1/ChessGPT)
- Illegal moves: a memorisation study reports illegal moves in 74.7% (GPT-3.5),
  41.6% (GPT-4o) and 33.8% (GPT-5) of positions, above 30% for GPT-5 out of
  distribution — [arXiv 2601.16823](https://arxiv.org/pdf/2601.16823). An
  informal test forced GPT-5 and GPT-5 Thinking into an illegal move after four
  moves (single example) —
  [Mathieu Acher blog](https://blog.mathieuacher.com/GPT5-IllegalChessBench/).
  Wider benchmarks: LLM CHESS
  ([arXiv 2512.01992](https://arxiv.org/pdf/2512.01992)), ChessArena
  ([arXiv 2509.24239](https://arxiv.org/pdf/2509.24239)).
- Claude and Gemini specifically: no controlled comparison found; a Hacker News
  claim that Gemini 3 plays at expert level is unverified —
  [HN](https://news.ycombinator.com/item?id=47079621)

### Inferences

- For a site whose policy demands validation, roughly one wrong claim in five
  from the best untooled model is disqualifying for unreviewed text. Even with
  tools, the residual risk is in strategic or conceptual claims, which no
  legality check catches.
- Legality validation (replaying lines) is necessary but not sufficient: the
  hallucinations critics cite (rook "cutting the defence", phantom knight) are
  about relations, not move legality.

### Gaps

- Full texts of 2608.04240 and 2610.03695 not read; numbers are from abstracts.
- No study found focused specifically on opening explanations (as opposed to
  middlegame move commentary).

## 4. Patterns that produce trustworthy explanations

### Takeaway

Every credible system keeps the LLM out of the calculation: engine for
evaluation, deterministic detectors or concept extractors for facts, LLM only
for phrasing, then claim-level verification. Retrieval from human-annotated
sources is the other safe path.

### Cited Findings

- Detectors + LLM as translator (Take Take Take) —
  [traeai](https://www.traeai.com/articles/e50e3576-4fcf-4f7b-aafd-63bbeaf370bf);
  [ai.engineer](https://ai.engineer/talks/building-a-chess-coach)
- Concept ranking by an expert model before LLM explanation (concept-guided) —
  [arXiv 2410.20811](https://arxiv.org/abs/2410.20811)
- Atomic-claim decomposition with engine/board tools for verification; LLM
  judges alone are fooled by fluency —
  [arXiv 2608.04240](https://arxiv.org/abs/2608.04240)
- Rule-based fallback when the LLM is unavailable —
  [LLM-ChessCoach](https://github.com/ai-chess-training/LLM-ChessCoach)
- Expert human review of scenarios (blunders, tactics, hallucinations) as the
  evaluation loop —
  [ai.engineer org page](https://ai.engineer/orgs/take-take-take)
- Retrieval/annotation route: Chessiverse's opening guides pair plans with
  statistics from millions of games (method of authoring not disclosed) —
  [Chessiverse openings](https://chessiverse.com/resources/openings)

### Inferences

- Credible, low-risk adoptions for openingbook.xyz: (1) templated,
  detector-driven sentences ("this move attacks the undefended e5 pawn")
  generated from board state, with no LLM; (2) LLM used offline only to rephrase
  or summarise human-written study annotations, every move line replayed legally
  and every factual claim checked against a detector or an engine eval; (3) an
  ACT-Eval-style claim check as a CI gate on any generated copy; (4) drop any
  sentence the detectors cannot support rather than publish it. Avoid live,
  per-user LLM commentary: cost, latency and the 22%-claim error baseline.
- Statistics-based phrasing (popularity, win rates) is safe where real data
  exists, which matches the site's "never fabricate" rule.

### Gaps

- No published detector list from any vendor; no open-source opening-specific
  detector library found.

## 5. Human-like move models (Maia-2, Maia-3) for "how a 1200 replies" drills

### Takeaway

Yes, technically: Maia-2 (MIT, NeurIPS 2024) and Maia-3 (May 2026, claimed
state-of-the-art, AGPL-3.0) are rating-conditioned move predictors that
community projects already run fully in the browser with ONNX Runtime Web at
about 10–46 MB. The licence choice matters: Maia-2 under MIT is the low-friction
option; Maia-3's AGPL carries network-use obligations.

### Cited Findings

- Maia-2 (NeurIPS 2024): one unified model across skill levels replacing
  per-rating Maia-1 models; residual tower plus skill-aware attention combining
  board features with player and opponent skill embeddings; needs only the
  current position (no six-board history); policy, value and
  auxiliary-information heads —
  [NeurIPS proceedings](https://proceedings.neurips.cc/paper_files/paper/2024/hash/250190819ff1dda47cd23cecc0c5a69b-Abstract.html);
  [arXiv 2409.20553](https://arxiv.org/html/2409.20553v2)
- Maia-2 code repo is MIT-licensed and now says "for new projects, see Maia-3";
  a community ONNX repo labels its models CC BY 4.0 (conflict, unverified) —
  [CSSLab/maia2](https://github.com/CSSLab/maia2);
  [dxg7/maia-chess-models](https://github.com/dxg7/maia-chess-models)
- Browser feasibility (Maia-2): a developer runs Maia-2 client-side with ONNX
  Runtime Web and WebAssembly, no inference server, with a quantised rapid model
  of 22.7 MB; another repo offers a blitz ONNX of about 100 MB —
  [DEV Community](https://dev.to/mrdimosthenis/why-stockfish-isnt-enough-running-maia-2-in-the-browser-for-human-chess-analysis-53no);
  [macimoar/nemesis release](https://github.com/macimoar/nemesis/releases/tag/maia2-onnx-v1)
- Maia-3: announced 24 May 2026 as free and open source, predicting what players
  rated 600–2600 would play, new SOTA accuracy, more efficient; paper
  "Chessformer" (ICLR 2026); 5M, 23M and 79M checkpoints (plus a 3M ablation);
  79M behind a 57.1% move-match headline (third-party guide) —
  [Maia Chess on X](https://x.com/maiachess/status/2058643976136069365);
  [CSSLab/maia3](https://github.com/CSSLab/maia3);
  [chessdrive.io](https://chessdrive.io/blog/maia-chess)
- Maia-3 licence: repo and 79M model card AGPL-3.0; the 23M card says "CC BY 4.0
  (paper); see repo for code/weights license" — inconsistent —
  [HF Maia3-79M](https://huggingface.co/UofTCSSLab/Maia3-79M);
  [HF Maia3-23M](https://huggingface.co/UofTCSSLab/Maia3-23M);
  [chessdrive.io](https://chessdrive.io/blog/maia-chess)
- Maia-3 in browser: maiachess.com's own code reportedly loads
  `/maia3/maia3_simplified.onnx` (45.7 MB); a third-party fp16 ONNX of the 5M
  model is about 10.8 MB —
  [gr-g/maia-local](https://github.com/gr-g/maia-local);
  [Siege Chess source page](https://siegechess.com/opensource/source.html);
  [chessoracle-maia](https://github.com/BastiQ/chessoracle-maia)
- maiachess.com (free): Play, Analysis, Puzzles, Drills, Hand and Brain,
  Bot-or-Not, Broadcasts — [maiachess.com](https://www.maiachess.com/); frontend
  is open source —
  [CSSLab/maia-platform-frontend](https://github.com/csslab/maia-platform-frontend)

### Inferences

- An opening drill where "a 1200 replies" can be built by sampling from the Maia
  policy at a chosen rating, restricted to legal moves (the policy head outputs
  over legal moves, so legality is easy to enforce). Because output is a move
  distribution, not text, there is no hallucination risk; it is honest to label
  it "a model's prediction of typical play at ~1200", not real statistics.
- For a free site, a 10–23 MB lazy-loaded model on a drill page only is
  feasible; never load it on page mount (consistent with the repo's "no large
  payloads on mount" rule). Maia-2 (MIT) avoids AGPL obligations; Maia-3 5M
  (AGPL) would likely require releasing the site's linked source if served as
  part of a network service — get the licence position confirmed before
  shipping.
- Alternative with zero model risk: sample replies from real Lichess rating-band
  explorer statistics the site already proxies, using Maia only where the
  explorer has too few games.

### Gaps

- Maia-2 headline accuracy figures not retrieved from snippets.
- What maiachess.com "Drills" contain (opening drills or not) could not be
  confirmed.
- No official Maia-2 ONNX export confirmed; no legal analysis of AGPL applying
  to client-side-only weights found.
