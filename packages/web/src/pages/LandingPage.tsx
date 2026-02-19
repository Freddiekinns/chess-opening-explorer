import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingHeader } from '../components/layout/LandingHeader';
import { SearchBar } from '../components/shared/SearchBar';
import { PopularOpeningsGrid } from '../components/landing/PopularOpeningsGrid';
import { FeedbackSection } from '../components/shared/FeedbackSection';
import { PGNInputModal } from '../components/shared/PGNInputModal';

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
  const [dataLoaded, setDataLoaded] = useState(false);
  const [popularOpenings, setPopularOpenings] = useState<Opening[]>([]);
  const [expandedSearchLoaded, setExpandedSearchLoaded] = useState(false);
  const [isPGNModalOpen, setIsPGNModalOpen] = useState(false);
  const navigate = useNavigate();

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

  // Load openings data and popular openings
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load popular openings first (most critical for UX)
        const popularResponse = await fetch('/api/openings/popular-by-eco?limit=6');
        const popularData = await popularResponse.json();

        if (popularData.success && popularData.data) {
          const flattenedPopular = Object.values(popularData.data).flat() as Opening[];
          setPopularOpenings(flattenedPopular);
          setDataLoaded(true);
        }

        // Load search index in parallel
        fetch('/api/openings/search-index?limit=1000')
          .then((response) => response.json())
          .then((searchData) => {
            if (searchData.success) {
              setOpeningsData(searchData.data);

              if (!popularData.success || !popularData.data) {
                const fallbackPopular = searchData.data
                  .filter(
                    (opening: Opening) =>
                      opening.games_analyzed || opening.analysis_json?.popularity
                  )
                  .sort((a: Opening, b: Opening) => {
                    const gamesA = a.games_analyzed || 0;
                    const gamesB = b.games_analyzed || 0;
                    if (gamesA !== gamesB) return gamesB - gamesA;
                    return (b.analysis_json?.popularity || 0) - (a.analysis_json?.popularity || 0);
                  })
                  .slice(0, 30);

                setPopularOpenings(fallbackPopular);
                setDataLoaded(true);
              }
            }
          })
          .catch((error) => {
            console.warn('Search index loading failed:', error);
            if (popularData.success && popularData.data) {
              const flattenedPopular = Object.values(popularData.data).flat() as Opening[];
              setOpeningsData(flattenedPopular);
            }
          });
      } catch (error) {
        console.error('Error loading data:', error);
        setDataLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleOpeningSelect = (opening: Opening) => {
    const encodedFen = encodeURIComponent(opening.fen);
    navigate(`/opening/${encodedFen}`);
  };

  const handlePGNOpeningFound = (fen: string) => {
    const encodedFen = encodeURIComponent(fen);
    navigate(`/opening/${encodedFen}`);
  };

  return (
    <div className="landing-page">
      <LandingHeader />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Opening Book</h1>
          <p className="hero-subtitle">Discover, explore and learn chess openings.</p>

          <div className="hero-search-wrapper">
            <SearchBar
              variant="landing"
              onSelect={handleOpeningSelect}
              placeholder="Try: 'aggressive openings' or 'popular responses to d4'"
              disabled={loading}
              loading={loading}
              openingsData={openingsData}
              onExpandSearch={handleExpandSearch}
              className="hero-search"
            />
            <div className="pgn-search-link-wrapper">
              <button className="pgn-search-link" onClick={() => setIsPGNModalOpen(true)}>
                Or search by PGN
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Openings Grid */}
      <div className="popular-openings-container">
        {dataLoaded && popularOpenings.length > 0 ? (
          <PopularOpeningsGrid
            openings={popularOpenings}
            onOpeningSelect={handleOpeningSelect}
            className="main-grid"
          />
        ) : (
          <div className="popular-openings-placeholder">
            {/* Reserved space for Popular Openings to prevent layout shift */}
          </div>
        )}
      </div>

      <FeedbackSection source="landing" />

      <PGNInputModal
        isOpen={isPGNModalOpen}
        onClose={() => setIsPGNModalOpen(false)}
        onOpeningFound={handlePGNOpeningFound}
        openingsData={openingsData}
      />
    </div>
  );
};

export default LandingPage;
