# Video matching and Jev

A short overview of how videos reach opening pages, what changed on 2026-10-02,
and why. The evidence is in
[the experiment write-up](proposals/2026-10-02-jev-video-experiment.md); the
runbook is in [the pipeline README](../tools/video-pipeline/README.md).

## The challenge

Every one of the 12,377 opening pages wants a few YouTube videos about _that_
line. The only thing we know about a video is its own text: title, description
and tags. Opening names make that hard:

- **Names collide.** The Chigorin _Defence_ (1.d4 d5 2.c4 Nc6) and the Chigorin
  _Variation_ (1.d4 d5 2.Nc3) are different openings.
- **Families nest.** A Sicilian lecture mentions the Kan, the Najdorf and the
  Dragon. Is it about any of them?
- **Titles lie or say nothing.** "This New Stafford Gambit Will SHOCK Your
  Opponents!" is a Busch-Gass Gambit video. "Beat 1.e4 in 7 moves" names nothing
  at all.

A blind judge rated the pairs the site was showing: only about **26%** were a
good match. The rest were videos about a sibling line, a different opening, or
something that merely mentioned it.

## How the pipeline ran

1. **Discover** new uploads from 16 trusted channels (RSS monthly, or the
   YouTube API for a full rebuild).
2. **Pre-filter** by channel tier, duration and obvious non-opening content.
3. **Enrich** with YouTube metadata, cached for good in
   `tools/data/video_enrichment_cache.json`.
4. **Score** every video against every opening with a keyword scorer: name in
   the title, name in the description, family match, channel tier, educational
   cues, and guards against cross-family hits.
5. **Keep the top 10** per opening in SQLite.
6. **Write** one file per position, then consolidate them into
   `api/data/video-index.json`, which the API serves.
7. **Fall back:** a page with no videos shows a labelled shelf of its opening
   family's best videos.

The scorer is fast and free, but it reads words, not meaning. Each of its guards
fixed one failure and left the general problem in place.

## How it runs now

Steps 1–7 are unchanged. Two steps run after consolidation, in
`tools/video-pipeline/scripts/apply-jev-filter.js`:

8. **Jev filter.** For every page and video pair, Jev answers: is this video
   _main subject_, _covered_, _mentioned only_ or _not about_ this opening? A
   pair is removed only when the answer is _mentioned only_ or _not about_ and
   Jev puts less than 40% on the first two. Answers are cached per video and
   named opening, so a monthly run pays only for new pairs.
9. **Pins.** `config/video_pins.json` puts hand-verified videos first on pages
   the scorer cannot reach.

Everything fails open. Without a key, during an outage, or for a video Jev
hasn't seen, the scorer's choice stays on the page.

## What Jev is, and what it does here

Jev (TypeSafe) is a typed decision model. You give it some text and a question
with fixed answers, and it returns one answer with a probability for each. It
reads, so it knows "New Stafford Gambit" is the Busch-Gass and that a Najdorf
lecture isn't about the Kan. It costs $0.042 per million input tokens: the whole
experiment cost $1.60, and a monthly run costs cents.

Jev has one systematic weakness: **it knows names, not move orders.** It is
confidently wrong when two openings share a name, or when one named line leads
to another (an Italian Game video on the King's Knight Opening page). That
shaped both uses:

- **As a veto, alone.** When Jev says a video is not about an opening, it was
  right 99% of the time, and every removal under the 40% bar was right. Its
  "yes" was only about half right, so it never ranks or adds anything by itself.
- **As a nominator, checked.** For empty top pages, Jev suggested candidates.
  About 80% of its confident ones were good, so only the 18 that the blind judge
  also confirmed became pins.

## Is it an improvement?

Yes. The gain is real but narrower than "videos are now good":

- **The long tail is much cleaner.** 31,605 of 72,283 displayed pairs were
  removed, and on the judged sample essentially all of them were wrong. The
  share of shown pairs that are good rises from about 26% to about 44%, with
  almost no good matches lost. That estimate comes from reweighted samples, so
  it's ±12 points.
- **The top-200 pages are now covered.** 181 of the 200 most-played positions
  now show videos of their own, up from 178 before the filter and 172 after it.
  Nine pages that showed a generic or unrelated family shelf now lead with a
  video about that exact opening. Four of them previously showed the same
  Nimzowitsch, Owen's and Danish videos on every page.
- **The #1 video on covered top pages barely changed.** 149 of 178 kept the same
  #1. Where it changed, the judge found Jev's version better 7 times and
  worse 6. Most of those pages still lead with a sibling-line video, which needs
  a move-order check that neither the scorer nor Jev does.
- **Not yet measured:** user behaviour. Everything above is judged relevance.

## What's next

- **The scorer gives 0** to some videos whose titles do name the opening
  (Veresov, Owen, Nimzo-Larsen). Fixing that beats adding more pins.
- **A move-order check** on the top few hundred pages: the remaining quality
  problem where traffic is.
- **The `irregular` family is a grab-bag.** Queen's Pawn systems, the Owen and
  the Horwitz have no family of their own.
