import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildOpeningsMap, lookupOpeningFromPGN, OpeningForLookup } from '../../../../shared/src';
import styles from './PersonalOpeningStats.module.css';
import { groupByFamily, type OpeningAggInput, type SortMode } from './familyAggregation';
import { FamilyRow } from './FamilyRow';
import { UncategorisedFootnote } from './UncategorisedFootnote';
import { DistributionBar } from './DistributionBar';

type GroupBy = 'family' | 'variation';

type Platform = 'lichess' | 'chess.com';

type Side = 'white' | 'black';

type Result = 'win' | 'draw' | 'loss';

type OpeningAgg = {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  family_id?: string;
  games: number;
  win: number;
  draw: number;
  loss: number;
};

const toAggInput = (o: OpeningAgg): OpeningAggInput => ({
  key: o.fen,
  name: o.name,
  eco: o.eco,
  family_id: o.family_id,
  games: o.games,
  wins: o.win,
  draws: o.draw,
  losses: o.loss,
});

type DashboardData = {
  totalGames: number;
  classifiedGames: number;
  unclassifiedGames: number;
  whiteGames: number;
  whiteWin: number;
  whiteDraw: number;
  whiteLoss: number;
  blackGames: number;
  blackWin: number;
  blackDraw: number;
  blackLoss: number;
  asWhite: OpeningAgg[];
  asBlack: OpeningAgg[];
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeUsername(value: string) {
  return value.trim();
}

function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = (pgn || '').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('[')) continue;
    const m = trimmed.match(/^\[([^\s]+)\s+"(.*)"\]$/);
    if (!m) continue;
    headers[m[1]] = m[2];
  }
  return headers;
}

function getUserSide(headers: Record<string, string>, username: string): Side | null {
  const u = username.toLowerCase();
  const white = (headers.White || '').toLowerCase();
  const black = (headers.Black || '').toLowerCase();
  if (white === u) return 'white';
  if (black === u) return 'black';
  return null;
}

function getUserResult(headers: Record<string, string>, side: Side): Result | null {
  const r = headers.Result;
  if (!r) return null;
  if (r === '1/2-1/2') return 'draw';
  if (r === '1-0') return side === 'white' ? 'win' : 'loss';
  if (r === '0-1') return side === 'black' ? 'win' : 'loss';
  return null;
}

function sortAgg(list: OpeningAgg[], mode: SortMode = 'frequency') {
  return [...list].sort((a, b) => {
    if (mode === 'best') return b.win / b.games - a.win / a.games;
    if (mode === 'worst') return a.win / a.games - b.win / b.games;
    if (b.games !== a.games) return b.games - a.games;
    if (b.win !== a.win) return b.win - a.win;
    return (a.name || '').localeCompare(b.name || '');
  });
}

function upsertAgg(
  map: Map<string, OpeningAgg>,
  opening: { fen: string; name: string; eco: string; moves?: string; family_id?: string },
  result: Result
) {
  const existing = map.get(opening.fen) || {
    fen: opening.fen,
    name: opening.name,
    eco: opening.eco,
    moves: opening.moves || '',
    family_id: opening.family_id,
    games: 0,
    win: 0,
    draw: 0,
    loss: 0,
  };

  existing.games += 1;
  existing[result] += 1;
  map.set(opening.fen, existing);
}

function getWinRate(o: OpeningAgg): number {
  if (o.games === 0) return 0;
  return Math.round((o.win / o.games) * 100);
}

// Featured cards need a few games behind them — a 2-game 100% line shouldn't
// headline "Top-performing". (The opening list/sort have no such floor.)
const MIN_CARD_GAMES = 4;

function getLossRate(o: OpeningAgg): number {
  if (o.games === 0) return 0;
  return Math.round((o.loss / o.games) * 100);
}

function findBestOpening(list: OpeningAgg[]): OpeningAgg | null {
  if (list.length === 0) return null;
  const qualified = list.filter((o) => o.games >= MIN_CARD_GAMES);
  if (qualified.length === 0) return list[0];
  return qualified.reduce((best, curr) => (getWinRate(curr) > getWinRate(best) ? curr : best));
}

function findWeakestOpening(list: OpeningAgg[]): OpeningAgg | null {
  if (list.length === 0) return null;
  const qualified = list.filter((o) => o.games >= MIN_CARD_GAMES);
  if (qualified.length === 0) return null;
  // Select by highest loss rate so "Needs work" matches the loss rate the card
  // displays (lowest win rate could flag a safe, drawish line as a weakness).
  return qualified.reduce((worst, curr) => (getLossRate(curr) > getLossRate(worst) ? curr : worst));
}

function getOpeningMovesDisplay(moves: string): string {
  const trimmedMoves = moves.trim();
  if (!trimmedMoves) return '';

  const movePattern = /(\d+\.\s*\S+(?:\s+\S+)?)/g;
  const moveMatches = trimmedMoves.match(movePattern) || [];

  if (moveMatches.length > 0) {
    return moveMatches.slice(0, 2).join(' ');
  }

  return trimmedMoves;
}

type SideTab = 'white' | 'black';

const FORM_STATE_KEY = 'personal-openings:form-state';
const LAST_ANALYSIS_SNAPSHOT_KEY = 'personal-openings:last-analysis-snapshot';

function readSavedFormState(): {
  username?: string;
  platform?: Platform;
  limit?: number;
  activeTab?: SideTab;
} | null {
  try {
    const raw = sessionStorage.getItem(FORM_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ==============================
   SVG Icons
   ============================== */
const UserIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/* ==============================
   PILL CONTROLS (sort filters + segmented toggles)
   ============================== */
const SORT_LABELS: Record<SortMode, string> = {
  frequency: 'Most played',
  best: 'Highest win rate',
  worst: 'Lowest win rate',
};

const SORT_ORDER: ReadonlyArray<SortMode> = ['frequency', 'best', 'worst'];

/** Full-width segmented pill — used for the mobile As White / As Black switch
    (a primary mode switch). aria-pressed buttons in a labelled group. */
function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className={styles.pillToggle} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`${styles.pillBtn} ${active ? styles.pillBtnActive : ''}`}
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(opt.value);
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Grouped-list mark — signals the "group by family" action without leaning on
    the segmented-control idiom that clashed with the sort pills. */
const GroupIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2.5 3.5h11" />
    <path d="M6 8h7.5" />
    <path d="M6 12h7.5" />
    <path d="M3 7.5v5" />
  </svg>
);

/** Single toggle chip in the sort-pill style — grouping is binary (family vs
    flat), so one filled-when-on chip is lighter and more consistent than a
    segmented two-option control. The icon distinguishes it from sort pills. */
const GroupToggle: React.FC<{
  grouped: boolean;
  onChange: (grouped: boolean) => void;
  /** Side suffix keeps the accessible name unique while still containing the
      visible "Group by family" text (WCAG 2.5.3 Label in Name). */
  sideLabel: string;
}> = ({ grouped, onChange, sideLabel }) => (
  <button
    type="button"
    className={`${styles.groupPill} ${grouped ? styles.groupPillActive : ''}`}
    aria-pressed={grouped}
    aria-label={`Group by family, ${sideLabel}`}
    onClick={() => onChange(!grouped)}
  >
    <GroupIcon />
    <span>Group by family</span>
  </button>
);

/** Descending-bars sort glyph. */
const SortGlyph = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M3 4.5h10" />
    <path d="M3 8h6.5" />
    <path d="M3 11.5h3.5" />
  </svg>
);

/** Sort control — a compact "Sort: <current>" pill that opens a small
    single-select menu. Used on both breakpoints so the filter row stays two
    pills (group chip + sort) on one line; three visible sort pills wrapped even
    at desktop column widths (~452px). */
const SortMenu: React.FC<{
  value: SortMode;
  onChange: (mode: SortMode) => void;
  ariaLabel: string;
}> = ({ value, onChange, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, SORT_ORDER.indexOf(value));
    optionRefs.current[idx]?.focus();
  }, [open, value]);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const onOptionKeyDown = (e: React.KeyboardEvent, i: number) => {
    const last = SORT_ORDER.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      optionRefs.current[i === last ? 0 : i + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      optionRefs.current[i === 0 ? last : i - 1]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      optionRefs.current[last]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className={styles.sortMenu} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.sortTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <SortGlyph />
        <span>Sort: {SORT_LABELS[value]}</span>
        <svg
          className={open ? styles.sortChevronOpen : styles.sortChevron}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className={styles.sortPopover} role="menu" aria-label={ariaLabel}>
          {SORT_ORDER.map((mode, i) => {
            const active = mode === value;
            return (
              <button
                key={mode}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`${styles.sortOption} ${active ? styles.sortOptionActive : ''}`}
                onClick={() => {
                  onChange(mode);
                  close();
                }}
                onKeyDown={(e) => onOptionKeyDown(e, i)}
              >
                <span>{SORT_LABELS[mode]}</span>
                {active && (
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SIDE_OPTIONS: ReadonlyArray<{ value: SideTab; label: string }> = [
  { value: 'white', label: 'As White' },
  { value: 'black', label: 'As Black' },
];

/* ==============================
   OPENING NAME SPLIT (family : variation)
   ============================== */
const OpeningNameSplit: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const colonIdx = name.indexOf(':');
  if (colonIdx === -1) return <span className={className}>{name}</span>;
  return (
    <span className={className}>
      <span className={styles.nameFamily}>{name.slice(0, colonIdx)}</span>
      <span className={styles.nameColon}>:</span>
      <span className={styles.nameVariation}>{name.slice(colonIdx + 1).trimStart()}</span>
    </span>
  );
};

/* ==============================
   OPENING ROW COMPONENT
   ============================== */
const OpeningRow: React.FC<{
  opening: OpeningAgg;
  platform: Platform;
  username: string;
  index: number;
}> = ({ opening, platform, username, index }) => {
  const delay = Math.min(index * 30, 300);
  const wPct = opening.games > 0 ? (opening.win / opening.games) * 100 : 0;
  const dPct = opening.games > 0 ? (opening.draw / opening.games) * 100 : 0;
  const lPct = opening.games > 0 ? (opening.loss / opening.games) * 100 : 0;
  const openingMoves = getOpeningMovesDisplay(opening.moves);

  return (
    <Link
      className={styles.openingRow}
      to={`/opening/${encodeURIComponent(opening.fen)}?ref=personal&platform=${platform}&username=${encodeURIComponent(normalizeUsername(username))}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.openingRowLeft}>
        <OpeningNameSplit name={opening.name} className={styles.openingName} />
        {openingMoves && <span className={styles.openingMoves}>{openingMoves}</span>}
      </div>

      {/* Desktop: inline GP + bar */}
      <div className={styles.openingRowRight}>
        <span className={styles.gamesCount}>{opening.games}</span>
        <span className={styles.distBar}>
          <DistributionBar
            win={opening.win}
            draw={opening.draw}
            loss={opening.loss}
            games={opening.games}
          />
        </span>
      </div>

      {/* Mobile: stat counters + accent bar */}
      <div className={styles.mobileStats}>
        <div className={styles.statCounters}>
          <span className={styles.statChip}>
            <span className={styles.statDot + ' ' + styles.statDotWin} />
            <span className={styles.statNum}>{opening.win}</span>
            <span className={styles.statLabel}>W</span>
          </span>
          <span className={styles.statChip}>
            <span className={styles.statDot + ' ' + styles.statDotDraw} />
            <span className={styles.statNum}>{opening.draw}</span>
            <span className={styles.statLabel}>D</span>
          </span>
          <span className={styles.statChip}>
            <span className={styles.statDot + ' ' + styles.statDotLoss} />
            <span className={styles.statNum}>{opening.loss}</span>
            <span className={styles.statLabel}>L</span>
          </span>
          <span className={styles.statGames}>{opening.games} games</span>
        </div>
        {opening.games > 0 && (
          <div className={styles.accentBar}>
            {wPct > 0 && <div className={styles.accentWin} style={{ width: `${wPct}%` }} />}
            {dPct > 0 && <div className={styles.accentDraw} style={{ width: `${dPct}%` }} />}
            {lPct > 0 && <div className={styles.accentLoss} style={{ width: `${lPct}%` }} />}
          </div>
        )}
      </div>
    </Link>
  );
};

/* ==============================
   MAIN COMPONENT
   ============================== */
export const PersonalOpeningStats: React.FC<{
  openingsData: OpeningForLookup[];
  prefillUsername?: string;
}> = ({ openingsData, prefillUsername }) => {
  const [platform, setPlatform] = useState<Platform>(
    () => readSavedFormState()?.platform ?? 'chess.com'
  );
  const [username, setUsername] = useState<string>(
    () => prefillUsername || readSavedFormState()?.username || ''
  );
  const [limit, setLimit] = useState<number>(() => readSavedFormState()?.limit ?? 500);

  const [step, setStep] = useState<'idle' | 'fetching' | 'analysing' | 'done' | 'error'>('idle');
  const [stepText, setStepText] = useState('');
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [whiteSortMode, setWhiteSortMode] = useState<SortMode>('frequency');
  const [blackSortMode, setBlackSortMode] = useState<SortMode>('frequency');
  const [activeTab, setActiveTab] = useState<SideTab>(
    () => readSavedFormState()?.activeTab ?? 'white'
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showAllMobile, setShowAllMobile] = useState(false);
  // Grouping is per-column (mirrors per-column sort) so the toggle can live
  // inside each side's filter row. Family grouping is the default.
  const [whiteGroupBy, setWhiteGroupBy] = useState<GroupBy>('family');
  const [blackGroupBy, setBlackGroupBy] = useState<GroupBy>('family');
  const [familiesDict, setFamiliesDict] = useState<
    Record<string, { id: string; display_name: string }>
  >({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Displayed state: only updates when analysis completes (not while typing)
  const [displayedUsername, setDisplayedUsername] = useState('');
  const [displayedPlatform, setDisplayedPlatform] = useState<Platform>('chess.com');

  const abortRef = useRef<AbortController | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const openingsMap = useMemo(() => buildOpeningsMap(openingsData), [openingsData]);

  const canAnalyse = normalizeUsername(username).length > 0 && openingsMap.size > 0;

  const cacheKey = useMemo(() => {
    const u = normalizeUsername(username).toLowerCase();
    // v4: store the FULL classified opening list (no top-10 truncation) so
    // family rollups aggregate over every game, not just the most-played 10.
    // v3 snapshots are pre-truncation and would undercount family totals.
    return `personal-openings:v4:${platform}:${u}:limit=${limit}:rated=true:perf=rapid,blitz,classical`;
  }, [platform, username, limit]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    // Load family display names, retrying a couple of times on failure. If it
    // never loads, groupByFamily falls back to a prettified slug, so rows are
    // still readable — this just upgrades them to the canonical names.
    const load = (attempt: number) => {
      fetch('/api/families')
        .then((r) => r.json())
        .then((j) => {
          if (!alive || !j?.success) throw new Error('families unavailable');
          const dict: Record<string, { id: string; display_name: string }> = {};
          for (const f of j.data) dict[f.id] = { id: f.id, display_name: f.display_name };
          if (alive) setFamiliesDict(dict);
        })
        .catch(() => {
          if (alive && attempt < 2) setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
        });
    };
    load(0);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({ username, platform, limit, activeTab })
      );
    } catch {
      /* ignore */
    }
  }, [username, platform, limit, activeTab]);

  // Close settings popover on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  const loadFromCache = () => {
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { dashboard: DashboardData; cachedAt: number };
      if (!parsed || !parsed.dashboard) return null;
      return parsed.dashboard;
    } catch {
      return null;
    }
  };

  const saveToCache = (data: DashboardData) => {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ dashboard: data, cachedAt: Date.now() }));
      sessionStorage.setItem(
        LAST_ANALYSIS_SNAPSHOT_KEY,
        JSON.stringify({
          cacheKey,
          displayedUsername: normalizeUsername(username),
          displayedPlatform: platform,
        })
      );
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    const saved = readSavedFormState();
    if (!saved) return;

    // Try derived cache key first; fall back to last-analysis snapshot so the
    // player name is restored even if form fields (e.g. limit) were changed
    // after the previous analysis.
    let cached = loadFromCache();
    let restoredUsername = normalizeUsername(saved.username || username);
    let restoredPlatform: Platform = (saved.platform as Platform) || platform;

    if (!cached) {
      try {
        const rawSnapshot = sessionStorage.getItem(LAST_ANALYSIS_SNAPSHOT_KEY);
        if (rawSnapshot) {
          const snapshot = JSON.parse(rawSnapshot) as {
            cacheKey: string;
            displayedUsername: string;
            displayedPlatform: Platform;
          };
          const rawCache = sessionStorage.getItem(snapshot.cacheKey);
          if (rawCache) {
            const parsed = JSON.parse(rawCache) as { dashboard: DashboardData; cachedAt: number };
            if (parsed?.dashboard) {
              cached = parsed.dashboard;
              restoredUsername = snapshot.displayedUsername;
              restoredPlatform = snapshot.displayedPlatform;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (cached) {
      setDashboard(cached);
      setDisplayedUsername(restoredUsername);
      setDisplayedPlatform(restoredPlatform);
      setStep('done');
      setStepText('Loaded your saved results');
      setProgress(100);
      setProcessed(cached.totalGames);
      setTotal(cached.totalGames);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLimitSafe = (value: number) => {
    setLimit(clampInt(value, 1, 500, 500));
  };

  const isBusy = step === 'fetching' || step === 'analysing';

  const handleAnalyse = async () => {
    if (!canAnalyse) return;

    const cached = loadFromCache();
    if (cached) {
      setDashboard(cached);
      setDisplayedUsername(normalizeUsername(username));
      setDisplayedPlatform(platform);
      setError(null);
      setStep('done');
      setStepText('Loaded your saved results');
      setProgress(100);
      setProcessed(cached.totalGames);
      setTotal(cached.totalGames);
      setShowSearchOverlay(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setDashboard(null);
    setStep('fetching');
    setStepText(`Finding your games from ${platform === 'lichess' ? 'Lichess' : 'Chess.com'}...`);
    setProgress(5);
    setProcessed(0);
    setTotal(0);

    try {
      const clamped = clampInt(limit, 1, 500, 500);
      const u = normalizeUsername(username);
      const url = `/api/personal/games?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(u)}&limit=${clamped}`;

      const response = await fetch(url, { signal: controller.signal });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(
          json?.message || "We couldn't load your games. Please check the username and try again."
        );
      }

      const gamesPgn: string[] = json?.data?.gamesPgn || [];
      setTotal(gamesPgn.length);
      setProgress(gamesPgn.length > 0 ? 15 : 100);

      setStep('analysing');
      setStepText('Analysing your games...');

      const asWhite = new Map<string, OpeningAgg>();
      const asBlack = new Map<string, OpeningAgg>();
      let classified = 0;
      let unclassified = 0;

      let whiteGames = 0;
      let whiteWin = 0;
      let whiteDraw = 0;
      let whiteLoss = 0;
      let blackGames = 0;
      let blackWin = 0;
      let blackDraw = 0;
      let blackLoss = 0;

      for (let i = 0; i < gamesPgn.length; i++) {
        if (controller.signal.aborted) return;
        const pgn = gamesPgn[i];
        const headers = parsePgnHeaders(pgn);
        const side = getUserSide(headers, u);
        if (!side) {
          unclassified += 1;
          setProcessed(i + 1);
          setStepText(`Analysing your games... (${i + 1}/${gamesPgn.length})`);
          setProgress(15 + Math.round(((i + 1) / Math.max(1, gamesPgn.length)) * 85));
          continue;
        }

        const result = getUserResult(headers, side);
        if (!result) {
          unclassified += 1;
          setProcessed(i + 1);
          setStepText(`Analysing your games... (${i + 1}/${gamesPgn.length})`);
          setProgress(15 + Math.round(((i + 1) / Math.max(1, gamesPgn.length)) * 85));
          continue;
        }

        const lookup = lookupOpeningFromPGN(pgn, openingsMap);
        if (!lookup.success || !lookup.bestMatch) {
          unclassified += 1;
          setProcessed(i + 1);
          setStepText(`Analysing your games... (${i + 1}/${gamesPgn.length})`);
          setProgress(15 + Math.round(((i + 1) / Math.max(1, gamesPgn.length)) * 85));
          continue;
        }

        classified += 1;
        // bestMatch now carries moves + family_id directly (see pgn-utils
        // OpeningMatch). The previous re-query against openingsMap was a
        // 6-part FEN lookup against a 4-part-keyed map and silently
        // returned undefined every time.
        const openingWithMoves = {
          ...lookup.bestMatch,
          moves: lookup.bestMatch.moves || '',
        };
        if (side === 'white') {
          upsertAgg(asWhite, openingWithMoves, result);
          whiteGames += 1;
          if (result === 'win') whiteWin += 1;
          if (result === 'draw') whiteDraw += 1;
          if (result === 'loss') whiteLoss += 1;
        } else {
          upsertAgg(asBlack, openingWithMoves, result);
          blackGames += 1;
          if (result === 'win') blackWin += 1;
          if (result === 'draw') blackDraw += 1;
          if (result === 'loss') blackLoss += 1;
        }

        setProcessed(i + 1);
        setStepText(`Analysing your games... (${i + 1}/${gamesPgn.length})`);
        setProgress(15 + Math.round(((i + 1) / Math.max(1, gamesPgn.length)) * 85));

        if ((i + 1) % 10 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      const data: DashboardData = {
        totalGames: gamesPgn.length,
        classifiedGames: classified,
        unclassifiedGames: unclassified,
        whiteGames,
        whiteWin,
        whiteDraw,
        whiteLoss,
        blackGames,
        blackWin,
        blackDraw,
        blackLoss,
        // Full classified lists (no truncation) — family rollups aggregate over
        // every opening. The flat "all openings" view caps its own display.
        asWhite: sortAgg(Array.from(asWhite.values())),
        asBlack: sortAgg(Array.from(asBlack.values())),
      };

      saveToCache(data);
      setDashboard(data);
      setDisplayedUsername(normalizeUsername(username));
      setDisplayedPlatform(platform);
      setWhiteSortMode('frequency');
      setBlackSortMode('frequency');
      setShowSearchOverlay(false);
      setStep('done');
      setStepText('Analysis complete');
      setProgress(100);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Something went wrong while analysing your games. Please try again.';
      setError(msg);
      setStep('error');
      setStepText('');
      setProgress(0);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setStep('idle');
    setStepText('');
  };

  const handleEnterToAnalyse: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key !== 'Enter') return;
    if (isBusy) {
      handleCancel();
      return;
    }
    void handleAnalyse();
  };

  const showHero = !dashboard && step !== 'done';

  const renderSearchForm = () => (
    <>
      <div className={styles.inputBar}>
        <div className={styles.platformToggle}>
          <button
            type="button"
            className={`${styles.platformBtn} ${platform === 'chess.com' ? styles.platformBtnActive : ''}`}
            onClick={() => setPlatform('chess.com')}
            disabled={isBusy}
          >
            Chess.com
          </button>
          <button
            type="button"
            className={`${styles.platformBtn} ${platform === 'lichess' ? styles.platformBtnActive : ''}`}
            onClick={() => setPlatform('lichess')}
            disabled={isBusy}
          >
            Lichess
          </button>
        </div>

        <div className={styles.inputFields}>
          <span className={styles.userIcon}>
            <UserIcon />
          </span>

          <input
            className={styles.usernameInput}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleEnterToAnalyse}
            placeholder="Enter username..."
            inputMode="text"
            autoComplete="off"
            disabled={isBusy}
          />
        </div>

        <div className={styles.inputActions}>
          {/* Gear / settings */}
          <div ref={settingsRef} className={styles.settingsAnchor}>
            <button
              type="button"
              className={`${styles.gearBtn} ${showSettings ? styles.gearBtnActive : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Settings"
              title={`Analysing last ${limit} games`}
            >
              <GearIcon />
            </button>
            {showSettings && (
              <div
                className={styles.settingsPopover}
                role="dialog"
                aria-label="Games to analyse settings"
              >
                <div className={styles.settingsLabel}>Games to analyse</div>
                <div
                  className={styles.stepper}
                  role="group"
                  aria-label="Number of games to analyse"
                >
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={(e) => setLimitSafe(limit - (e.shiftKey ? 10 : 1))}
                    disabled={isBusy || limit <= 1}
                    aria-label="Decrease games"
                    title="Hold Shift for -10"
                  >
                    -
                  </button>
                  <input
                    className={styles.stepperInput}
                    type="number"
                    min={1}
                    max={500}
                    step={1}
                    aria-label="Games to analyse"
                    value={limit}
                    onChange={(e) => setLimitSafe(Number(e.target.value))}
                    onKeyDown={handleEnterToAnalyse}
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={(e) => setLimitSafe(limit + (e.shiftKey ? 10 : 1))}
                    disabled={isBusy || limit >= 500}
                    aria-label="Increase games"
                    title="Hold Shift for +10"
                  >
                    +
                  </button>
                </div>
                <p className={styles.settingsHint}>Choose between 1 and 500 recent rated games.</p>
              </div>
            )}
          </div>

          <button
            className={styles.analyseBtn}
            onClick={isBusy ? handleCancel : handleAnalyse}
            disabled={!isBusy && !canAnalyse}
          >
            {isBusy && <span className={styles.spinner} aria-hidden="true" />}
            <span>{isBusy ? 'Cancel' : 'Analyse'}</span>
          </button>
        </div>
      </div>

      <p className={styles.inputNote}>
        Includes rated rapid, blitz, and classical games only (up to {limit}). Bullet is excluded.
      </p>
    </>
  );

  return (
    <div>
      {/* ===== LANDING (hero + search, centred in viewport when no results) ===== */}
      {!dashboard && (
        <div className={`${styles.landing} ${showHero ? styles.landingCentered : ''}`}>
          {showHero && (
            <div className={styles.hero}>
              <h1 className={styles.heroTitle}>Analyse Your Games</h1>
              <p className={styles.heroSubtitle}>
                Review your performance and improve your openings by connecting your chess account.
              </p>
            </div>
          )}

          {renderSearchForm()}

          {/* Secondary idle prompt */}
          {showHero && step === 'idle' && (
            <div className={styles.idlePrompt}>
              <svg
                className={styles.idlePromptIcon}
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <h2 className={styles.idlePromptTitle}>Ready to analyse your openings?</h2>
              <p className={styles.idlePromptText}>
                Enter your username to explore a detailed breakdown of your performance by opening.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===== SEARCH OVERLAY (when dashboard is showing) ===== */}
      {showSearchOverlay && (
        <div
          className={styles.searchOverlay}
          onClick={() => setShowSearchOverlay(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowSearchOverlay(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Search for a player"
        >
          <div className={styles.searchOverlayContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.searchOverlayClose}
              onClick={() => setShowSearchOverlay(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className={styles.searchOverlayTitle}>Analyse another player</h3>
            {renderSearchForm()}
            {(step === 'fetching' || step === 'analysing') && (
              <div className={styles.overlayProgress}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className={styles.progressMeta}>
                  <span>{stepText}</span>
                  {total > 0 && (
                    <span>
                      {processed}/{total}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== PROGRESS ===== */}
      {(step === 'fetching' || step === 'analysing') && (
        <div className={styles.progress} aria-live="polite">
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={styles.progressMeta}>
            <span>{stepText}</span>
            {total > 0 && (
              <span>
                {processed}/{total}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ===== ERROR ===== */}
      {step === 'error' && error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* ===== DASHBOARD ===== */}
      {dashboard &&
        (() => {
          const allOpenings = [...dashboard.asWhite, ...dashboard.asBlack];
          const bestOpening = findBestOpening(allOpenings);
          const weakestOpening = findWeakestOpening(allOpenings);
          const showWeakest = weakestOpening && bestOpening?.fen !== weakestOpening?.fen;

          const sortedWhite = sortAgg(dashboard.asWhite, whiteSortMode);
          const sortedBlack = sortAgg(dashboard.asBlack, blackSortMode);

          const whiteFamily = groupByFamily(
            dashboard.asWhite.map(toAggInput),
            familiesDict,
            whiteSortMode
          );
          const blackFamily = groupByFamily(
            dashboard.asBlack.map(toAggInput),
            familiesDict,
            blackSortMode
          );

          const activeSortMode = activeTab === 'white' ? whiteSortMode : blackSortMode;
          const setActiveSortMode = activeTab === 'white' ? setWhiteSortMode : setBlackSortMode;
          const activeGroupBy = activeTab === 'white' ? whiteGroupBy : blackGroupBy;
          const setActiveGroupBy = activeTab === 'white' ? setWhiteGroupBy : setBlackGroupBy;
          const activeData =
            activeTab === 'white'
              ? { openings: sortedWhite, games: dashboard.whiteGames }
              : { openings: sortedBlack, games: dashboard.blackGames };

          const displayedPlatformLabel = displayedPlatform === 'lichess' ? 'Lichess' : 'Chess.com';

          const openingLink = (o: OpeningAgg) =>
            `/opening/${encodeURIComponent(o.fen)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`;

          const bestOpeningMoves = bestOpening ? getOpeningMovesDisplay(bestOpening.moves) : '';
          const weakestOpeningMoves = weakestOpening
            ? getOpeningMovesDisplay(weakestOpening.moves)
            : '';

          const totalWins = dashboard.whiteWin + dashboard.blackWin;
          const totalDraws = dashboard.whiteDraw + dashboard.blackDraw;
          const totalLosses = dashboard.whiteLoss + dashboard.blackLoss;

          return (
            <>
              {/* ===== MOBILE DASHBOARD ===== */}
              <div className={styles.mobileDashboard}>
                {/* Centered hero */}
                <div className={styles.mobileHero}>
                  <h2 className={styles.mobilePlayerName}>{displayedUsername}</h2>
                  <span className={styles.mobilePlatform}>{displayedPlatformLabel}</span>
                  <span className={styles.mobileGamesMeta}>
                    {dashboard.totalGames} analysed &middot; {dashboard.classifiedGames} matched
                    {dashboard.unclassifiedGames > 0
                      ? ` · ${dashboard.unclassifiedGames} unrecognised`
                      : ''}
                  </span>
                </div>

                {/* 3 inline stat cards */}
                <div className={styles.tripleStats}>
                  <div className={`${styles.triStat} ${styles.triStatWin}`}>
                    <span className={styles.triStatLabel}>Wins</span>
                    <span className={styles.triStatValue}>{totalWins}</span>
                  </div>
                  <div className={styles.triStat}>
                    <span className={styles.triStatLabel}>Draws</span>
                    <span className={styles.triStatValue}>{totalDraws}</span>
                  </div>
                  <div className={styles.triStat}>
                    <span className={styles.triStatLabel}>Losses</span>
                    <span className={styles.triStatValue}>{totalLosses}</span>
                  </div>
                </div>

                {/* Highlight cards */}
                {bestOpening && (
                  <Link className={styles.highlightCard} to={openingLink(bestOpening)}>
                    <span className={`${styles.highlightPill} ${styles.highlightPillWin}`}>
                      Top-performing
                    </span>
                    <OpeningNameSplit name={bestOpening.name} className={styles.highlightName} />
                    {bestOpeningMoves && (
                      <span className={styles.highlightMoves}>{bestOpeningMoves}</span>
                    )}
                    <span className={styles.highlightMeta}>
                      {getWinRate(bestOpening)}% win rate &middot; {bestOpening.games} games
                    </span>
                  </Link>
                )}
                {showWeakest && weakestOpening && (
                  <Link className={styles.highlightCard} to={openingLink(weakestOpening)}>
                    <span className={`${styles.highlightPill} ${styles.highlightPillLoss}`}>
                      Needs work
                    </span>
                    <OpeningNameSplit name={weakestOpening.name} className={styles.highlightName} />
                    {weakestOpeningMoves && (
                      <span className={styles.highlightMoves}>{weakestOpeningMoves}</span>
                    )}
                    <span className={styles.highlightMeta}>
                      {getLossRate(weakestOpening)}% loss rate &middot; {weakestOpening.games} games
                    </span>
                  </Link>
                )}

                {/* Side switcher (mobile) — full-width segmented pill */}
                <SegmentedToggle
                  options={SIDE_OPTIONS}
                  value={activeTab}
                  onChange={(v) => {
                    setActiveTab(v);
                    setShowAllMobile(false);
                  }}
                  ariaLabel="View openings by side"
                />

                {/* Section title + grouping / sort filters */}
                <div className={styles.mobileSectionHead}>
                  <h3 className={styles.mobileSectionTitle}>
                    Performance as {activeTab === 'white' ? 'White' : 'Black'}
                  </h3>
                  <div className={styles.mobileFilters}>
                    <GroupToggle
                      grouped={activeGroupBy === 'family'}
                      onChange={(g) => setActiveGroupBy(g ? 'family' : 'variation')}
                      sideLabel={activeTab === 'white' ? 'White' : 'Black'}
                    />
                    <SortMenu
                      value={activeSortMode}
                      onChange={setActiveSortMode}
                      ariaLabel={`Sort ${activeTab} openings`}
                    />
                  </div>
                </div>

                {/* Opening cards */}
                {activeGroupBy === 'family' ? (
                  (() => {
                    const fam = activeTab === 'white' ? whiteFamily : blackFamily;
                    if (fam.rows.length === 0 && !fam.uncategorised) {
                      return <div className={styles.emptyList}>No classified openings.</div>;
                    }
                    return (
                      <>
                        <div className={styles.mobileOpeningList}>
                          {fam.rows.map((row, i) => {
                            const key = `${activeTab}:${row.family_id}`;
                            return (
                              <FamilyRow
                                key={key}
                                colour={activeTab}
                                row={row}
                                rowIndex={i}
                                isExpanded={expanded.has(key)}
                                onToggle={() => toggleExpanded(key)}
                                openingLink={(variationKey) =>
                                  `/opening/${encodeURIComponent(variationKey)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`
                                }
                              />
                            );
                          })}
                        </div>
                        <UncategorisedFootnote summary={fam.uncategorised} />
                      </>
                    );
                  })()
                ) : activeData.openings.length === 0 ? (
                  <div className={styles.emptyList}>No classified openings.</div>
                ) : (
                  <div className={styles.mobileOpeningList}>
                    {(showAllMobile ? activeData.openings : activeData.openings.slice(0, 5)).map(
                      (o, i) => {
                        const wP = o.games > 0 ? Math.round((o.win / o.games) * 100) : 0;
                        const dP = o.games > 0 ? Math.round((o.draw / o.games) * 100) : 0;
                        const lP = o.games > 0 ? Math.round((o.loss / o.games) * 100) : 0;
                        return (
                          <Link
                            key={o.fen}
                            className={styles.mobileCard}
                            to={openingLink(o)}
                            style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                          >
                            <div className={styles.mobileCardHead}>
                              <div className={styles.mobileCardNameCol}>
                                <OpeningNameSplit name={o.name} className={styles.mobileCardName} />
                                {getOpeningMovesDisplay(o.moves) && (
                                  <span className={styles.mobileCardMoves}>
                                    {getOpeningMovesDisplay(o.moves)}
                                  </span>
                                )}
                              </div>
                              <span className={styles.mobileCardGames}>Games {o.games}</span>
                            </div>
                            <div className={styles.mobileCardBar}>
                              {wP > 0 && (
                                <div className={styles.mobileBarWin} style={{ width: `${wP}%` }} />
                              )}
                              {dP > 0 && (
                                <div className={styles.mobileBarDraw} style={{ width: `${dP}%` }} />
                              )}
                              {lP > 0 && (
                                <div className={styles.mobileBarLoss} style={{ width: `${lP}%` }} />
                              )}
                            </div>
                            <div className={styles.mobileCardPcts}>
                              <span className={styles.mobileCardPctWin}>{wP}% win</span>
                              <span className={styles.mobileCardPctDraw}>{dP}% draw</span>
                              <span className={styles.mobileCardPctLoss}>{lP}% loss</span>
                            </div>
                          </Link>
                        );
                      }
                    )}
                    {!showAllMobile && activeData.openings.length > 5 && (
                      <button
                        type="button"
                        className={styles.showMoreBtn}
                        onClick={() => setShowAllMobile(true)}
                      >
                        Show all {activeData.openings.length} openings
                      </button>
                    )}
                  </div>
                )}

                {/* Bottom CTA */}
                <button
                  type="button"
                  className={styles.bottomCta}
                  onClick={() => setShowSearchOverlay(true)}
                >
                  Analyse another player
                </button>
              </div>

              {/* ===== DESKTOP DASHBOARD (unchanged) ===== */}
              <div className={styles.desktopDashboard}>
                {/* Dashboard hero */}
                <div className={styles.dashboardHero}>
                  <div className={styles.dashboardHeroContent}>
                    <h2 className={styles.dashboardPlayerName}>{displayedUsername}</h2>
                    <div className={styles.playerMeta}>
                      <span className={styles.platformBadge}>{displayedPlatformLabel}</span>
                      <span className={styles.gamesAnalysed}>
                        {dashboard.totalGames} games analysed &middot; {dashboard.classifiedGames}{' '}
                        matched
                        {dashboard.unclassifiedGames > 0
                          ? ` · ${dashboard.unclassifiedGames} unrecognised`
                          : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.analyseAnotherBtn}
                    onClick={() => setShowSearchOverlay(true)}
                  >
                    Analyse another player <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>

                {/* Summary cards */}
                <div className={`${styles.cardsGrid} ${!showWeakest ? styles.cardsGridTwo : ''}`}>
                  <div className={styles.card}>
                    <div className={`${styles.cardLabel} ${styles.cardLabelAccent}`}>
                      Overall performance
                    </div>
                    <h3 className={styles.cardTitle}>Career Totals</h3>
                    <div className={styles.statsRows}>
                      <div className={styles.statsRow}>
                        <span className={`${styles.statsLabel} ${styles.statsLabelWin}`}>
                          Total wins
                        </span>
                        <span className={styles.statsValue}>{totalWins.toLocaleString()}</span>
                      </div>
                      <div className={styles.statsRow}>
                        <span className={styles.statsLabel}>Total draws</span>
                        <span className={styles.statsValue}>{totalDraws.toLocaleString()}</span>
                      </div>
                      <div className={styles.statsRow}>
                        <span className={`${styles.statsLabel} ${styles.statsLabelLoss}`}>
                          Total losses
                        </span>
                        <span className={styles.statsValue}>{totalLosses.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {bestOpening && (
                    <Link
                      className={`${styles.card} ${styles.cardClickable}`}
                      to={openingLink(bestOpening)}
                    >
                      <div className={`${styles.cardLabel} ${styles.cardLabelWin}`}>
                        Top-performing opening
                      </div>
                      <OpeningNameSplit
                        name={bestOpening.name}
                        className={styles.cardOpeningName}
                      />
                      {bestOpeningMoves && (
                        <div className={styles.cardMoves}>{bestOpeningMoves}</div>
                      )}
                      <div className={styles.cardContext}>{bestOpening.games} games</div>
                      <div className={styles.winRateRow}>
                        <span className={`${styles.winRateValue} ${styles.winRateValueWin}`}>
                          {getWinRate(bestOpening)}%
                        </span>
                        <span className={styles.winRateLabel}>win rate</span>
                      </div>
                      <div className={`${styles.winRateBar} ${styles.winRateBarWin}`}>
                        <div
                          className={styles.winRateBarFillWin}
                          style={{ width: `${getWinRate(bestOpening)}%` }}
                        />
                      </div>
                    </Link>
                  )}

                  {showWeakest && weakestOpening && (
                    <Link
                      className={`${styles.card} ${styles.cardClickable}`}
                      to={openingLink(weakestOpening)}
                    >
                      <div className={`${styles.cardLabel} ${styles.cardLabelLoss}`}>
                        Needs work
                      </div>
                      <OpeningNameSplit
                        name={weakestOpening.name}
                        className={styles.cardOpeningName}
                      />
                      {weakestOpeningMoves && (
                        <div className={styles.cardMoves}>{weakestOpeningMoves}</div>
                      )}
                      <div className={styles.cardContext}>{weakestOpening.games} games</div>
                      <div className={styles.winRateRow}>
                        <span className={`${styles.winRateValue} ${styles.winRateValueLoss}`}>
                          {getLossRate(weakestOpening)}%
                        </span>
                        <span className={styles.winRateLabel}>loss rate</span>
                      </div>
                      <div className={`${styles.winRateBar} ${styles.winRateBarLoss}`}>
                        <div
                          className={styles.winRateBarFillLoss}
                          style={{ width: `${getLossRate(weakestOpening)}%` }}
                        />
                      </div>
                    </Link>
                  )}
                </div>

                {/* Desktop: side-by-side opening lists */}
                <div className={styles.openingSections}>
                  <div className={styles.openingSection}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>
                        Performance as White
                        <span className={styles.sectionBadge}>{dashboard.whiteGames} games</span>
                      </h3>
                    </div>
                    <div className={styles.filterRow}>
                      <GroupToggle
                        grouped={whiteGroupBy === 'family'}
                        onChange={(g) => setWhiteGroupBy(g ? 'family' : 'variation')}
                        sideLabel="White"
                      />
                      <SortMenu
                        value={whiteSortMode}
                        onChange={setWhiteSortMode}
                        ariaLabel="Sort white openings"
                      />
                    </div>
                    <div className={styles.colHeaders}>
                      <span className={styles.colHeaderName}>Opening name</span>
                      <div className={styles.colHeaderRight}>
                        <span className={styles.colHeaderGp}>GP</span>
                        <span className={styles.colHeaderDist}>W / D / L distribution</span>
                      </div>
                    </div>
                    {whiteGroupBy === 'family' ? (
                      whiteFamily.rows.length === 0 && !whiteFamily.uncategorised ? (
                        <div className={styles.emptyList}>No classified openings.</div>
                      ) : (
                        <>
                          <div className={styles.openingList}>
                            {whiteFamily.rows.map((row, i) => {
                              const key = `white:${row.family_id}`;
                              return (
                                <FamilyRow
                                  key={key}
                                  colour="white"
                                  row={row}
                                  rowIndex={i}
                                  isExpanded={expanded.has(key)}
                                  onToggle={() => toggleExpanded(key)}
                                  openingLink={(variationKey) =>
                                    `/opening/${encodeURIComponent(variationKey)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`
                                  }
                                />
                              );
                            })}
                          </div>
                          <UncategorisedFootnote summary={whiteFamily.uncategorised} />
                        </>
                      )
                    ) : sortedWhite.length === 0 ? (
                      <div className={styles.emptyList}>No classified openings.</div>
                    ) : (
                      <div className={styles.openingList}>
                        {sortedWhite.map((o, i) => (
                          <OpeningRow
                            key={o.fen}
                            opening={o}
                            platform={displayedPlatform}
                            username={displayedUsername}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.openingSection}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>
                        Performance as Black
                        <span className={styles.sectionBadge}>{dashboard.blackGames} games</span>
                      </h3>
                    </div>
                    <div className={styles.filterRow}>
                      <GroupToggle
                        grouped={blackGroupBy === 'family'}
                        onChange={(g) => setBlackGroupBy(g ? 'family' : 'variation')}
                        sideLabel="Black"
                      />
                      <SortMenu
                        value={blackSortMode}
                        onChange={setBlackSortMode}
                        ariaLabel="Sort black openings"
                      />
                    </div>
                    <div className={styles.colHeaders}>
                      <span className={styles.colHeaderName}>Opening name</span>
                      <div className={styles.colHeaderRight}>
                        <span className={styles.colHeaderGp}>GP</span>
                        <span className={styles.colHeaderDist}>W / D / L distribution</span>
                      </div>
                    </div>
                    {blackGroupBy === 'family' ? (
                      blackFamily.rows.length === 0 && !blackFamily.uncategorised ? (
                        <div className={styles.emptyList}>No classified openings.</div>
                      ) : (
                        <>
                          <div className={styles.openingList}>
                            {blackFamily.rows.map((row, i) => {
                              const key = `black:${row.family_id}`;
                              return (
                                <FamilyRow
                                  key={key}
                                  colour="black"
                                  row={row}
                                  rowIndex={i}
                                  isExpanded={expanded.has(key)}
                                  onToggle={() => toggleExpanded(key)}
                                  openingLink={(variationKey) =>
                                    `/opening/${encodeURIComponent(variationKey)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`
                                  }
                                />
                              );
                            })}
                          </div>
                          <UncategorisedFootnote summary={blackFamily.uncategorised} />
                        </>
                      )
                    ) : sortedBlack.length === 0 ? (
                      <div className={styles.emptyList}>No classified openings.</div>
                    ) : (
                      <div className={styles.openingList}>
                        {sortedBlack.map((o, i) => (
                          <OpeningRow
                            key={o.fen}
                            opening={o}
                            platform={displayedPlatform}
                            username={displayedUsername}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ height: 'var(--space-8)' }} />
            </>
          );
        })()}
    </div>
  );
};

export default PersonalOpeningStats;
