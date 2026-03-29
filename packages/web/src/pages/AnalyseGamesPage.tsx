import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PersonalOpeningStats } from '../components/personal/PersonalOpeningStats';
import type { OpeningForLookup } from '../../../shared/src';
import pageStyles from './AnalyseGamesPage.module.css';
import { buildSiteUrl, SITE_NAME } from '../lib/siteConfig';

const AnalyseGamesPage: React.FC = () => {
  const [openingsData, setOpeningsData] = useState<OpeningForLookup[]>([]);
  const location = useLocation();
  const canonicalUrl = buildSiteUrl('/analyse');
  const seoTitle = `Analyse Your Games — ${SITE_NAME}`;
  const seoDescription =
    'Analyse your Chess.com and Lichess games to discover which openings you play and track your performance.';

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

      <PersonalOpeningStats openingsData={openingsData} prefillUsername={prefillUsername} />
    </div>
  );
};

export default AnalyseGamesPage;
