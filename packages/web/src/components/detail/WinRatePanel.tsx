import React, { useEffect, useRef, useState } from 'react';
import WinRateBar from './WinRateBar';
import LevelLens from './LevelLens';
import styles from './WinRatePanel.module.css';
import {
  ExplorerError,
  fetchExplorer,
  getBand,
  rankNotableGames,
  type BandId,
  type ExplorerResult,
} from '../../lib/lichessExplorer';
import { trackEvent } from '../../lib/analytics';

/**
 * Stats card (deviation-trainer PRD §5, reworked per the 2026-07-13 right-column
 * redesign): the level pills, headline stats, W/D/L bar and notable master games
 * in one card. The level lens at the top governs this card and the opening book
 * below it. Live band stats replace the master-games snapshot when a band is
 * selected; a failed band fetch degrades to the snapshot with a short note.
 * Explorer requests fire only once the card is in view.
 */

const MIN_LIVE_SAMPLE = 100;
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
  /** Level lens selection handler — owns "my level" persistence in LevelLens. */
  onBandChange: (band: BandId | null) => void;
}

function reportExplorerError(err: unknown): void {
  if (err instanceof ExplorerError && err.status !== undefined) {
    trackEvent('explorer_error', { status: err.status });
  } else {
    trackEvent('explorer_error');
  }
}

function resultText(winner: 'white' | 'black' | null): string {
  if (winner === 'white') return '1–0';
  if (winner === 'black') return '0–1';
  return '½–½';
}

export const WinRatePanel: React.FC<WinRatePanelProps> = ({
  popularityStats,
  fen,
  band,
  onBandChange,
}) => {
  const [live, setLive] = useState<ExplorerResult | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);
  const [masters, setMasters] = useState<ExplorerResult | null>(null);
  const [notableExpanded, setNotableExpanded] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasSnapshot = (popularityStats?.games_analyzed || 0) > 0;

  // Lazy trigger: no explorer request before the stats card is in view.
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
    setNotableExpanded(false);
  }, [fen]);

  // Master games always come from the masters DB, regardless of the active band.
  useEffect(() => {
    if (!inView || !fen) return;
    let alive = true;
    (async () => {
      try {
        const mastersResult = await fetchExplorer(fen, 'masters');
        if (alive) setMasters(mastersResult);
      } catch (err) {
        if (alive) reportExplorerError(err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [inView, fen]);

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
          avg_rating: live.averageRating ?? undefined,
        }
      : null;

  const notableGames = masters ? rankNotableGames(masters.topGames) : [];
  const visibleNotable = notableExpanded ? notableGames : notableGames.slice(0, NOTABLE_COLLAPSED);
  const hiddenNotable = notableGames.length - NOTABLE_COLLAPSED;

  return (
    <div ref={containerRef} className={styles.panel}>
      <LevelLens band={band} onChange={onBandChange} />

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
          <div className={styles.notableTitle}>Master games</div>
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
                    {game.white.name} – {game.black.name}
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
    </div>
  );
};

export default WinRatePanel;
