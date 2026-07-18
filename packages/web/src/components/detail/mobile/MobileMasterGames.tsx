import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  fetchExplorer,
  rankNotableGames,
  type ExplorerTopGame,
} from '../../../lib/lichessExplorer';
import styles from './MobileMasterGames.module.css';

/**
 * Collapsed master-games card (design 2a): on mobile the notable games move
 * out of the stats surface into their own accordion, collapsed by default.
 * Games always come from the masters DB regardless of the active level —
 * same rule as the desktop WinRatePanel. The fetch is lazy (card in view)
 * and shares fetchExplorer's cache with the rest of the page, so this adds
 * no extra proxy request when the Masters band has already been viewed.
 */

interface MobileMasterGamesProps {
  fen: string;
}

function resultText(winner: 'white' | 'black' | null): string {
  if (winner === 'white') return '1–0';
  if (winner === 'black') return '0–1';
  return '½–½';
}

export const MobileMasterGames: React.FC<MobileMasterGamesProps> = ({ fen }) => {
  const [games, setGames] = useState<ExplorerTopGame[]>([]);
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    setGames([]);
    setOpen(false);
  }, [fen]);

  useEffect(() => {
    if (!inView || !fen) return;
    let alive = true;
    (async () => {
      try {
        const masters = await fetchExplorer(fen, 'masters');
        if (alive) setGames(rankNotableGames(masters.topGames));
      } catch {
        // No games — the card simply doesn't render.
      }
    })();
    return () => {
      alive = false;
    };
  }, [inView, fen]);

  return (
    <div ref={containerRef} className={styles.card} hidden={games.length === 0}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.title}>
          Master games <span className={styles.count}>({games.length})</span>
        </span>
        <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>
      {open && (
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
      )}
    </div>
  );
};

export default MobileMasterGames;
