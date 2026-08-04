import React from 'react';
import { OpeningCard } from '../shared/OpeningCard';
import { FilterBar } from '../filters/FilterBar';
import { FilterSheet } from '../filters/FilterSheet';
import { Toast } from '../shared/Toast';
import { useBrowse } from '../../hooks/useBrowse';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useRepertoireToast } from '../../hooks/useRepertoireToast';

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
    loading,
    loadingMore,
    error,
    filters,
    activeCount,
    setFacet,
    clear,
    loadMore,
    retry,
  } = useBrowse();

  const isMobile = useIsMobile();
  const { isSaved, toggleWithToast, toast } = useRepertoireToast();

  const controlProps = {
    facets,
    filters,
    total,
    activeCount,
    loading,
    onFacetChange: setFacet,
    onClear: clear,
  };

  return (
    <section className={`popular-openings-section ${className}`}>
      <div className="section-header">
        <h2>Popular openings</h2>
        <p className="section-subtitle">
          The most popular openings for every style of play, from classic variations to hypermodern
        </p>
      </div>

      <div className="filters-container">
        {isMobile ? <FilterSheet {...controlProps} /> : <FilterBar {...controlProps} />}
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
                    complexity: opening.level ?? undefined,
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
