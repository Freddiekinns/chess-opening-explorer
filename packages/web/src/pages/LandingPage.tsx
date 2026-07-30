import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../components/shared/SearchBar';
import SearchOverlay from '../components/shared/SearchOverlay';
import { useIsMobile } from '../hooks/useMediaQuery';
import { PopularOpeningsGrid } from '../components/landing/PopularOpeningsGrid';
import { RepertoireSection } from '../components/landing/RepertoireSection';
import { buildSiteUrl, SITE_NAME } from '../lib/siteConfig';

// Loaded on first open — the modal's PGN parsing pulls chess.js, which must
// stay out of the landing bundle (see vite.config manualChunks).
const PGNInputModal = lazy(() =>
  import('../components/shared/PGNInputModal').then((m) => ({ default: m.PGNInputModal }))
);

interface Opening {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  src: string;
  scid?: string;
  aliases?: Record<string, string>;
  analysis_json?: {
    description?: string;
    style_tags?: string[];
    popularity?: number;
  };
  games_analyzed?: number;
  popularity_rank?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
}

const LandingPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [openingsData, setOpeningsData] = useState<Opening[]>([]);
  const [expandedSearchLoaded, setExpandedSearchLoaded] = useState(false);
  const [isPGNModalOpen, setIsPGNModalOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const canonicalUrl = buildSiteUrl('/');
  const seoTitle = `${SITE_NAME} — Discover, explore and learn chess openings`;
  const seoDescription =
    'Explore 12,000+ chess openings with videos, studies, win rates, and practice tools. Find the perfect opening for your style.';

  // Apply body class for this page
  useEffect(() => {
    document.body.className = 'landing-page';
    return () => {
      document.body.className = '';
    };
  }, []);

  // Progressive search expansion function
  const handleExpandSearch = async () => {
    if (expandedSearchLoaded) return;

    try {
      const response = await fetch('/api/openings/search-index');
      const data = await response.json();

      if (data.success) {
        setOpeningsData(data.data);
        setExpandedSearchLoaded(true);
      }
    } catch (error) {
      console.warn('Failed to expand search index:', error);
    }
  };

  // Only the search index now — the grid fetches its own data from
  // /api/openings/browse, which is what makes its count and its contents agree.
  useEffect(() => {
    setLoading(true);
    fetch('/api/openings/search-index?limit=1000')
      .then((response) => response.json())
      .then((searchData) => {
        if (searchData.success) setOpeningsData(searchData.data);
      })
      .catch((error) => {
        console.warn('Search index loading failed:', error);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleOpeningSelect = (opening: Opening) => {
    const encodedFen = encodeURIComponent(opening.fen);
    navigate(`/opening/${encodedFen}`);
  };

  const handlePGNOpeningFound = (fen: string) => {
    const encodedFen = encodeURIComponent(fen);
    navigate(`/opening/${encodedFen}`);
  };

  const handleSurpriseMe = async () => {
    try {
      const response = await fetch('/api/openings/random');
      const data = await response.json();
      if (data.success && data.data) {
        navigate(`/opening/${encodeURIComponent(data.data.fen)}`);
      }
    } catch {
      // A failed surprise is not worth an error state — the search is right there.
    }
  };

  return (
    <main className="landing-page">
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Opening <span className="hero-title-accent">Book</span>
          </h1>
          <p className="hero-subtitle">Discover, explore and learn chess openings.</p>

          <div className="hero-search-wrapper">
            <SearchBar
              variant="landing"
              onSelect={handleOpeningSelect}
              placeholder="Search variations, ECO codes, or systems..."
              disabled={loading}
              loading={loading}
              openingsData={openingsData}
              onExpandSearch={handleExpandSearch}
              onSurprise={handleSurpriseMe}
              /* Below 767px the hero hands off to the full-screen overlay
                 rather than opening its own dropdown. The landing page
                 otherwise ran two search models on one screen — the top bar's
                 magnifier opened the overlay while the hero opened an inline
                 panel that the on-screen keyboard covers. */
              onActivate={isMobile ? () => setMobileSearchOpen(true) : undefined}
              className="hero-search"
            />
            {/* Three unequal actions used to compete at the same level. Search
                is now the only prominent element; these drop beneath it as
                quiet links, Surprise first (UX review change 02). */}
            <div className="hero-secondary-links">
              <button className="hero-quiet-link" onClick={handleSurpriseMe}>
                Surprise me
              </button>
              <span className="hero-link-separator" aria-hidden="true">
                ·
              </span>
              <button className="hero-quiet-link" onClick={() => setIsPGNModalOpen(true)}>
                Paste a game
              </button>
            </div>
          </div>
        </div>
      </section>

      <RepertoireSection />

      {/* Popular Openings Grid */}
      <div className="popular-openings-container">
        <PopularOpeningsGrid className="main-grid" />
      </div>

      {isPGNModalOpen && (
        <Suspense fallback={null}>
          <PGNInputModal
            isOpen={isPGNModalOpen}
            onClose={() => setIsPGNModalOpen(false)}
            onOpeningFound={handlePGNOpeningFound}
            openingsData={openingsData}
          />
        </Suspense>
      )}

      {/* The hero's search on mobile. Same component the top bar's magnifier
          opens, so there is one search surface per screen rather than two. */}
      <SearchOverlay open={mobileSearchOpen} onClose={() => setMobileSearchOpen(false)} />
    </main>
  );
};

export default LandingPage;
