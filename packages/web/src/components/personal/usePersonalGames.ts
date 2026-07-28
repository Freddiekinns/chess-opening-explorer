import { useEffect, useMemo, useRef, useState } from 'react';
import type { OpeningForLookup } from '../../../../shared/src';
import { trackEvent } from '../../lib/analytics';
import { loadSampleReport, type SampleId, type SampleReport } from './sampleReports';
import {
  clampInt,
  normalizeUsername,
  readSavedFormState,
  FORM_STATE_KEY,
  LAST_ANALYSIS_SNAPSHOT_KEY,
  type DashboardData,
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
  // Non-null only while a committed sample report is on screen, so the page can
  // say whose games these are and how old they are.
  const [sample, setSample] = useState<SampleReport | null>(null);

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
      setSample(null);
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
    trackEvent('analyse_run');
    // A real analysis replaces any sample on screen.
    setSample(null);

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
      const [response, openingsData, { buildOpeningsMap, analyseGames }] = await Promise.all([
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

      const data = await analyseGames(gamesPgn, u, openingsMap, {
        onProgress: (done, count) => {
          setProcessed(done);
          setStepText(`Analysing your games... (${done}/${count})`);
          setProgress(15 + Math.round((done / Math.max(1, count)) * 85));
        },
        shouldAbort: () => controller.signal.aborted,
      });

      // Aborted mid-run: handleCancel already reset the step, so leave it be.
      if (!data) return;

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

  /**
   * Loads a committed sample report. Deliberately does not call `saveToCache`
   * and does not touch LAST_ANALYSIS_SNAPSHOT_KEY: a sample must not come back
   * on the next visit presented as the visitor's own saved result.
   */
  const loadSample = async (id: SampleId) => {
    abortRef.current?.abort();
    setError(null);
    setStep('fetching');
    setStepText('Loading the sample report...');
    setProgress(30);

    try {
      const report = await loadSampleReport(id);
      setSample(report);
      setDashboard(report.dashboard);
      setDisplayedUsername(report.username);
      setDisplayedPlatform(report.platform);
      setStep('done');
      setStepText('Sample report');
      setProgress(100);
      setProcessed(report.dashboard.totalGames);
      setTotal(report.dashboard.totalGames);
    } catch {
      setError("We couldn't load the sample report. Please try again.");
      setStep('error');
      setStepText('');
      setProgress(0);
    }
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
    // sample reports
    sample,
    loadSample,
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
