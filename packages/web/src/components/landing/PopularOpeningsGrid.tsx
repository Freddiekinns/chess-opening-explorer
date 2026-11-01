import React from 'react';
import { OpeningCard } from '../shared/OpeningCard';
import { levelLabel } from '../../lib/styleProfile';
import { FilterBar } from '../filters/FilterBar';
import { FilterSheet } from '../filters/FilterSheet';
import { Toast } from '../shared/Toast';
import { useBrowse } from '../../hooks/useBrowse';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useRepertoireToast } from '../../hooks/useRepertoireToast';
import { formatWindow } from '../../lib/statsWindow';
import { atRange } from '../../lib/lichessExplorer';

interface PopularOpeningsGridProps {
  className?: string;
}

/**
 * The Discover grid. Items, the result count and the facet counts all come
 * from one /api/openings/browse request, so the number on screen and the cards
 * under it cannot disagree — they used to come from two different fetches
 * (a popular list for the counts, popular-by-eco for the grid).
 *
 * The heading stays "Popular openings": the default sort is most played, so
 * the unfiltered view is exactly that.
 */
export const PopularOpeningsGrid: React.FC<PopularOpeningsGridProps> = ({ className = '' }) => {
  const {
    items,
    facets,
    total,
    remaining,
    statsWindow,
    loading,
    loadingMore,
    error,
    filters,
    activeCount,
    band,
    setBand,
    setFacet,
    clear,
    loadMore,
    retry,
  } = useBrowse();

  const isMobile = useIsMobile();
  const { isSaved, toggleWithToast, toast } = useRepertoireToast();
  // "at 1400–1800" or "under 1400". Said once, in the heading: the cards under
  // it are already scoped by it.
  const range = band ? atRange(band) : undefined;

  const controlProps = {
    facets,
    filters,
    total,
    activeCount,
    loading,
    onFacetChange: setFacet,
    onClear: clear,
    band,
    onBandChange: setBand,
  };
  // Small print beside the count, desktop only: mobile cards show no game
  // counts, so a date there qualifies nothing on screen.
  const note = statsWindow ? `Lichess · ${formatWindow(statsWindow)}` : undefined;

  return (
    <section className={`popular-openings-section ${className}`}>
      <div className="section-header">
        <h2>{range ? `Popular ${range}` : 'Popular openings'}</h2>
        <p className="section-subtitle">
          The most popular openings for every style of play, from classic variations to hypermodern
        </p>
      </div>

      <div className="filters-container">
        {isMobile ? <FilterSheet {...controlProps} /> : <FilterBar {...controlProps} note={note} />}
      </div>

      {error ? (
        <div className="empty-state">
          <p>Could not load openings just now.</p>
          <button onClick={retry} className="reset-filter-btn">
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="openings-grid">
            {items.map((opening) => (
              <OpeningCard
                key={opening.fen}
                opening={opening as never}
                showEco={true}
                showBoard={true}
                showStar={true}
                isStarred={isSaved(opening.fen)}
                onStarClick={() =>
                  toggleWithToast({
                    fen: opening.fen,
                    name: opening.name,
                    eco: opening.eco,
                    moves: opening.moves,
                    complexity: levelLabel(opening.style_profile),
                  })
                }
                className="opening-grid-item"
              />
            ))}
          </div>

          {remaining > 0 && (
            <div className="load-more-section">
              <button onClick={loadMore} className="load-more-btn" disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load more (${remaining.toLocaleString()} remaining)`}
              </button>
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="empty-state">
              <p>No openings match these filters.</p>
              {/* Not "Clear filters" — the bar above already offers that, and
                  two buttons with one label is a coin toss. This says what the
                  user gets. */}
              <button onClick={clear} className="reset-filter-btn">
                Show all openings
              </button>
            </div>
          )}
        </>
      )}

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} />}
    </section>
  );
};
