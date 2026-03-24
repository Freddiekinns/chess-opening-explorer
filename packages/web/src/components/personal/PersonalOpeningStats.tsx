import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildOpeningsMap, lookupOpeningFromPGN, OpeningForLookup } from '../../../../shared/src';
import styles from './PersonalOpeningStats.module.css';

type Platform = 'lichess' | 'chess.com';

type Side = 'white' | 'black';

type Result = 'win' | 'draw' | 'loss';

type OpeningAgg = {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  games: number;
  win: number;
  draw: number;
  loss: number;
};

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

type SortMode = 'frequency' | 'best' | 'worst';

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
  opening: { fen: string; name: string; eco: string; moves?: string },
  result: Result
) {
  const existing = map.get(opening.fen) || {
    fen: opening.fen,
    name: opening.name,
    eco: opening.eco,
    moves: opening.moves || '',
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

function findBestOpening(list: OpeningAgg[]): OpeningAgg | null {
  if (list.length === 0) return null;
  const qualified = list.filter((o) => o.games >= 2);
  if (qualified.length === 0) return list[0];
  return qualified.reduce((best, curr) => (getWinRate(curr) > getWinRate(best) ? curr : best));
}

function findWeakestOpening(list: OpeningAgg[]): OpeningAgg | null {
  if (list.length === 0) return null;
  const qualified = list.filter((o) => o.games >= 2);
  if (qualified.length === 0) return null;
  return qualified.reduce((worst, curr) => (getWinRate(curr) < getWinRate(worst) ? curr : worst));
}

function getLossRate(o: OpeningAgg): number {
  if (o.games === 0) return 0;
  return Math.round((o.loss / o.games) * 100);
}

type SideTab = 'white' | 'black';

const FORM_STATE_KEY = 'personal-openings:form-state';

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

const sortLabels: Record<SortMode, string> = {
  frequency: 'Most played',
  best: 'Highest win rate',
  worst: 'Lowest win rate',
};

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
   OPENING ROW COMPONENT
   ============================== */
/* ==============================
   DISTRIBUTION BAR COMPONENT
   ============================== */
const DistributionBar: React.FC<{
  win: number;
  draw: number;
  loss: number;
  games: number;
}> = ({ win, draw, loss, games }) => {
  if (games === 0) return null;
  const wPct = (win / games) * 100;
  const dPct = (draw / games) * 100;
  const lPct = (loss / games) * 100;

  return (
    <div className={styles.distBar}>
      <div className={styles.distSegments}>
        {wPct > 0 && (
          <div className={`${styles.distSegment} ${styles.distWin}`} style={{ width: `${wPct}%` }}>
            {wPct >= 15 && <span className={styles.distCount}>{win}</span>}
          </div>
        )}
        {dPct > 0 && (
          <div className={`${styles.distSegment} ${styles.distDraw}`} style={{ width: `${dPct}%` }}>
            {dPct >= 15 && <span className={styles.distCount}>{draw}</span>}
          </div>
        )}
        {lPct > 0 && (
          <div className={`${styles.distSegment} ${styles.distLoss}`} style={{ width: `${lPct}%` }}>
            {lPct >= 15 && <span className={styles.distCount}>{loss}</span>}
          </div>
        )}
      </div>
      <div className={styles.distPcts}>
        <span className={styles.distPctWin}>{Math.round(wPct)}%</span>
        <span className={styles.distPctDraw}>{Math.round(dPct)}%</span>
        <span className={styles.distPctLoss}>{Math.round(lPct)}%</span>
      </div>
    </div>
  );
};

const OpeningRow: React.FC<{
  opening: OpeningAgg;
  platform: Platform;
  username: string;
  index: number;
}> = ({ opening, platform, username, index }) => {
  const delay = Math.min(index * 30, 300);

  return (
    <Link
      className={styles.openingRow}
      to={`/opening/${encodeURIComponent(opening.fen)}?ref=personal&platform=${platform}&username=${encodeURIComponent(normalizeUsername(username))}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.openingRowLeft}>
        <span className={styles.openingName}>{opening.name}</span>
        {opening.moves && <span className={styles.openingMoves}>{opening.moves}</span>}
      </div>
      <div className={styles.openingRowRight}>
        <span className={styles.gamesCount}>{opening.games}</span>
        <DistributionBar
          win={opening.win}
          draw={opening.draw}
          loss={opening.loss}
          games={opening.games}
        />
      </div>
    </Link>
  );
};

/* ==============================
   SORT BAR COMPONENT
   ============================== */
const SortBar: React.FC<{
  sortMode: SortMode;
  onSort: (mode: SortMode) => void;
}> = ({ sortMode, onSort }) => (
  <div className={styles.sortPills}>
    {(['frequency', 'best', 'worst'] as SortMode[]).map((mode) => (
      <button
        key={mode}
        type="button"
        className={`${styles.sortPill} ${sortMode === mode ? styles.sortPillActive : ''}`}
        onClick={() => onSort(mode)}
      >
        {sortLabels[mode]}
      </button>
    ))}
  </div>
);

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

  // Displayed state: only updates when analysis completes (not while typing)
  const [displayedUsername, setDisplayedUsername] = useState('');
  const [displayedPlatform, setDisplayedPlatform] = useState<Platform>('chess.com');

  const abortRef = useRef<AbortController | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const openingsMap = useMemo(() => buildOpeningsMap(openingsData), [openingsData]);

  const canAnalyse = normalizeUsername(username).length > 0 && openingsMap.size > 0;

  const cacheKey = useMemo(() => {
    const u = normalizeUsername(username).toLowerCase();
    return `personal-openings:v2:${platform}:${u}:limit=${limit}:rated=true:perf=rapid,blitz,classical`;
  }, [platform, username, limit]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
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
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    const saved = readSavedFormState();
    if (!saved) return;
    const cached = loadFromCache();
    if (cached) {
      setDashboard(cached);
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
        const matchedMoves = openingsMap.get(lookup.bestMatch.fen)?.moves || '';
        const openingWithMoves = { ...lookup.bestMatch, moves: matchedMoves };
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
        asWhite: sortAgg(Array.from(asWhite.values())).slice(0, 10),
        asBlack: sortAgg(Array.from(asBlack.values())).slice(0, 10),
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

          const activeSortMode = activeTab === 'white' ? whiteSortMode : blackSortMode;
          const setActiveSortMode = activeTab === 'white' ? setWhiteSortMode : setBlackSortMode;
          const activeData =
            activeTab === 'white'
              ? { openings: sortedWhite, games: dashboard.whiteGames }
              : { openings: sortedBlack, games: dashboard.blackGames };

          const displayedPlatformLabel = displayedPlatform === 'lichess' ? 'Lichess' : 'Chess.com';

          const openingLink = (o: OpeningAgg) =>
            `/opening/${encodeURIComponent(o.fen)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`;

          return (
            <>
              {/* Dashboard hero */}
              <div className={styles.dashboardHero}>
                <div className={styles.dashboardHeroContent}>
                  <h2 className={styles.dashboardPlayerName}>{displayedUsername}</h2>
                  <div className={styles.playerMeta}>
                    <span className={styles.platformBadge}>{displayedPlatformLabel}</span>
                    <span className={styles.gamesAnalysed}>
                      {dashboard.totalGames} games analysed ({dashboard.classifiedGames} matched)
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
                {/* Overall performance */}
                <div className={`${styles.card}`}>
                  <div className={`${styles.cardLabel} ${styles.cardLabelAccent}`}>
                    Overall performance
                  </div>
                  <h3 className={styles.cardTitle}>Career Totals</h3>
                  <div className={styles.statsRows}>
                    <div className={styles.statsRow}>
                      <span className={`${styles.statsLabel} ${styles.statsLabelWin}`}>
                        Total wins
                      </span>
                      <span className={styles.statsValue}>
                        {(dashboard.whiteWin + dashboard.blackWin).toLocaleString()}
                      </span>
                    </div>
                    <div className={styles.statsRow}>
                      <span className={styles.statsLabel}>Total draws</span>
                      <span className={styles.statsValue}>
                        {(dashboard.whiteDraw + dashboard.blackDraw).toLocaleString()}
                      </span>
                    </div>
                    <div className={styles.statsRow}>
                      <span className={`${styles.statsLabel} ${styles.statsLabelLoss}`}>
                        Total losses
                      </span>
                      <span className={styles.statsValue}>
                        {(dashboard.whiteLoss + dashboard.blackLoss).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top-performing opening */}
                {bestOpening && (
                  <Link
                    className={`${styles.card} ${styles.cardClickable}`}
                    to={openingLink(bestOpening)}
                  >
                    <div className={`${styles.cardLabel} ${styles.cardLabelWin}`}>
                      Top-performing opening
                    </div>
                    <div className={styles.cardOpeningName}>{bestOpening.name}</div>
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

                {/* Needs work */}
                {showWeakest && weakestOpening && (
                  <Link
                    className={`${styles.card} ${styles.cardClickable}`}
                    to={openingLink(weakestOpening)}
                  >
                    <div className={`${styles.cardLabel} ${styles.cardLabelLoss}`}>Needs work</div>
                    <div className={styles.cardOpeningName}>{weakestOpening.name}</div>
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

              {/* ===== OPENING LISTS ===== */}

              {/* Mobile: Tab bar */}
              <div className={styles.tabBar} role="tablist" aria-label="View openings by side">
                <button
                  type="button"
                  role="tab"
                  className={`${styles.tabBtn} ${activeTab === 'white' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('white')}
                  aria-selected={activeTab === 'white'}
                >
                  &#9812; White ({dashboard.whiteGames})
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`${styles.tabBtn} ${activeTab === 'black' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('black')}
                  aria-selected={activeTab === 'black'}
                >
                  &#9818; Black ({dashboard.blackGames})
                </button>
              </div>

              {/* Mobile: active tab panel */}
              <div className={styles.openingSectionMobile}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    {activeTab === 'white' ? 'Performance as White' : 'Performance as Black'}
                    <span className={styles.sectionBadge}>{activeData.games} games</span>
                  </h3>
                  <SortBar sortMode={activeSortMode} onSort={setActiveSortMode} />
                </div>
                <div className={styles.colHeaders}>
                  <span className={styles.colHeaderName}>Opening name</span>
                  <div className={styles.colHeaderRight}>
                    <span className={styles.colHeaderGp}>GP</span>
                    <span className={styles.colHeaderDist}>W / D / L distribution</span>
                  </div>
                </div>
                {activeData.openings.length === 0 ? (
                  <div className={styles.emptyList}>No classified openings.</div>
                ) : (
                  <div className={styles.openingList}>
                    {activeData.openings.map((o, i) => (
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

              {/* Desktop: side-by-side */}
              <div className={`${styles.openingSections} ${styles.openingSectionDesktop}`}>
                <div className={styles.openingSection}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                      Performance as White
                      <span className={styles.sectionBadge}>{dashboard.whiteGames} games</span>
                    </h3>
                    <SortBar sortMode={whiteSortMode} onSort={setWhiteSortMode} />
                  </div>
                  <div className={styles.colHeaders}>
                    <span className={styles.colHeaderName}>Opening name</span>
                    <div className={styles.colHeaderRight}>
                      <span className={styles.colHeaderGp}>GP</span>
                      <span className={styles.colHeaderDist}>W / D / L distribution</span>
                    </div>
                  </div>
                  {sortedWhite.length === 0 ? (
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
                    <SortBar sortMode={blackSortMode} onSort={setBlackSortMode} />
                  </div>
                  <div className={styles.colHeaders}>
                    <span className={styles.colHeaderName}>Opening name</span>
                    <div className={styles.colHeaderRight}>
                      <span className={styles.colHeaderGp}>GP</span>
                      <span className={styles.colHeaderDist}>W / D / L distribution</span>
                    </div>
                  </div>
                  {sortedBlack.length === 0 ? (
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

              {/* Spacer at bottom */}
              <div style={{ height: 'var(--space-8)' }} />
            </>
          );
        })()}
    </div>
  );
};

export default PersonalOpeningStats;
