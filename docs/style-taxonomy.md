# Opening style taxonomy

**Status (2026-10-03):** draft for the pilot. This is the rubric every
researcher, classifier and judge works from, and the source of the glossary text
users will see. Plan:
`docs/proposals/2026-10-02-opening-style-classification.md`, "Execution plan".

## Rules that apply to every axis

- **One value per axis.** An opening cannot be both Solid and Sharp. That is the
  whole point; the old tags let 154 of the top 300 be aggressive and solid at
  once.
- **Tags use the most standard word; search accepts the rest.** See
  [Search words](#search-words).
- **Describe the middlegame the line leads to,** not the first move and not the
  name. The Queen's Gambit is not a gambit.
- **A root's tags describe its main line.** Where a sub-line plays differently,
  it becomes its own root or overrides its parent with a stated reason. When a
  root splits evenly between branches, the main line is the one strong players
  choose most, and every axis is read from that same branch: the Two Knights is
  Sharp and Open together, from 4.Ng5.
- **Side-specific values carry a side.** Gambit and Dubious say who gives the
  material or takes the risk.
- **The middle value is never shown.** Balanced, Sound, Flexible, standard
  approach and Intermediate are stored, because search ranks on them, but a page
  only shows words that tell you something.
- **A dispute involving a middle value resolves to classifier A's answer.**
  Classifier A reads these notes and anchors; Jev sees only the criteria and
  seldom picks a middle value. A blind judge audit of 14 such disputes agreed
  with A in 13. Only disputes between two shown words go to the judge.
- **Words, never numbers.** Confidence is stored per value for ranking and for
  the review queue. It is never displayed.
- **When the evidence is thin, say so.** A classifier marks low confidence
  rather than guessing. Obscure lines inherit from their parent variation.

## Axes

The glossary line under each value is user-facing copy (tooltip, Discover filter
help). Sentence case, British English, no more than two short sentences.

### Character — Solid / Balanced / Sharp

| Value    | Shown | Glossary                                                                          |
| -------- | ----- | --------------------------------------------------------------------------------- |
| Solid    | yes   | Hard to break down, with few ways to lose quickly. Play is steady, not forcing.   |
| Balanced | no    | —                                                                                 |
| Sharp    | yes   | Concrete, forcing play where both sides take risks. One wrong move can lose fast. |

"Solid or sharp?" is how players frame the choice, so these are the two shown
words. Solid is about how hard the position is to lose, not how slow it is: the
Caro-Kann is Solid even in lines with real tactics. An earlier draft used
"Quiet", which left the Caro-Kann with no word at all.

Character and structure are independent. The King's Indian Mar del Plata is
closed _and_ sharp: the centre locks, then both sides race on opposite wings.

### Gambit — none / White / Black

| Value        | Shown | Glossary                                                                  |
| ------------ | ----- | ------------------------------------------------------------------------- |
| White gambit | yes   | White gives up material, usually a pawn, for time, development or attack. |
| Black gambit | yes   | Black gives up material, usually a pawn, for time, development or attack. |

A gambit is material given up on purpose that the opponent can keep if they want
to. If it comes straight back by force, it is not a gambit: Queen's Gambit
Accepted and Declined are both "none". Countergambits count. A gambit's
**declined** lines are "none", because no material has changed hands: King's
Gambit Declined is not a gambit, King's Gambit Accepted is.

Check: the material balance in the FEN. Positions caught mid-exchange confound
it, so it flags disagreements and does not decide them.

### Soundness — Sound / Dubious

| Value   | Shown | Glossary                                                                  |
| ------- | ----- | ------------------------------------------------------------------------- |
| Sound   | no    | —                                                                         |
| Dubious | yes   | Strong players consider it unsound. It scores through surprise and traps. |

Records the side taking the risk. Most gambits are Sound; Dubious is for lines
strong players consider refuted or close to it. "Dubious" is the annotator's ?!
and covers "close to refuted"; "unsound" tends to claim a forced refutation.

### Structure — Open / Semi-open / Flexible / Closed

| Value     | Shown | Glossary                                                                       |
| --------- | ----- | ------------------------------------------------------------------------------ |
| Open      | yes   | Central pawns come off early, leaving open files and diagonals for the pieces. |
| Semi-open | yes   | The centre is partly open. Usually one side gets a half-open file to press on. |
| Flexible  | no    | —                                                                              |
| Closed    | yes   | The central pawns lock together, and play moves to the wings.                  |

This is about the centre in the typical middlegame. It is not the textbook "open
game / semi-open game / closed game" split by first move, and the glossary has
to say so where it appears.

**Closed means locked**: pawn chains in contact that cannot easily be exchanged
(French Advance, the King's Indian after d5, the Stonewall). **Flexible** is the
hidden middle value for a centre in tension or not yet decided: the QGD, the
London, the Italian with d3, the Closed Ruy Lopez, and flank openings such as
the English and the Réti. Exchange variations that leave a half-open file
(Caro-Kann, Slav, QGD) are Semi-open.

**Open against Semi-open:** Open is when the game turns on open lines for the
pieces straight away, as in the Scotch and the Two Knights after 4.Ng5 d5. A
fixed asymmetric centre that one side presses along a file (every Sicilian,
including the Smith-Morra, and the Scandinavian) is Semi-open, as is a
symmetrical exchange structure with one open file (Exchange French, Petrov, Slav
and QGD Exchanges). "Open game" in a source usually means open lines, not this
axis.

An earlier draft let Closed cover a tense centre too. In the pilot that put 42%
of games under Closed, including the Italian, the Ruy Lopez and every Exchange
variation, which no player would call closed.

### Approach — System / standard / Offbeat

| Value    | Shown | Glossary                                                                           |
| -------- | ----- | ---------------------------------------------------------------------------------- |
| System   | yes   | A set-up you can play against almost anything. Plans matter more than move orders. |
| standard | no    | —                                                                                  |
| Offbeat  | yes   | Seldom played by strong players. Chosen mainly for surprise.                       |

"Against almost anything" means across the opponent's defences, not across the
replies within one defence: an anti-Sicilian such as the Closed Sicilian or the
Alapin is standard, the London is a System.

Less common is not offbeat. The Vienna, the Bishop's Opening and the
Scandinavian are played less than the main lines but are respectable choices at
every level, so they are standard. Offbeat is for openings strong players hardly
use at all: the Grob, the Englund, the Latvian.

### Level — Beginner / Intermediate / Advanced

| Value        | Shown | Glossary                                                                         |
| ------------ | ----- | -------------------------------------------------------------------------------- |
| Beginner     | yes   | Clear plans and little to memorise. A good first repertoire choice.              |
| Intermediate | no    | —                                                                                |
| Advanced     | yes   | Either long forcing lines you need to know, or plans that are hard to get right. |

The site's existing labels, judged directly against these definitions and the
anchors. An opening is Advanced for one of two reasons, memory or understanding,
and the brief records which: the Najdorf for the first, the King's Indian for
the second. That reason feeds the description later; it is not a separate tag.

Level is judged for the side that studies the line: Black for a defence and its
variations (the King's Indian, the Najdorf), White for a White opening, system
or anti-line (the London, the Alapin, the Jobava). A Dubious line is never
Beginner, however few moves it asks you to learn, because it is not a good first
repertoire choice.

Today's values are 61% Advanced and 1.4% Beginner because the old prompt had no
definitions. The selectivity check applies here too: Advanced may not hold more
than ~40% of the top 1,000 positions.

### Plans — up to three from a closed list

The typical plans and structures, named the way players name them: "Minority
attack", "Isolated queen's pawn", "Bishop pair". They give mainstream openings
something to say where every other axis sits on its hidden middle value: the
Nimzo-Indian would otherwise show only "Semi-open". A page shows at most two,
and search uses all three.

The list is **not** written up front: it is derived from the `plan_phrases` the
pilot briefs collected, keeping phrases that several variations share and that a
club player would recognise, then frozen at about 30. The owner skims it once.
Inventing it in advance is how `strategic_themes` reached 9,403 values.

**Draft list (2026-10-04),** from the `plan_phrases` of 102 briefs. Synonyms are
merged ("attack on f7" into Pressure on f7, "rapid development" into Lead in
development). Left out on purpose: meta phrases that other axes already carry
("surprise weapon", "avoiding theory", "flexible move order"), move-specific
breaks ("…c5 break"), which are jargon on a chip, and named attacks such as the
Yugoslav, which are sub-lines rather than plans.

| Key                    | Label                  | Glossary                                                                                          |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| isolated_queens_pawn   | Isolated queen's pawn  | A lone d-pawn. It gives active pieces now and is a target later.                                  |
| hanging_pawns          | Hanging pawns          | Two centre pawns side by side with no neighbours. Strong when they advance, weak when they stall. |
| carlsbad_structure     | Carlsbad structure     | The Queen's Gambit Exchange pawn shape, home of the minority attack.                              |
| maroczy_bind           | Maróczy Bind           | White pawns on c4 and e4 clamp down on d5.                                                        |
| hedgehog               | Hedgehog               | Pawns kept on the sixth rank, waiting to break out with …b5 or …d5.                               |
| stonewall              | Stonewall              | Pawns on c3, d4, e3 and f4 (or Black's mirror), with an eye on e5 and the kingside.               |
| doubled_pawns          | Doubled pawns          | One side accepts doubled pawns for the bishop pair or open lines.                                 |
| fianchetto             | Fianchetto             | A bishop on g2, g7, b2 or b7, aimed down the long diagonal.                                       |
| space_advantage        | Space advantage        | One side gains space and the other has to find room for its pieces.                               |
| central_pawn_majority  | Central pawn majority  | More pawns in the centre, to be pushed later.                                                     |
| half_open_c_file       | Half-open c-file       | A rook on the c-file presses with no pawn of its own in the way.                                  |
| knight_outpost         | Knight outpost         | A knight on a square no pawn can chase it from, such as d5 or e5.                                 |
| bishop_pair            | Bishop pair            | Two bishops against bishop and knight, an edge once the position opens.                           |
| bad_bishop             | Bad bishop             | A bishop hemmed in by its own pawns, a long-term problem.                                         |
| kingside_attack        | Kingside attack        | Pieces and pawns aimed at the king.                                                               |
| pawn_storm             | Pawn storm             | Pawns marched up the board at the enemy king.                                                     |
| opposite_side_castling | Opposite-side castling | Kings on opposite wings and a race to attack first.                                               |
| minority_attack        | Minority attack        | Two queenside pawns advanced against three, to leave a weakness behind.                           |
| queenside_expansion    | Queenside expansion    | Pawns pushed on the queenside to gain space and open lines there.                                 |
| pressure_on_f7         | Pressure on f7         | Pieces aimed at f7, the weak point beside Black's king early on.                                  |
| lead_in_development    | Lead in development    | Pieces out faster, often for a pawn, and the need to use them quickly.                            |
| hypermodern_centre     | Hypermodern centre     | Let the opponent build a centre, then attack it with pieces and pawn breaks.                      |
| early_queen            | Early queen            | The queen comes out early and has to dodge the attacks on her.                                    |
| symmetrical_structure  | Symmetrical structure  | Mirror-image pawns and a slow fight for small edges.                                              |

An opening gets up to three, most characteristic first. The final plans are
those both classifiers chose; where they share none, the page shows none.

## Anchors

Textbook cases that any classification must get right. An arm that gets one
wrong fails. Names are as they appear in `api/data/eco/`.

| Axis      | Value                         | Anchors                                                                                                                                                                                      |
| --------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Character | Solid                         | Caro-Kann Defense: Classical Variation · Queen's Gambit Declined: Orthodox Defense · Ruy Lopez: Berlin Defense · Slav Defense: Exchange Variation · Queen's Pawn Game: London System         |
| Character | Balanced                      | Ruy Lopez: Closed · Nimzo-Indian Defense: Rubinstein System                                                                                                                                  |
| Character | Sharp                         | Sicilian Defense: Najdorf Variation · Sicilian Defense: Dragon Variation · Semi-Slav Defense: Botvinnik Variation · King's Gambit Accepted · Ruy Lopez: Marshall Attack                      |
| Gambit    | White                         | King's Gambit Accepted · Italian Game: Evans Gambit · Sicilian Defense: Smith-Morra Gambit                                                                                                   |
| Gambit    | Black                         | Benko Gambit · Queen's Gambit Declined: Albin Countergambit · Ruy Lopez: Marshall Attack · Petrov's Defense: Stafford Gambit · Englund Gambit                                                |
| Gambit    | none                          | Queen's Gambit Accepted · Queen's Gambit Declined: Orthodox Defense                                                                                                                          |
| Soundness | Dubious                       | Petrov's Defense: Stafford Gambit · Englund Gambit · Latvian Gambit · Elephant Gambit                                                                                                        |
| Soundness | Sound                         | Benko Gambit · Ruy Lopez: Marshall Attack · Italian Game: Evans Gambit                                                                                                                       |
| Structure | Open                          | Scotch Game · Queen's Gambit Accepted                                                                                                                                                        |
| Structure | Semi-open                     | Sicilian Defense: Najdorf Variation · Sicilian Defense: Dragon Variation                                                                                                                     |
| Structure | Closed                        | French Defense: Advance Variation · King's Indian Defense: Orthodox Variation · Dutch Defense: Stonewall Variation                                                                           |
| Structure | Flexible                      | Queen's Pawn Game: London System · Queen's Gambit Declined · English Opening · Italian Game: Giuoco Pianissimo                                                                               |
| Structure | Semi-open                     | Caro-Kann Defense: Exchange Variation · Slav Defense: Exchange Variation · Queen's Gambit Declined: Exchange Variation                                                                       |
| Approach  | System                        | Queen's Pawn Game: London System · Queen's Pawn Game: Colle System · King's Indian Attack · Dutch Defense: Stonewall Variation · Hippopotamus Defense                                        |
| Approach  | Offbeat                       | Grob Opening · Englund Gambit · Latvian Gambit · Elephant Gambit                                                                                                                             |
| Approach  | standard                      | Vienna Game · Sicilian Defense: Accelerated Dragon · Sicilian Defense: Alapin Variation                                                                                                      |
| Level     | Intermediate (never Beginner) | Petrov's Defense: Stafford Gambit                                                                                                                                                            |
| Level     | Beginner                      | Queen's Pawn Game: London System · Queen's Pawn Game: Colle System · Italian Game: Giuoco Pianissimo                                                                                         |
| Level     | Intermediate                  | Queen's Gambit Declined: Orthodox Defense · Caro-Kann Defense: Classical Variation                                                                                                           |
| Level     | Advanced                      | Sicilian Defense: Najdorf Variation · Semi-Slav Defense: Botvinnik Variation · Ruy Lopez: Marshall Attack · Grünfeld Defense: Exchange Variation · King's Indian Defense: Orthodox Variation |

## Search words

What players type is wider than what a page shows. Search maps these onto the
axes; they are never shown as tags.

| People say                                                  | Means                        |
| ----------------------------------------------------------- | ---------------------------- |
| solid, safe, reliable                                       | Solid                        |
| sharp, aggressive, attacking, tactical, double-edged, risky | Sharp                        |
| positional, strategic                                       | Solid or Balanced            |
| gambit, sacrifice, countergambit                            | White gambit or Black gambit |
| dubious, unsound, trappy, tricky                            | Dubious                      |
| system, set-up, universal                                   | System                       |
| offbeat, surprise, rare                                     | Offbeat                      |
| beginner, easy, simple                                      | Beginner                     |

"Aggressive" depends on whose side you are on, which is why it is a search word
and not a tag: "aggressive openings for Black" ranks Sharp lines and Black
gambits from Black's side. Considered and left out for now: **Trappy**, which
most openings are a little, and **Drawish**, which is a top-level reputation
that would put club players off.

## Owner's sanity-check set

Openings the owner plays and knows, read by them after each batch. They are not
anchors, which are textbook cases; they are where the owner can tell from
experience whether a tag is wrong.

- White: Vienna Game, Vienna Game: Vienna Gambit, Rapport-Jobava System,
  Sicilian Defense: Alapin Variation and other anti-Sicilians
- Black: Sicilian Defense: Accelerated Dragon, King's Indian Defense,
  Nimzo-Indian Defense

Two of these test the grouping directly. The Accelerated Dragon is its own root
by move order and must not inherit the Dragon's tags. The Alapin is filed under
both "Sicilian: Alapin" and "Sicilian Defense: Alapin Variation", and both must
come out the same.

## Open decisions (owner)

Defaults are what the pilot will use unless you say otherwise.

1. **Gambit chips name the side** ("Black gambit"). Default: yes.
2. ~~Plans are not shown in the first release.~~ Reversed 2026-10-03: plans are
   shown, at most two per page, because the calibration left mainstream openings
   with a single tag.
3. **The plans list** above. Owner skims it once.
