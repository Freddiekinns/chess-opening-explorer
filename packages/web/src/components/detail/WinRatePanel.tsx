import React, { useEffect, useRef, useState } from 'react';
import WinRateBar from './WinRateBar';
import styles from './WinRatePanel.module.css';
import {
  BANDS,
  ExplorerError,
  fetchExplorer,
  rankNotableGames,
  type BandId,
  type ExplorerResult,
} from '../../lib/lichessExplorer';
import { computeLevelCheck, type LevelCheck } from '../../lib/levelCheck';
import { clearMyLevel, getMyLevel, setMyLevel } from '../../lib/myLevel';
import { trackEvent } from '../../lib/analytics';

/**
 * Level-aware Win Rate panel (deviation-trainer PRD §5).
 *
 * Wraps the snapshot WinRateBar with a rating-band selector backed by the
 * Lichess opening explorer, a zero-interaction "level check" comparison
 * (masters vs club band, rendered only when the gap is significant), and a
 * notable master games list. Explorer requests fire only once the panel is
 * in view; on any failure the panel silently reverts to the snapshot — the
 * page must never be worse than today's.
 */

const MIN_LIVE_SAMPLE = 100;
const DEFAULT_COMPARISON_BAND: BandId = '1400';
const LIVE_CONTINUATIONS = 5;

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
}

function reportExplorerError(err: unknown): void {
  if (err instanceof ExplorerError && err.status !== undefined) {
    trackEvent('explorer_error', { status: err.status });
  } else {
    trackEvent('explorer_error');
  }
}

function bandLabel(bandId: BandId): string {
  return BANDS.find((band) => band.id === bandId)?.label ?? bandId;
}

function levelCheckCopy(check: LevelCheck): string {
  const label = bandLabel(check.bandId);
  if (check.direction === 'band-better') {
    return (
      `Level check: at club level (Lichess ${label}) ${check.side} scores ` +
      `${check.bandPct}% here — at master level only ${check.mastersPct}%. ` +
      `This line works better in club play.`
    );
  }
  return (
    `Level check: masters score ${check.mastersPct}% with ${check.side} here — ` +
    `at club level (Lichess ${label}) only ${check.bandPct}%. It needs precision.`
  );
}

function resultText(winner: 'white' | 'black' | null): string {
  if (winner === 'white') return '1–0';
  if (winner === 'black') return '0–1';
  return '½–½';
}

function formatGames(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export const WinRatePanel: React.FC<WinRatePanelProps> = ({ popularityStats, fen }) => {
  const [band, setBand] = useState<BandId | null>(() => getMyLevel());
  const [live, setLive] = useState<ExplorerResult | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);
  const [masters, setMasters] = useState<ExplorerResult | null>(null);
  const [levelCheck, setLevelCheck] = useState<LevelCheck | null>(null);
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
    levelCheckTracked.current = false;
  }, [fen]);

  // Level check: masters vs the comparison band, sequential and cached.
  useEffect(() => {
    if (!inView || !fen) return;
    let alive = true;
    const saved = getMyLevel();
    const comparison: BandId = saved && saved !== 'masters' ? saved : DEFAULT_COMPARISON_BAND;

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
  }, [inView, fen]);

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

  const selectBand = (id: BandId) => {
    setBand(id);
    setMyLevel(id);
    trackEvent('band_select', { band: id });
  };

  const resetBand = () => {
    setBand(null);
    clearMyLevel();
  };

  const snapshotMeta = popularityStats?.analysis_date
    ? `Master games · updated ${popularityStats.analysis_date}`
    : 'Master games';
  const liveMeta = band
    ? band === 'masters'
      ? 'Master games · live'
      : `Lichess games, ${bandLabel(band)} · live`
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

  return (
    <div ref={containerRef} className={styles.panel}>
      {levelCheck && (
        <div className={styles.levelCheck} role="note">
          {levelCheckCopy(levelCheck)}
        </div>
      )}

      <div className={styles.bandRow}>
        <div className={styles.bandPills} role="group" aria-label="Rating band">
          {BANDS.map((bandDef) => (
            <button
              key={bandDef.id}
              type="button"
              className={`${styles.bandPill} ${band === bandDef.id ? styles.bandPillActive : ''}`}
              aria-pressed={band === bandDef.id}
              onClick={() => selectBand(bandDef.id)}
            >
              {bandDef.label}
            </button>
          ))}
          {band && (
            <button
              type="button"
              className={`${styles.bandPill} ${styles.resetPill}`}
              onClick={resetBand}
              title="Clear my level and show the snapshot"
            >
              Reset
            </button>
          )}
        </div>
        <p className={styles.bandHint}>
          Lichess ratings; chess.com players typically sit 1–2 bands lower than their number
          suggests.
        </p>
      </div>

      {showLive ? (
        liveLoading ? (
          <div className={styles.livePlaceholder}>Loading Lichess data…</div>
        ) : live && live.totalGames >= MIN_LIVE_SAMPLE && liveStats ? (
          <>
            <WinRateBar popularityStats={liveStats} meta={liveMeta} />
            {live.moves.length > 0 && (
              <div className={styles.continuations}>
                {live.moves.slice(0, LIVE_CONTINUATIONS).map((move) => (
                  <div key={move.san} className={styles.continuationRow}>
                    <span className={styles.continuationSan}>{move.san}</span>
                    <span className={styles.continuationGames}>
                      {formatGames(move.games)} games
                    </span>
                    <span className={styles.continuationPcts}>
                      {Math.round(move.whitePct)}% / {Math.round(move.drawPct)}% /{' '}
                      {Math.round(move.blackPct)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : live ? (
          <div className={styles.livePlaceholder}>
            Not enough games at this level to show reliable numbers.
          </div>
        ) : (
          <WinRateBar popularityStats={popularityStats} meta={snapshotMeta} />
        )
      ) : (
        <WinRateBar popularityStats={popularityStats} meta={snapshotMeta} />
      )}

      {notableGames.length > 0 && (
        <div className={styles.notable}>
          <div className={styles.notableTitle}>Notable games</div>
          <ul className={styles.notableList}>
            {notableGames.map((game) => (
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
        </div>
      )}
    </div>
  );
};

export default WinRatePanel;
