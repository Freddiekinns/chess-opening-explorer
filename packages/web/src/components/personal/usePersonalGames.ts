import { useEffect, useMemo, useRef, useState } from 'react';
import type { OpeningForLookup } from '../../../../shared/src';
import {
  clampInt,
  normalizeUsername,
  parsePgnHeaders,
  getUserSide,
  getUserResult,
  sortAgg,
  upsertAgg,
  readSavedFormState,
  FORM_STATE_KEY,
  LAST_ANALYSIS_SNAPSHOT_KEY,
  type DashboardData,
  type OpeningAgg,
  type Platform,
  type SideTab,
} from './personalStatsLib';

export type AnalysisStep = 'idle' | 'fetching' | 'analysing' | 'done' | 'error';

/**
 * Owns the Analyse-page data lifecycle: form fields, the games fetch +
 * PGN-classification state machine, and the sessionStorage result cache.
 *
 * The openings search-index is loaded lazily via `getOpeningsData` — only when
 * an analysis actually starts — so visitors who bounce off the empty state
 * never pay the ~1.6 MB download, and cached-dashboard restores skip it too.
 */
export function usePersonalGames(
  getOpeningsData: () => Promise<OpeningForLookup[]>,
  prefillUsername?: string
) {
  const [platform, setPlatform] = useState<Platform>(
    () => readSavedFormState()?.platform ?? 'chess.com'
  );
  const [username, setUsername] = useState<string>(
    () => prefillUsername || readSavedFormState()?.username || ''
  );
  const [limit, setLimit] = useState<number>(() => readSavedFormState()?.limit ?? 500);

  const [step, setStep] = useState<AnalysisStep>('idle');
  const [stepText, setStepText] = useState('');
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Displayed state: only updates when analysis completes (not while typing)
  const [displayedUsername, setDisplayedUsername] = useState('');
  const [displayedPlatform, setDisplayedPlatform] = useState<Platform>('chess.com');

  const abortRef = useRef<AbortController | null>(null);

  const canAnalyse = normalizeUsername(username).length > 0;

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

  // Restore a previous analysis on mount (form-derived key first, then the
  // last-analysis snapshot so the player name survives form-field edits).
  useEffect(() => {
    const saved = readSavedFormState();
    if (!saved) return;

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

  const handleAnalyse = async (opts?: { onDone?: () => void; onFreshResult?: () => void }) => {
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
      opts?.onDone?.();
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

      // Games fetch, (first-run) openings-index fetch, and the PGN-lookup
      // module (chess.js lives in its own chunk) all load in parallel — none
      // of them is paid by visitors who never analyse.
      const [response, openingsData, { buildOpeningsMap, lookupOpeningFromPGN }] =
        await Promise.all([
          fetch(url, { signal: controller.signal }),
          getOpeningsData(),
          import('../../../../shared/src'),
        ]);
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(
          json?.message || "We couldn't load your games. Please check the username and try again."
        );
      }

      const openingsMap = buildOpeningsMap(openingsData);

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

      const tickProgress = (i: number) => {
        setProcessed(i + 1);
        setStepText(`Analysing your games... (${i + 1}/${gamesPgn.length})`);
        setProgress(15 + Math.round(((i + 1) / Math.max(1, gamesPgn.length)) * 85));
      };

      for (let i = 0; i < gamesPgn.length; i++) {
        if (controller.signal.aborted) return;
        const pgn = gamesPgn[i];
        const headers = parsePgnHeaders(pgn);
        const side = getUserSide(headers, u);
        if (!side) {
          unclassified += 1;
          tickProgress(i);
          continue;
        }

        const result = getUserResult(headers, side);
        if (!result) {
          unclassified += 1;
          tickProgress(i);
          continue;
        }

        const lookup = lookupOpeningFromPGN(pgn, openingsMap);
        if (!lookup.success || !lookup.bestMatch) {
          unclassified += 1;
          tickProgress(i);
          continue;
        }

        classified += 1;
        // bestMatch carries moves + family_id directly (see pgn-utils
        // OpeningMatch).
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

        tickProgress(i);

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
      opts?.onFreshResult?.();
      setStep('done');
      setStepText('Analysis complete');
      setProgress(100);
      opts?.onDone?.();
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

  return {
    // form fields
    platform,
    setPlatform,
    username,
    setUsername,
    limit,
    setLimitSafe,
    // analysis state
    step,
    stepText,
    progress,
    processed,
    total,
    error,
    dashboard,
    displayedUsername,
    displayedPlatform,
    canAnalyse,
    isBusy,
    handleAnalyse,
    handleCancel,
  };
}

/**
 * Persists the search form (plus the active mobile tab) to sessionStorage so
 * the page restores after navigation.
 */
export function useFormStatePersistence(
  username: string,
  platform: Platform,
  limit: number,
  activeTab: SideTab
) {
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
}
