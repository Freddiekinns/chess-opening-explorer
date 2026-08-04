import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MiniBoard } from '../components/shared/MiniBoard';
import { StarButton } from '../components/shared/StarButton';
import { Toast } from '../components/shared/Toast';
import { useRepertoire } from '../hooks/useRepertoire';
import { useRepertoireToast } from '../hooks/useRepertoireToast';
import { buildSiteUrl, SITE_NAME } from '../lib/siteConfig';
import styles from './RepertoirePage.module.css';

const firstMoves = (moves: string): string => {
  const matches = moves.trim().match(/(\d+\.\s*\S+(?:\s+\S+)?)/g) || [];
  return matches.slice(0, 2).join(' ');
};

/**
 * The mobile Repertoire tab. Desktop has no equivalent page by design — the
 * row on Discover is the repertoire. Sort is fixed at most recently saved
 * first; there is no manual reordering.
 */
const RepertoirePage: React.FC = () => {
  const { repertoire, count } = useRepertoire();
  const { toggleWithToast, toast } = useRepertoireToast();

  useEffect(() => {
    document.body.className = 'repertoire-page';
    return () => {
      document.body.className = '';
    };
  }, []);

  return (
    <main className={styles.page}>
      <title>{`Your repertoire — ${SITE_NAME}`}</title>
      <link rel="canonical" href={buildSiteUrl('/repertoire')} />
      {/* Personal, device-local and thin — not a page worth indexing. */}
      <meta name="robots" content="noindex" />

      {count === 0 ? (
        <div className={styles.empty}>
          <h1 className={styles.emptyTitle}>Nothing saved yet</h1>
          <p className={styles.emptyText}>
            Star an opening anywhere in the app and it lands here for quick access.
          </p>
          <Link to="/" className={styles.emptyCta}>
            Browse openings
          </Link>
        </div>
      ) : (
        <>
          <header className={styles.header}>
            <h1 className={styles.title}>Your repertoire</h1>
            <p className={styles.count}>
              {count} {count === 1 ? 'opening' : 'openings'} saved.
            </p>
          </header>

          <ul className={styles.list}>
            {repertoire.map((entry) => (
              <li key={entry.fen} className={styles.item}>
                <Link to={`/opening/${encodeURIComponent(entry.fen)}`} className={styles.itemLink}>
                  <MiniBoard fen={entry.fen} size={72} />
                  <span className={styles.itemInfo}>
                    <h3 className={styles.itemName}>{entry.name}</h3>
                    <span className={styles.itemMeta}>
                      {entry.complexity && (
                        <span
                          className={`complexity-pill complexity-${entry.complexity.toLowerCase()}`}
                        >
                          {entry.complexity}
                        </span>
                      )}
                      {entry.eco && <span className="eco-pill">{entry.eco}</span>}
                    </span>
                    <span className={styles.itemMoves}>{firstMoves(entry.moves)}</span>
                  </span>
                  <StarButton
                    filled
                    size="sm"
                    onClick={() =>
                      toggleWithToast({
                        fen: entry.fen,
                        name: entry.name,
                        eco: entry.eco,
                        moves: entry.moves,
                        complexity: entry.complexity,
                      })
                    }
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} />}
    </main>
  );
};

export default RepertoirePage;
