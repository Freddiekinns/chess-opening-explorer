import React, { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PersonalOpeningStats } from '../components/personal/PersonalOpeningStats';
import type { OpeningForLookup } from '../../../shared/src';
import pageStyles from './AnalyseGamesPage.module.css';
import { buildSiteUrl, SITE_NAME } from '../lib/siteConfig';

const AnalyseGamesPage: React.FC = () => {
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

  // The search-index is ~1.6 MB — fetch it lazily (first analysis only), and
  // share one in-flight promise so parallel calls don't double-download.
  const openingsPromiseRef = useRef<Promise<OpeningForLookup[]> | null>(null);
  const getOpeningsData = useCallback(() => {
    if (!openingsPromiseRef.current) {
      openingsPromiseRef.current = fetch('/api/openings/search-index')
        .then((response) => response.json())
        .then((data) => {
          if (!data.success) throw new Error('Openings data unavailable');
          return data.data as OpeningForLookup[];
        })
        .catch((error) => {
          // Reset so a later attempt can retry instead of caching the failure
          openingsPromiseRef.current = null;
          throw error;
        });
    }
    return openingsPromiseRef.current;
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

      <PersonalOpeningStats getOpeningsData={getOpeningsData} prefillUsername={prefillUsername} />
    </div>
  );
};

export default AnalyseGamesPage;
