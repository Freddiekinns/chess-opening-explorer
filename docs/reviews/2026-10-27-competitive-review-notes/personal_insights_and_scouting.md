# Personal-game opening analytics and opponent scouting tools (as of October 2026)

Method note: WebFetch was unavailable; all findings come from WebSearch result
snippets (17 queries). Most sources are product pages, app-store listings, or
blog posts by the tool authors themselves, so feature claims are self-reported
unless stated otherwise. Prices from aggregators conflict and should be
re-checked on the vendors' own pages. Reddit threads did not surface in search
at all (see Gaps).

## Tool-by-tool: what each computes, how it presents it, what is free

### Takeaway

The market splits into (a) improvement dashboards that benchmark you (Aimchess,
Chess.com Insights, Lichess Insights, ChessMonitor, Chess DNA), (b) tree
builders over a player's games (openingtree, Chesscope, Lichess explorer Player
tab, OpeningScanner), and (c) two-profile opponent-prep tools (Chessboard Magic
Opponent Prep, ChessBase Dossier/Style Report, Chess Prep Pro, FlexiChess).
Free, no-account tree and stats tools are plentiful; peer benchmarks, unlimited
history and deep scouting are where paywalls sit.

### Cited Findings

**Aimchess**

- Analytics compare you "to other chess players in your range"; helps you "find
  out which openings work for you, and where you need to put more work in" —
  [App Store](https://apps.apple.com/us/app/aimchess-learn-chess-online/id1524941307?uo=4)
- A user report: the report analysed the last 40 games and compared performance
  to opponents in six categories —
  [summary via search of Aimchess listings/review](https://www.stork.ai/en/aimchess)
- A Substack deep dive interprets an Aimchess "opening score" of 95% and an
  "advantage capitalisation" of 68% (share of winning positions converted, not a
  percentile), and notes peers at that rating convert more —
  [Zwischenzug, player deep dive](https://zwischenzug.substack.com/p/player-deep-dive-ike-haxton)
- Free tier (third-party review): one 40-game analysis report per month, weekly
  study plan, one daily training session and warm-up; Premium adds unlimited
  reports and analysis of last 1,000 games —
  [Stork.ai](https://www.stork.ai/en/aimchess)
- Free tier (App Store): 15 lessons/day and "limited access to Scouting Reports
  and Statistics"; Premium $9.99/month or $71.99/year —
  [App Store](https://apps.apple.com/us/app/aimchess-learn-chess-online/id1524941307?uo=4);
  contradicted on price by [Stork.ai](https://www.stork.ai/en/aimchess)
  ($7.99/month, $57.99/year)

**Chess.com Insights**

- Insights is limited to Diamond members (top paid tier) —
  [Chess.com support](https://support.chess.com/en/articles/8708925-what-is-insights-on-chess-com)
- Opening Insights shows your 10 most-played openings, how often you played them
  and how you scored, and highlights openings where your score could improve —
  [Chess.com news: Opening Insights](https://www.chess.com/news/view/announcing-opening-insights)
- Chess.com's Explore tab shows engine evaluations of common moves in game
  review (theory-side, not personal stats) —
  [Chess.com news: Explore tab](https://www.chess.com/news/view/announcing-explore-tab)

**Lichess Insights**

- Free for all users; filters include ECO identification of the opening;
  announcement (older, c. 2015) said opening support was to be improved —
  [Lichess blog: Chess Insights](https://es.lichess.org/blog/VmZbaigAABACtXQC/chess-insights)

**Lichess opening explorer, Player tab**

- Select any Lichess username as White or Black and see what they played in each
  position; filters include casual/rated; authors suggest "self-scouting" with
  your own name —
  [CheckRaiseMate, Lichess blog](https://lichess.org/@/CheckRaiseMate/blog/how-to-use-the-opening-explorer/H4PMsjTh);
  [Zwischenzug](https://zwischenzug.substack.com/p/how-to-use-the-opening-explorer)
- Caveat from the same author: small sample sizes per opening, treat results as
  clues —
  [Zwischenzug](https://zwischenzug.substack.com/p/how-to-use-the-opening-explorer)
- Lichess-only; Chess.com opponents need another tool —
  [Lichess forum](https://lichess.org/forum/general-chess-discussion/how-to-prep-against-your-opponent-using-openingtree)
- LiChess Tools extension adds "Explorer Practice", where the computer plays
  moves from a chosen Player-tab account with real-life frequencies —
  [Lichess forum](https://lichess.org/forum/lichess-feedback/practice-with-opening-explorer-in-lichess-tools)

**ChessMonitor**

- Free web analytics for Chess.com and Lichess: games, openings, win rates,
  ratings, opponents; merges accounts across both sites —
  [chessmonitor.com](https://chessmonitor.com)
- Developer: focuses on statistical patterns, not move-by-move evaluations; e.g.
  how your most-played openings fare against stronger opponents; filter games by
  opening —
  [ChessMonitor, Lichess blog](https://lichess.org/@/ChessMonitor_Stats/blog/introducing-chessmonitor/FWt5cR1E)
- Paid tiers (one review): Plus about $5.90/month yearly, Professional about
  $44.90/month yearly; Anish Giri listed as partner —
  [Nikhil Chess Substack](https://nikhilchess.substack.com/p/chessmonitor-review)
  (single source, date unverified)

**openingtree.com / Chesscope**

- OpeningTree (web) consolidated games from Chess.com, Lichess and PGN; listed
  as discontinued, last commit February 2022 —
  [AlternativeTo](https://alternativeto.net/software/openingtree/about); still
  referenced for opponent prep on
  [Lichess forum](https://lichess.org/forum/general-chess-discussion/how-to-prep-against-your-opponent-using-openingtree)
- Chesscope: free, no account, builds one interactive tree from a player's
  Lichess + Chess.com games or PGN; W/D/L per node; transpositions merged —
  [AlternativeTo](https://alternativeto.net/software/chesscope/about/)
- (The iOS "OpeningTree" app is an unrelated book of ~640k high-rated games —
  [App Store](https://apps.apple.com/us/app/id882614935))

**OpeningScanner / ChessAtlas**

- OpeningScanner: free, open-source; streams your Lichess or Chess.com games,
  classifies each against the full ECO database, gives a dashboard of your "real
  repertoire" with frequency and score —
  [Lichess blog (ChessAtlasApp account)](https://lichess.org/@/ChessAtlasApp/blog/i-built-a-free-tool-to-analyze-your-chess-openings-repertoire-weaknesses/UoOVBu2X)
- ChessAtlas app: connects your account, checks games against your prepared
  lines and flags the first move where you deviated; FSRS spaced repetition —
  [mwm.ai listing](https://mwm.ai/apps/chess-openings-chessatlas/6770867404);
  [hunted.space](https://hunted.space/product/chessatlas)

**Chessboard Magic (HollowLeaf)**

- Opponent Prep imports and compares two profiles (Lichess or Chess.com);
  summary includes an Opening SWOT split by colour: Strengths = openings where
  you do well and the opponent struggles; Weaknesses = openings you play where
  the opponent does well ("danger zones") —
  [HollowLeaf, Lichess blog](https://lichess.org/@/HollowLeaf/blog/opponent-prep-updated/uk1kdQWg);
  [original launch post](https://lichess.org/@/HollowLeaf/blog/chessboardmagiccom-new-opponent-preparation-tool-and-more/acXzKvIl)
- Same author has an "opening inaccuracies" tool and a repertoire builder (free
  tier: 10 repertoires, 2,000 moves, 100 imported games) whose review card
  highlights weaknesses, shallow branches and inconsistencies —
  [opening inaccuracies](https://lichess.org/@/HollowLeaf/blog/opening-inaccuracies-tool/MePEn39I);
  [Repertoire builder v1.0](https://lichess.org/@/HollowLeaf/blog/repertoire-builder-v10/wZUTjfXG)

**Chess Prep Pro**

- "Blind Spot Finder" analyses your repertoire against "billions of player
  games" to surface likely opponent moves you have not prepared; Stockfish
  analysis; free with in-app purchases —
  [App Store](https://apps.apple.com/us/app/-/id1606629475) (marketing copy
  only)

**FlexiChess**

- Browser prep suite; free tier: engine, opening explorer, eval graph, move
  classification, repertoire training, opponent scouting; Pro $9/month or
  $72/year —
  [Product Hunt](https://www.producthunt.com/p/flexichess/flexichess);
  AlternativeTo lists FSRS repertoire training, no-account free tier, and a
  different price ($14/month or $109/year) —
  [AlternativeTo](https://alternativeto.net/software/flexichess/about/)

**ChessBase**

- Dossier (from Mega Database Players list): tree and report of a player's
  games, rating history, results, notable games; "Prepare against White/Black" —
  [ChessBase support wiki](https://support.chessbase.com/en/content/details/e3b81ada-16d3-4abf-ac2f-6b12784b5648);
  [ChessBase 14 player search](https://en.chessbase.com/newsroom/post/player-search-with-chessbase-14?page=0)
- Style Report (CB18+): profile of style, preferences, repertoire, typical
  setups, strengths and weaknesses —
  [ChessBase 18 help](https://help.chessbase.com/CBase/18/Eng/style_report.htm)
- Error Report: where a player goes wrong vs an average GM, with "Blunder Elo" —
  [ChessBase 26 Players Guide (3)](https://en.chessbase.com/post/chessbase-2026-a-players-guide-3)
- CB18 can locate a player's likely Lichess accounts and use those games for
  prep —
  [ChessBase newsroom](https://en.chessbase.com/newsroom/post/chessbase-18-opponent-preparation-with-lichess-games?page=0)

**Chessigma**

- Free Stockfish 17 game analyser launched 27 March 2025: accuracy, opening
  played, best/worst moves —
  [Chessigma launch post](https://chessigma.com/blog/launching-chessigma)
- "Chess Wrapped 2025": enter a Chess.com username, get a year overview and a
  "personality card" positioned as a chess identity card —
  [Chessigma blog](https://www.chessigma.com/blog/chess-wrapped-2025)

**Chess DNA (Yuval Incze) / chessinsights.xyz / other**

- Chess DNA: AI insights from Chess.com/Lichess games; "DNA" is an 8-dimension
  skill radar via Stockfish; iOS, Android, web —
  [App Store](https://apps.apple.com/app/id6762600434);
  [hunted.space](https://hunted.space/product/chess-dna)
- chessinsights.xyz: cited by a Chess.com blogger for performance trends;
  example output: 8,810 games vs 7,798 unique opponents (Feb 2023–Mar 2025),
  54.37% win rate, split by colour, most-played White opening —
  [Chess.com blog](https://www.chess.com/blog/aOldMan78/chess-stats)
- Chess Opening Analyzer (iOS, $0.99): connects Chess.com/Lichess, shows which
  openings you know; built after the developer noticed losing in specific
  openings — [App Store](https://apps.apple.com/us/app/id1538625322)
- Apify "Chess Opponent Analyzer" scraper actor exists for opponent reports —
  [Apify](https://apify.com/trovevault/chess-opponent-analyzer)

### Inferences

- openingbook.xyz's Analyse (username, no account, grouped by family, W/D/L,
  best/needs-work cards, links to opening pages) is roughly at parity with
  Chess.com's Diamond-only Opening Insights (top 10 openings, score, "could
  improve") but free; its differentiator is the link from each result to a rich
  opening page with videos, which none of the stats tools have.
- Two-profile comparison (Chessboard Magic SWOT) and account merging
  (ChessMonitor) are the cheapest ideas to borrow because they reuse the same
  per-opening aggregation already computed.

### Gaps

- Chessigma "preparation category" in a DNA report: not found; search only
  returned Chess Wrapped and the analyser. The "Chess DNA" app appears to be a
  separate product (Yuval Incze).
- chessinsights.xyz features and current status could not be confirmed directly.
- Opportunities/Threats definitions in Chessboard Magic's SWOT were not visible
  in snippets.
- No current price confirmed from vendors' own pricing pages for Aimchess,
  ChessMonitor or FlexiChess.

## Which presentation patterns work

### Takeaway

Repertoire trees with W/D/L per node, colour splits, deviation-from-prep flags,
coverage gaps ("blind spots"), peer/strength benchmarks and shareable identity
cards are all in market. Time-control splits and longitudinal trends are
mentioned rarely in what search surfaced, and none of these patterns has public
usage data.

### Cited Findings

- Repertoire tree from your games, transpositions merged, W/D/L per node —
  [Chesscope, AlternativeTo](https://alternativeto.net/software/chesscope/about/)
- Deviation from prep: flag the first move where you left your prepared line —
  [ChessAtlas](https://mwm.ai/apps/chess-openings-chessatlas/6770867404)
- Inconsistency and shallow branches flagged in a repertoire review card —
  [HollowLeaf repertoire builder](https://lichess.org/@/HollowLeaf/blog/repertoire-builder-v10/wZUTjfXG)
- Coverage gaps vs what opponents play: Blind Spot Finder —
  [Chess Prep Pro](https://apps.apple.com/us/app/-/id1606629475)
- Colour-split SWOT between you and a named opponent —
  [Chessboard Magic](https://lichess.org/@/HollowLeaf/blog/opponent-prep-updated/uk1kdQWg)
- Peer benchmarks against your rating band —
  [Aimchess App Store](https://apps.apple.com/us/app/aimchess-learn-chess-online/id1524941307?uo=4);
  results vs stronger opponents —
  [ChessMonitor](https://lichess.org/@/ChessMonitor_Stats/blog/introducing-chessmonitor/FWt5cR1E)
- Practising against an opponent's real move frequencies —
  [LiChess Tools](https://lichess.org/forum/lichess-feedback/practice-with-opening-explorer-in-lichess-tools)
- Shareable identity card / year "Wrapped" —
  [Chessigma](https://www.chessigma.com/blog/chess-wrapped-2025)
- Small samples per opening are a known trap in personal stats —
  [Zwischenzug](https://zwischenzug.substack.com/p/how-to-use-the-opening-explorer)
- Time-control relevance: accuracy drops more from rapid to blitz than from
  classical to rapid, so formats behave differently —
  [Chess Engine Lab](https://chessenginelab.substack.com/p/accuracy-rapid-blitz);
  opening scores also vary across rating ranges —
  [Chess Engine Lab](https://chessenginelab.substack.com/p/scores-of-openings)

### Inferences

- Candidate additions for openingbook.xyz, ordered roughly by effort vs fit:
  1. Time-control split (bullet/blitz/rapid/daily filter) on the existing
     aggregation; the data is already in the fetched games.
  2. Sample-size honesty: show game counts and mute or label "needs work"
     verdicts below a threshold (consistent with the repo's "never render
     fabricated data" rule).
  3. Opponent framing: "Scout a player" using the same pipeline on an opponent's
     username, phrased as "what they play against your colour"; then a
     two-username comparison (Chessboard Magic-style colour SWOT).
  4. Move-level tree from the user's games (Chesscope/Player-tab pattern), with
     "where you leave the main line" drawn from openingbook's own theory data —
     a deviation view the stats-only tools lack.
  5. Lightweight history: store the last run's snapshot in localStorage to show
     change since last time, avoiding accounts.
  6. Shareable card image (Wrapped-style) for organic reach; but no evidence
     found on whether opening-specific cards get shared.
- Peer benchmarks need population data by rating band; openingbook already has
  Lichess popularity stats (all rated players), which could give "players at
  your rating score X% in this opening" without new collection, subject to
  labelling those stats correctly.

### Gaps

- No usage or retention data for any pattern; no A/B evidence on which
  presentation users prefer.
- No tool found that clearly offers time-control-split opening stats in snippets
  (Lichess Insights likely does via its filters, but not confirmed here).

## What users say they want (forum/Reddit evidence)

### Takeaway

Direct Reddit evidence could not be retrieved by search; the available signal
comes from developer posts, Lichess forum threads and Substack comments, which
point to "which openings am I losing in", cross-site merging, and practical
opponent prep for known handles.

### Cited Findings

- Developer built an opening analyser after noticing he lost many games in
  specific openings —
  [Chess Opening Analyzer, App Store](https://apps.apple.com/us/app/id1538625322)
- A Substack commenter describes exporting all games to PGN and breaking down
  W/D/L/score by ECO and opening name; another recommends Lichess Insights —
  [Chess for Life comments](https://chessforlife.substack.com/p/stepping-up-vs-stepping-down/comments)
- Lichess forum users discuss how to prep against an opponent with openingtree,
  and note the Player tab only covers Lichess accounts —
  [Lichess forum](https://lichess.org/forum/general-chess-discussion/how-to-prep-against-your-opponent-using-openingtree)
- Most of the time you will not know an opponent's handle, hence self-scouting
  as the common use —
  [Zwischenzug](https://zwischenzug.substack.com/p/how-to-use-the-opening-explorer)
- ChessBase invested in mapping OTB players to Lichess accounts, implying demand
  from club/tournament players to scout online games —
  [ChessBase newsroom](https://en.chessbase.com/newsroom/post/chessbase-18-opponent-preparation-with-lichess-games?page=0)
- Repeated launches of free, no-account tools (OpeningScanner, Chesscope,
  Chessigma) on Lichess blogs and Product Hunt suggest demand for this category
  —
  [OpeningScanner post](https://lichess.org/@/ChessAtlasApp/blog/i-built-a-free-tool-to-analyze-your-chess-openings-repertoire-weaknesses/UoOVBu2X);
  [FlexiChess, Product Hunt](https://www.producthunt.com/p/flexichess/flexichess)

### Inferences

- The recurring workflow is "self-scout first, opponent-scout when a handle is
  known (league/club/arena)". openingbook can serve both with one input box and
  two framings.

### Gaps

- No r/chess, r/chessbeginners or r/lichess threads surfaced despite targeted
  queries; no quantified demand. Club/league scouting habits (chess-results.com
  to find opponent, then online handle) were not evidenced in search results.

## "Your playing style" profiling and reactions

### Takeaway

Style archetypes are a growing marketing hook (Chessiverse's 31 archetypes,
Chess DNA's 8-axis radar, Chessigma's personality card, ChessBase's Style
Report), but I found no independent evidence of accuracy or of how users react
beyond single anecdotes.

### Cited Findings

- Chessiverse game-based style analysis places you among 31 historical
  archetypes from Chess.com/Lichess games or PGN; claims "millions of games" and
  "50,000+ players" (self-reported) —
  [Chessiverse chess style quiz](https://chessiverse.com/chess-style-quiz);
  [Chess DNA page](https://chessiverse.com/chess-dna)
- Chessiverse also runs a self-report personality questionnaire, and itself
  contrasts it with the game-based tool ("what you actually do rather than what
  you think you do") —
  [Chessiverse personality](https://chessiverse.com/chess-personality)
- Archetype labels: Tal "The Relentless Aggressor"; Karpov "The Boa
  Constrictor", with eight style scores on his profile —
  [Chessiverse blog](https://chessiverse.com/blog/famous-chess-players-by-personality-type);
  [Karpov profile](https://chessiverse.com/resources/players/anatoly-karpov)
- Chess DNA app: 8-dimension skill radar —
  [App Store](https://apps.apple.com/app/id6762600434)
- Chessigma Wrapped personality card —
  [Chessigma](https://www.chessigma.com/blog/chess-wrapped-2025)
- ChessBase Style Report for professional prep —
  [ChessBase 18 help](https://help.chessbase.com/CBase/18/Eng/style_report.htm)
- One Chess.com blogger took chesspersonality.com's result and cross-checked it
  against their own games (anecdote) —
  [Chess.com blog](https://www.chess.com/blog/mocl125/my-chess-playing-style)

### Inferences

- Archetypes are shareable but space is crowded and unverified; for openingbook,
  an opening-grounded profile (e.g. "you choose open/gambit vs closed systems",
  derived from existing style tags in `api/data/style-tags.json`) would be more
  defensible than a personality label, and links straight to pages.

### Gaps

- No independent review, Reddit reaction or measured accuracy of any style
  profiler was found.
