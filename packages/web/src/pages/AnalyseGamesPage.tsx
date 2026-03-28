import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PersonalOpeningStats } from '../components/personal/PersonalOpeningStats';
import type { OpeningForLookup } from '../../../shared/src';
import pageStyles from './AnalyseGamesPage.module.css';

const AnalyseGamesPage: React.FC = () => {
  const [openingsData, setOpeningsData] = useState<OpeningForLookup[]>([]);
  const location = useLocation();

  useEffect(() => {
    document.body.className = 'analyse-page';
    return () => {
      document.body.className = '';
    };
  }, []);

  const params = new URLSearchParams(location.search);
  const prefillUsername = params.get('username') || '';

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/openings/search-index');
        const data = await response.json();
        if (data.success) {
          setOpeningsData(data.data);
        }
      } catch (error) {
        console.warn('Failed to load openings data:', error);
      }
    };
    loadData();
  }, []);

  return (
    <div className={pageStyles.page}>
      <title>Analyse Your Games — Opening Book</title>
      <meta
        name="description"
        content="Analyse your Chess.com and Lichess games to discover which openings you play and track your performance."
      />
      <link rel="canonical" href="https://www.openingbook.com/analyse" />
      <meta property="og:title" content="Analyse Your Games — Opening Book" />
      <meta
        property="og:description"
        content="Analyse your Chess.com and Lichess games to discover which openings you play and track your performance."
      />
      <meta property="og:url" content="https://www.openingbook.com/analyse" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Opening Book" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Analyse Your Games — Opening Book" />
      <meta
        name="twitter:description"
        content="Analyse your Chess.com and Lichess games to discover which openings you play and track your performance."
      />

      <PersonalOpeningStats openingsData={openingsData} prefillUsername={prefillUsername} />

    </div>
  );
};

export default AnalyseGamesPage;
