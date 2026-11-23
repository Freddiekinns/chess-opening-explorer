# 03 — Why learners use YouTube and not sites like ours

Night 3, run as an extra run on 2026-11-23 (~13:40 UTC) at the owner's request,
with Full network access. Method: our own video index and production page
measured in the container; 11 primary pages read (two research papers, a
university press release, five forum threads and blogs, two product pages, one
developer write-up); four searches to find them. **Refused:** `lichess.org`
returns 403 to both WebFetch and curl (blog posts, forum), and `youtube.com`
redirects to Google's captcha page, so no YouTube description, chapter list or
comment was read. Learner claims are anecdotal (forums, blogs); the learning
claims rest on small lab studies, not on chess.

The question, set by night 2: learners already run video → written book →
drill → own games across four sites, and hop video to video and forget. **What
would make our page the place they watch, then keep going?**

## 1. What our videos are (measured)

From `api/data/video-index.json` (generated 2026-11-12):

- 11,396 of 12,377 positions have videos; median 5 per position, max 10.
- But only **1,418 distinct videos from 22 channels** fill those 55,165 slots.
- The top slot is dominated by three lecture channels: **Hanging Pawns 4,928
  positions, Daniel Naroditsky 3,080, Saint Louis Chess Club 2,485** (92%
  between them). GothamChess, whose videos have the most views in the index
  (6.7M for "Learn the Caro-Kann"), is first on 4 positions.
- **Median length 28 minutes** (quartiles 16 and 44). Only 304 of 11,396 top
  videos (3%) are under 15 minutes.
- **The top video is rarely about the page's line.** 86% of positions show a top
  video that is also top on at least 20 other positions; 47% one shared by 100+.
  The commonest, a 40-minute Hanging Pawns Sicilian introduction, heads 476
  pages. "Vienna: Frankenstein-Dracula, 11.d3" opens with a 47-minute Vienna
  overview.

So a learner on a specific line is offered a long family overview with no way
to find the minute that concerns their position. That is by design (the family
shelf, `AGENTS.md`), and right for hub pages; on the 11,000 deeper pages it is a
lecture, not an answer.

## 2. Where the videos sit (seen)

Production, `/opening/<1.e4>` at 390 px (screenshot
`gates/night3/opening-page-phone.png`): board, Practice, overview, explorer,
common plans, then **"Videos (4)" as a collapsed row at ~1,600 px of a 2,090 px
page** — about two screens down, closed. On desktop the gallery is open at
~1,360 px, below the fold of a 900 px window. The gallery itself is good: it
plays inline in a `youtube-nocookie` iframe so the board stays in view
(`VideoGallery.tsx`). Baseline: 20 people saw a gallery, 7 clicked
(`baseline.md`), and the median session is 0 seconds — most never reach it.

## 3. Why learners use YouTube (sources)

- **Free, quick, and good enough to start.** The commonest pattern is a
  "quick video on YouTube, under 10 minutes" and then playing the opening
  (Zipho-lunika's blog); "watch YouTube to get booked up, then play and analyse"
  (PromisingPawns, Chess.com forum). Videos let you "cover more ground in less
  time" and are "very enjoyable to watch" (h0rnpipe, MoveTrainer-vs-video
  thread).
- **Creators are trusted per level.** Posters route learners by creator, not by
  topic: GothamChess under ~1500, Naroditsky "useful from about 1000" (Chess.com
  preferred-method thread). Nobody in the threads read recommends a site's
  video list.
- **The same posters say video does not stick.** Video makes it "far less likely
  to remember specific sequences" (h0rnpipe). "I would learn something, then
  switch to another video and another opening, which made me forget the first
  one" (PolishDavidd). Rewatching a long course to memorise it would be
  "painfully slow" (Zipho-lunika).
- **What they do about it is leave YouTube.** Every learner who described a fix
  moved the moves somewhere they could _produce_ them: entering the lines into an
  editor or Lichess study (gik-tally, 1983B-Boy: notes "help you remember"),
  Anki cards that each record **where in the video** the idea is discussed so they
  can jump back (Zipho-lunika), drilling with ChessTempo (Armand_Spenser). The
  opposite complaint about drills: the trainer "drops me in the middle of a
  position with no context" (gik-tally) — which is what the video was for.

## 4. What the learning research says

- **Watching inflates confidence without adding skill.** Six experiments
  (Kardas & O'Brien, Chicago Booth): the more people watched a how-to video, the
  better they predicted they would do; actual performance did not improve with
  repeat viewing. Trying the task themselves corrected the estimate.
- **Testing after a video beats rewatching, a week later.** Coursera lectures,
  123 students (PMC4731506): after one week, repeated testing recalled 14.3 of 30
  idea units vs 10.4 for repeated study (d = 0.88); forgetting over the week was
  3% vs 43%. **At five minutes, rewatching won** (19.8 vs 14.8) — which is why
  watching feels like it works.
- **Short tests between segments halve mind-wandering.** Szpunar, Khan &
  Schacter (PNAS 2013): a lecture in four ~5-minute segments; with a test after
  each, mind-wandering (≈40% at baseline) halved and note-taking roughly tripled;
  restudying gave no such gain. A 2016 follow-up found the mind-wandering rates
  equal but its harm smaller in the tested group, and a later field study found
  the benefit shrinks with on-screen distractions.
- **Rewatching is the weakest restudy.** Waterloo, 385 students (MacLeod et al.
  2026): read-then-reread beat every condition involving video (p < .01); the
  three video conditions did not differ.

The disagreeing source, checked: the 5-minute result above, and a 2025 preprint
summary that viewers of explainer videos _under_-estimated themselves. Neither
says watching alone teaches; both say it feels better than it is in the moment.
For chess the point is direct: the opening is a sequence you must _produce_ at
the board, and Practice already makes the learner produce it.

## 5. Who already joins video to position

**Chessvision.ai** finds YouTube videos containing a scanned or played position
and starts them "from where the position occurs", by computer vision over the
video frames; browser extension, mobile scanner and a video app with a synced
board. Its own demo said "just over 100 videos" at launch; current index size and
price were not stated. A hobbyist did the same for ~2,000 agadmator videos (85%
square accuracy). So **"jump to the moment" is solved elsewhere, by vision we
cannot run** (no pipeline, no spend; charter). Chessly (GothamChess) sells video
plus drills at $89.99 a year. Chessable's free Short & Sweet courses pair
some video with MoveTrainer (night 2).

## What this means for us

1. **Being the place they watch is not the gap; being the place they practise
   what they watched is.** Learners already find videos on YouTube by creator.
   What they lack, by their own account, is the step after: produce the moves,
   tied back to the video. Every fix they described leaves YouTube for a second
   tool. We hold both halves on one page — an inline player that keeps the
   board in view, and Practice — and they do not touch: the video is two screens
   down and closed on a phone, and Practice does not know a video was watched.
2. **Watch → play → come back is a session with an end.** Night 2's "a session
   ends when a finite thing is done" plus this night's "testing after a video
   beats rewatching a week later" give a shape: watch (or skim) the video for
   this line, then play the line from memory, then see it again later. The
   third step is #196 practice memory; the second exists; the first needs the
   video next to the board, not below the plans.
3. **Our video is mostly a lecture about the family, not the line.** On 86% of
   pages the top video is shared with 20+ others and runs ~28 minutes. Honest
   framing beats pretence: call it "Video on the Sicilian" with the length,
   rather than implying it covers this line. Timestamps would fix it properly;
   the only sources are YouTube chapters (descriptions: needs the YouTube API,
   a pipeline, an owner yes) or vision (out of reach). Not for this experiment
   without a yes.
4. **Do not rank by views.** Learners pick creators by their level (Gotham low,
   Naroditsky higher). #244 asks about ranking by views; the evidence here says
   level fit matters more than view count, and the band selector already knows
   the learner's level. Note for #244, not a feature.
5. **Candidate for Gate A**: _a short study unit per opening_ — the family video
   beside the board, then "play the line" in Practice, with a visible done and a
   review later (#196). It builds on #196, #199 "Start here" and the existing
   gallery, needs no data we lack, and answers both night 2 (end and return) and
   tonight (video does not stick without production). Weigh it against the
   common-plans book (night 4) and own games (night 5).

## Not checked

- YouTube itself: descriptions, chapters, comments, audience retention — the
  cloud gets Google's captcha. Whether Hanging Pawns and Naroditsky videos carry
  chapter timestamps is unknown and decides whether point 3 is cheap.
- Lichess blog posts (403), including ChessMood's on memorising openings and
  Braden Laughlin on video vs book learning.
- Chessvision.ai hands-on, and its price.
- No survey of _why_ people choose YouTube exists in what was found; section 3
  is forum testimony.

## Sources

- Kardas & O'Brien,
  [Chicago Booth press release](https://www.chicagobooth.edu/media-relations-and-communications/press-releases/easier-seen-than-done-watching-how-to-videos-on-youtube-gives-people-false-sense-of-expertise)
- [Testing effect with Coursera lectures, PMC4731506](https://pmc.ncbi.nlm.nih.gov/articles/PMC4731506)
- Szpunar et al., PNAS 2013, via the
  [Harvard Gazette](https://news.harvard.edu/gazette/?p=134424); follow-ups via
  search ([Jing et al. 2016](https://sites.harvard.edu/schacter-memory/files/2022/08/jing2016-1-1.pdf))
- MacLeod et al.,
  [Online studying and restudying text versus video](https://uwaterloo.ca/memory-attention-cognition-lab/sites/default/files/uploads/documents/stl26.pdf)
  (abstract read)
- Chess.com:
  [preferred method for learning openings](https://www.chess.com/forum/view/chess-openings/preferred-method-for-learning-openings),
  [MoveTrainer vs a video series](https://www.chess.com/forum/view/chess-openings/learning-with-movetrainer-vs-a-video-series),
  [approaches to learning openings](https://www.chess.com/blog/Zipho-lunika-blog/approaches-to-learning-chess-openings),
  [the two sides of opening study](https://www.chess.com/blog/PolishDavidd/the-two-sides-of-opening-study),
  [working on openings below 2000](https://www.chess.com/blog/Armand_Spenser/working-on-opening-below-2000),
  [the free route](https://www.chess.com/forum/view/for-beginners/the-pros-and-cons-of-taking-the-free-route-to-chess-learning)
- [Chessvision.ai](https://chessvision.ai),
  [its video search demo](https://chessvision.ai/blog/video-search-demo);
  [agadmator position search](https://nikonyrh.github.io/agadmator.html);
  [Chessly](https://chessly.com)
