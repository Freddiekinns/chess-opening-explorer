import { lazy, Suspense, useEffect } from 'react';
import type { ReactElement } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { STATIC_ROUTES, type StaticRoute } from './lib/siteConfig';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import TopBar from './components/layout/TopBar';
import BottomTabBar from './components/layout/BottomTabBar';
import { Footer } from './components/layout/Footer';

// Route-level code splitting: each page loads on demand, so the landing
// bundle no longer carries the Analyse page or the detail page's chess stack
// (chess.js + react-chessboard live in their own chunk — see vite.config).
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AnalyseGamesPage = lazy(() => import('./pages/AnalyseGamesPage'));
const OpeningDetailPage = lazy(() => import('./pages/OpeningDetailPage'));
const RepertoirePage = lazy(() => import('./pages/RepertoirePage'));

/** SPA navigation keeps the previous page's scroll offset — reset to the top
 *  whenever the route changes so every page opens at its heading. */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

/** Mirrors the index.html splash so route transitions don't flash a bare page. */
const RouteFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <div className="loading-spinner" />
  </div>
);

/** Keyed by StaticRoute, so a route added to one and not the other does not
 *  compile. The catch-all and the opening route are not static pages and are
 *  declared separately below. */
const STATIC_ROUTE_ELEMENTS: Record<StaticRoute, ReactElement> = {
  '/': <LandingPage />,
  '/analyse': <AnalyseGamesPage />,
  '/repertoire': <RepertoirePage />,
};

function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <TopBar />
      <main className="app-content">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {STATIC_ROUTES.map((path) => (
              <Route key={path} path={path} element={STATIC_ROUTE_ELEMENTS[path]} />
            ))}
            <Route path="/opening/:fen" element={<OpeningDetailPage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <BottomTabBar />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
