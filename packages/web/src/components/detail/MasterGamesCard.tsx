import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { fetchExplorer, rankNotableGames, type ExplorerTopGame } from '../../lib/lichessExplorer';
import styles from './MasterGamesCard.module.css';

/**
 * Master games (UX review phase 4, change 12). The one list on the page the
 * level filter does NOT apply to, so it lives outside the ExplorerCard's
 * border — a card in the desktop rail, a collapsed accordion at the foot of
 * the mobile stack. One component for both, because a shared border rule is
 * only true if both breakpoints render the same thing.
 *
 * Source line says "Over-the-board masters", not a rating floor: the proxy
 * applies no rating filter to the masters band, so any number would be
 * invented. The reveal names its payload rather than claiming a total — the
 * explorer returns at most 15 top games and rankNotableGames dedupes by
 * player, so we never hold "all" the master games for a position.
 *
 * The fetch is gated on the card being in view: masters is a separate band
 * from the page's, and the proxy token is capped at 25 requests/minute. That
 * gate also means this card will not appear in an automated browser pane —
 * verify it in the unit tests, not there.
 */

const COLLAPSED_LIMIT = 3;
const RANKED_CAP = 8;

interface MasterGamesCardProps {
  fen: string;
  /** 'card' = desktop rail; 'accordion' = mobile stack, collapsed by default. */
  variant?: 'card' | 'accordion';
}

function resultText(winner: 'white' | 'black' | null): string {
  if (winner === 'white') return '1–0';
  if (winner === 'black') return '0–1';
  return '½–½';
}

const GameList: React.FC<{ games: ExplorerTopGame[] }> = ({ games }) => (
  <ul className={styles.list}>
    {games.map((game) => (
      <li key={game.id}>
        <a
          href={`https://lichess.org/${game.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.game}
        >
          <span className={styles.players}>
            {game.white.name} – {game.black.name}
          </span>
          <span className={styles.result}>
            {resultText(game.winner)}
            {game.year ? ` · ${game.year}` : ''}
          </span>
        </a>
      </li>
    ))}
  </ul>
);

export const MasterGamesCard: React.FC<MasterGamesCardProps> = ({ fen, variant = 'card' }) => {
  const [games, setGames] = useState<ExplorerTopGame[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // A new position must never show the previous position's games.
  useEffect(() => {
    setGames([]);
    setExpanded(false);
  }, [fen]);

  useEffect(() => {
    if (!inView || !fen) return;
    let alive = true;
    (async () => {
      try {
        const masters = await fetchExplorer(fen, 'masters');
        if (alive) setGames(rankNotableGames(masters.topGames, RANKED_CAP));
      } catch {
        // Sparse positions and failed fetches look the same here: no card.
        // Band failures are already beaconed by useExplorerQuery.
      }
    })();
    return () => {
      alive = false;
    };
  }, [inView, fen]);

  // The probe div keeps the observer alive on a position with no games, so
  // scrolling to a later opening still triggers the fetch.
  if (games.length === 0) return <div ref={containerRef} aria-hidden="true" />;

  if (variant === 'accordion') {
    return (
      <div ref={containerRef} className={styles.card}>
        <button
          type="button"
          className={styles.accordionHeader}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <span className={styles.headerText}>
            <span className={styles.title}>
              Master games <span className={styles.count}>({games.length})</span>
            </span>
            <span className={styles.source}>Over-the-board masters</span>
          </span>
          <ChevronDown
            size={16}
            className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
          />
        </button>
        {expanded && <GameList games={games} />}
      </div>
    );
  }

  const visible = expanded ? games : games.slice(0, COLLAPSED_LIMIT);
  const hidden = games.length - COLLAPSED_LIMIT;

  return (
    <div ref={containerRef} className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Master games</h2>
        <span className={styles.sourceEyebrow}>Over-the-board masters</span>
      </div>
      <GameList games={visible} />
      {hidden > 0 && (
        <button type="button" className={styles.showMoreBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer' : `Show ${hidden} more games`}
        </button>
      )}
    </div>
  );
};

export default MasterGamesCard;
