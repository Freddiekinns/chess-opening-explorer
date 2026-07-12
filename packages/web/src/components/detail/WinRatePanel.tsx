import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import WinRateBar from './WinRateBar';
import styles from './WinRatePanel.module.css';
import {
  ExplorerError,
  fetchExplorer,
  getBand,
  rankNotableGames,
  type BandId,
  type ExplorerResult,
} from '../../lib/lichessExplorer';
import { computeLevelCheck, type LevelCheck } from '../../lib/levelCheck';
import { trackEvent } from '../../lib/analytics';

/**
 * Win rates panel (deviation-trainer PRD §5, reworked per the 2026-07-11
 * sidebar-unification decision record): pure evidence, no move list. Shows
 * the W/D/L stats for the level selected in the page-level lens (falling
 * back to the master-games snapshot), the zero-interaction "level check"
 * comparison, notable master games (three, expandable), and a closing link
 * to the analyse funnel. Explorer requests fire only once the panel is in
 * view. Passive failures (level check) are silent — the page must never be
 * worse than today's — but a failure after an explicit band selection shows
 * a short unavailable note above the snapshot.
 */

const MIN_LIVE_SAMPLE = 100;
const DEFAULT_COMPARISON_BAND: BandId = '1400';
const NOTABLE_COLLAPSED = 3;

interface PopularityStats {
  games_analyzed?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
  avg_rating?: number;
  analysis_date?: string;
}

interface WinRatePanelProps {
  popularityStats: PopularityStats | null;
  fen: string;
  /** Active level from the page lens; null = master snapshot. */
  band: BandId | null;
}

function reportExplorerError(err: unknown): void {
  if (err instanceof ExplorerError && err.status !== undefined) {
    trackEvent('explorer_error', { status: err.status });
  } else {
    trackEvent('explorer_error');
  }
}

function levelCheckCopy(check: LevelCheck): string {
  const { label, range } = getBand(check.bandId);
  const level = `${label.toLowerCase()} level (Lichess ${range ?? ''})`;
  if (check.direction === 'band-better') {
    return (
      `Level check: at ${level} ${check.side} scores ` +
      `${check.bandPct}% here — at master level only ${check.mastersPct}%. ` +
      `This line works better in club play.`
    );
  }
  return (
    `Level check: masters score ${check.mastersPct}% with ${check.side} here — ` +
    `at ${level} only ${check.bandPct}%. It needs precision.`
  );
}

function resultText(winner: 'white' | 'black' | null): string {
  if (winner === 'white') return '1–0';
  if (winner === 'black') return '0–1';
  return '½–½';
}

export const WinRatePanel: React.FC<WinRatePanelProps> = ({ popularityStats, fen, band }) => {
  const [live, setLive] = useState<ExplorerResult | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);
  const [masters, setMasters] = useState<ExplorerResult | null>(null);
  const [levelCheck, setLevelCheck] = useState<LevelCheck | null>(null);
  const [notableExpanded, setNotableExpanded] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const levelCheckTracked = useRef(false);

  const hasSnapshot = (popularityStats?.games_analyzed || 0) > 0;

  // Lazy trigger: no explorer request before the stats section is in view.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // New position: drop everything derived from the previous FEN.
  useEffect(() => {
    setLive(null);
    setLiveFailed(false);
    setMasters(null);
    setLevelCheck(null);
    setNotableExpanded(false);
    levelCheckTracked.current = false;
  }, [fen]);

  // Level check: masters vs the comparison band, sequential and cached.
  useEffect(() => {
    if (!inView || !fen) return;
    let alive = true;
    const comparison: BandId = band && band !== 'masters' ? band : DEFAULT_COMPARISON_BAND;

    (async () => {
      try {
        const mastersResult = await fetchExplorer(fen, 'masters');
        if (!alive) return;
        setMasters(mastersResult);
        const bandResult = await fetchExplorer(fen, comparison);
        if (!alive) return;
        setLevelCheck(computeLevelCheck(mastersResult, bandResult, comparison, fen));
      } catch (err) {
        if (alive) reportExplorerError(err);
      }
    })();

    return () => {
      alive = false;
    };
  }, [inView, fen, band]);

  useEffect(() => {
    if (levelCheck && !levelCheckTracked.current) {
      levelCheckTracked.current = true;
      trackEvent('level_check_view');
    }
  }, [levelCheck]);

  // Live band data for the selected band.
  useEffect(() => {
    if (!band || !inView || !fen) return;
    let alive = true;
    setLiveLoading(true);
    setLiveFailed(false);

    (async () => {
      try {
        const result = await fetchExplorer(fen, band);
        if (!alive) return;
        setLive(result);
        if (band === 'masters') setMasters(result);
      } catch (err) {
        if (!alive) return;
        setLiveFailed(true);
        reportExplorerError(err);
      } finally {
        if (alive) setLiveLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [band, inView, fen]);

  if (!fen && !hasSnapshot) return null;

  const snapshotMeta = popularityStats?.analysis_date
    ? `Master games · updated ${popularityStats.analysis_date}`
    : 'Master games';
  const liveMeta = band
    ? band === 'masters'
      ? 'Master games · live'
      : `Lichess games, ${getBand(band).range} · live`
    : '';

  const showLive = Boolean(band) && !liveFailed;
  const liveStats =
    live && live.totalGames > 0
      ? {
          games_analyzed: live.totalGames,
          white_win_rate: live.white / live.totalGames,
          draw_rate: live.draws / live.totalGames,
          black_win_rate: live.black / live.totalGames,
        }
      : null;

  const notableGames = masters ? rankNotableGames(masters.topGames) : [];
  const visibleNotable = notableExpanded ? notableGames : notableGames.slice(0, NOTABLE_COLLAPSED);
  const hiddenNotable = notableGames.length - NOTABLE_COLLAPSED;

  return (
    <div ref={containerRef} className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>Win rates</div>
        <div className={styles.panelSub}>How games end from this position</div>
      </div>

      {levelCheck && (
        <div className={styles.levelCheck} role="note">
          {levelCheckCopy(levelCheck)}
        </div>
      )}

      {showLive ? (
        liveLoading ? (
          <div className={styles.livePlaceholder}>Loading Lichess data…</div>
        ) : live && live.totalGames >= MIN_LIVE_SAMPLE && liveStats ? (
          <WinRateBar popularityStats={liveStats} meta={liveMeta} variant="bare" />
        ) : live ? (
          <div className={styles.livePlaceholder}>
            Not enough games at this level to show reliable numbers.
          </div>
        ) : (
          <WinRateBar popularityStats={popularityStats} meta={snapshotMeta} variant="bare" />
        )
      ) : (
        <>
          {band && liveFailed && (
            <div className={styles.liveUnavailable} role="status">
              Live Lichess data isn't available right now — showing the master games snapshot.
            </div>
          )}
          <WinRateBar popularityStats={popularityStats} meta={snapshotMeta} variant="bare" />
        </>
      )}

      {notableGames.length > 0 && (
        <div className={styles.notable}>
          <div className={styles.notableTitle}>Notable games</div>
          <ul className={styles.notableList}>
            {visibleNotable.map((game) => (
              <li key={game.id}>
                <a
                  href={`https://lichess.org/${game.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.notableLink}
                >
                  <span className={styles.notablePlayers}>
                    {game.white.name} ({game.white.rating}) – {game.black.name} ({game.black.rating}
                    )
                  </span>
                  <span className={styles.notableResult}>
                    {resultText(game.winner)}
                    {game.year ? ` · ${game.year}` : ''}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {hiddenNotable > 0 && (
            <button
              type="button"
              className={styles.showMoreBtn}
              onClick={() => setNotableExpanded(!notableExpanded)}
            >
              {notableExpanded ? 'Show fewer' : `Show ${hiddenNotable} more`}
            </button>
          )}
        </div>
      )}

      <Link to="/analyse" className={styles.analyseLink} onClick={() => trackEvent('bridge_click')}>
        These are everyone's results — analyse your own games in this opening
      </Link>
    </div>
  );
};

export default WinRatePanel;
