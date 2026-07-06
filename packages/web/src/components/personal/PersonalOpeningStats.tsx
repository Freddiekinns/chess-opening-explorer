import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OpeningForLookup } from '../../../../shared/src';
import styles from './PersonalOpeningStats.module.css';
import { type SortMode } from './familyAggregation';
import { FamilyRow } from './FamilyRow';
import { UncategorisedFootnote } from './UncategorisedFootnote';
import {
  findBestOpening,
  findWeakestOpening,
  formatDistinguishingMoves,
  getLossRate,
  getOpeningMovesDisplay,
  getWinRate,
  sortAgg,
  type GroupBy,
  type OpeningAgg,
  type SideTab,
} from './personalStatsLib';
import { usePersonalGames, useFormStatePersistence } from './usePersonalGames';
import { useFamiliesDict, useFamilyRollups } from './useFamilyRollups';
import { OpeningNameSplit, OpeningRow } from './OpeningRow';
import {
  GearIcon,
  GroupToggle,
  SegmentedToggle,
  SIDE_OPTIONS,
  SortMenu,
  UserIcon,
} from './PersonalStatsControls';
import { readSavedFormState } from './personalStatsLib';

/* ==============================
   MAIN COMPONENT
   ============================== */
export const PersonalOpeningStats: React.FC<{
  /** Lazy loader for the openings search-index — called only when an analysis
      actually starts, so idle visitors never download it. */
  getOpeningsData: () => Promise<OpeningForLookup[]>;
  prefillUsername?: string;
}> = ({ getOpeningsData, prefillUsername }) => {
  const {
    platform,
    setPlatform,
    username,
    setUsername,
    limit,
    setLimitSafe,
    step,
    stepText,
    progress,
    processed,
    total,
    error,
    dashboard,
    displayedUsername,
    displayedPlatform,
    canAnalyse,
    isBusy,
    handleAnalyse,
    handleCancel,
  } = usePersonalGames(getOpeningsData, prefillUsername);

  const [whiteSortMode, setWhiteSortMode] = useState<SortMode>('frequency');
  const [blackSortMode, setBlackSortMode] = useState<SortMode>('frequency');
  const [activeTab, setActiveTab] = useState<SideTab>(
    () => readSavedFormState()?.activeTab ?? 'white'
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showAllMobile, setShowAllMobile] = useState(false);
  // Grouping is per-column (mirrors per-column sort) so the toggle can live
  // inside each side's filter row. Family grouping is the default.
  const [whiteGroupBy, setWhiteGroupBy] = useState<GroupBy>('family');
  const [blackGroupBy, setBlackGroupBy] = useState<GroupBy>('family');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const settingsRef = useRef<HTMLDivElement>(null);

  const familiesDict = useFamiliesDict();
  const { whiteFamily, blackFamily } = useFamilyRollups(
    dashboard,
    familiesDict,
    whiteSortMode,
    blackSortMode
  );

  useFormStatePersistence(username, platform, limit, activeTab);

  // Close settings popover on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  const startAnalyse = () =>
    handleAnalyse({
      onDone: () => setShowSearchOverlay(false),
      onFreshResult: () => {
        setWhiteSortMode('frequency');
        setBlackSortMode('frequency');
      },
    });

  const handleEnterToAnalyse: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key !== 'Enter') return;
    if (isBusy) {
      handleCancel();
      return;
    }
    void startAnalyse();
  };

  const showHero = !dashboard && step !== 'done';

  const renderSearchForm = () => (
    <>
      <div className={styles.inputBar}>
        <div className={styles.platformToggle}>
          <button
            type="button"
            className={`${styles.platformBtn} ${platform === 'chess.com' ? styles.platformBtnActive : ''}`}
            onClick={() => setPlatform('chess.com')}
            disabled={isBusy}
          >
            Chess.com
          </button>
          <button
            type="button"
            className={`${styles.platformBtn} ${platform === 'lichess' ? styles.platformBtnActive : ''}`}
            onClick={() => setPlatform('lichess')}
            disabled={isBusy}
          >
            Lichess
          </button>
        </div>

        <div className={styles.inputFields}>
          <span className={styles.userIcon}>
            <UserIcon />
          </span>

          <input
            className={styles.usernameInput}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleEnterToAnalyse}
            placeholder="Enter username..."
            inputMode="text"
            autoComplete="off"
            disabled={isBusy}
          />
        </div>

        <div className={styles.inputActions}>
          {/* Gear / settings */}
          <div ref={settingsRef} className={styles.settingsAnchor}>
            <button
              type="button"
              className={`${styles.gearBtn} ${showSettings ? styles.gearBtnActive : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Settings"
              title={`Analysing last ${limit} games`}
            >
              <GearIcon />
            </button>
            {showSettings && (
              <div
                className={styles.settingsPopover}
                role="dialog"
                aria-label="Games to analyse settings"
              >
                <div className={styles.settingsLabel}>Games to analyse</div>
                <div
                  className={styles.stepper}
                  role="group"
                  aria-label="Number of games to analyse"
                >
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={(e) => setLimitSafe(limit - (e.shiftKey ? 10 : 1))}
                    disabled={isBusy || limit <= 1}
                    aria-label="Decrease games"
                    title="Hold Shift for -10"
                  >
                    -
                  </button>
                  <input
                    className={styles.stepperInput}
                    type="number"
                    min={1}
                    max={500}
                    step={1}
                    aria-label="Games to analyse"
                    value={limit}
                    onChange={(e) => setLimitSafe(Number(e.target.value))}
                    onKeyDown={handleEnterToAnalyse}
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={(e) => setLimitSafe(limit + (e.shiftKey ? 10 : 1))}
                    disabled={isBusy || limit >= 500}
                    aria-label="Increase games"
                    title="Hold Shift for +10"
                  >
                    +
                  </button>
                </div>
                <p className={styles.settingsHint}>Choose between 1 and 500 recent rated games.</p>
              </div>
            )}
          </div>

          <button
            className={styles.analyseBtn}
            onClick={isBusy ? handleCancel : startAnalyse}
            disabled={!isBusy && !canAnalyse}
          >
            {isBusy && <span className={styles.spinner} aria-hidden="true" />}
            <span>{isBusy ? 'Cancel' : 'Analyse'}</span>
          </button>
        </div>
      </div>

      <p className={styles.inputNote}>
        Includes rated rapid, blitz, and classical games only (up to {limit}). Bullet is excluded.
      </p>
    </>
  );

  return (
    <div>
      {/* ===== LANDING (hero + search, centred in viewport when no results) ===== */}
      {!dashboard && (
        <div className={`${styles.landing} ${showHero ? styles.landingCentered : ''}`}>
          {showHero && (
            <div className={styles.hero}>
              <h1 className={styles.heroTitle}>Analyse Your Games</h1>
              <p className={styles.heroSubtitle}>
                Review your performance and improve your openings by connecting your chess account.
              </p>
            </div>
          )}

          {renderSearchForm()}

          {/* Secondary idle prompt */}
          {showHero && step === 'idle' && (
            <div className={styles.idlePrompt}>
              <svg
                className={styles.idlePromptIcon}
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <h2 className={styles.idlePromptTitle}>Ready to analyse your openings?</h2>
              <p className={styles.idlePromptText}>
                Enter your username to explore a detailed breakdown of your performance by opening.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===== SEARCH OVERLAY (when dashboard is showing) ===== */}
      {showSearchOverlay && (
        <div
          className={styles.searchOverlay}
          onClick={() => setShowSearchOverlay(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowSearchOverlay(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Search for a player"
        >
          <div className={styles.searchOverlayContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.searchOverlayClose}
              onClick={() => setShowSearchOverlay(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className={styles.searchOverlayTitle}>Analyse another player</h3>
            {renderSearchForm()}
            {(step === 'fetching' || step === 'analysing') && (
              <div className={styles.overlayProgress}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className={styles.progressMeta}>
                  <span>{stepText}</span>
                  {total > 0 && (
                    <span>
                      {processed}/{total}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== PROGRESS ===== */}
      {(step === 'fetching' || step === 'analysing') && (
        <div className={styles.progress} aria-live="polite">
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={styles.progressMeta}>
            <span>{stepText}</span>
            {total > 0 && (
              <span>
                {processed}/{total}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ===== ERROR ===== */}
      {step === 'error' && error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* ===== DASHBOARD ===== */}
      {dashboard &&
        whiteFamily &&
        blackFamily &&
        (() => {
          const allOpenings = [...dashboard.asWhite, ...dashboard.asBlack];
          const bestOpening = findBestOpening(allOpenings);
          const weakestOpening = findWeakestOpening(allOpenings);
          const showWeakest = weakestOpening && bestOpening?.fen !== weakestOpening?.fen;

          const sortedWhite = sortAgg(dashboard.asWhite, whiteSortMode);
          const sortedBlack = sortAgg(dashboard.asBlack, blackSortMode);

          const activeSortMode = activeTab === 'white' ? whiteSortMode : blackSortMode;
          const setActiveSortMode = activeTab === 'white' ? setWhiteSortMode : setBlackSortMode;
          const activeGroupBy = activeTab === 'white' ? whiteGroupBy : blackGroupBy;
          const setActiveGroupBy = activeTab === 'white' ? setWhiteGroupBy : setBlackGroupBy;
          const activeData =
            activeTab === 'white'
              ? { openings: sortedWhite, games: dashboard.whiteGames }
              : { openings: sortedBlack, games: dashboard.blackGames };

          const displayedPlatformLabel = displayedPlatform === 'lichess' ? 'Lichess' : 'Chess.com';

          const openingLink = (o: OpeningAgg) =>
            `/opening/${encodeURIComponent(o.fen)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`;

          // Featured cards show the full distinguishing line (tail-kept), not
          // the first two move pairs — sibling variations share those and the
          // cards otherwise read as the same opening (2026-06-11 design review).
          const bestOpeningMoves = bestOpening ? formatDistinguishingMoves(bestOpening.moves) : '';
          const weakestOpeningMoves = weakestOpening
            ? formatDistinguishingMoves(weakestOpening.moves)
            : '';

          const totalWins = dashboard.whiteWin + dashboard.blackWin;
          const totalDraws = dashboard.whiteDraw + dashboard.blackDraw;
          const totalLosses = dashboard.whiteLoss + dashboard.blackLoss;

          return (
            <>
              {/* ===== MOBILE DASHBOARD ===== */}
              <div className={styles.mobileDashboard}>
                {/* Centered hero */}
                <div className={styles.mobileHero}>
                  <h2 className={styles.mobilePlayerName}>{displayedUsername}</h2>
                  <span className={styles.mobilePlatform}>{displayedPlatformLabel}</span>
                  <span className={styles.mobileGamesMeta}>
                    {dashboard.totalGames} analysed &middot; {dashboard.classifiedGames} matched
                    {dashboard.unclassifiedGames > 0
                      ? ` · ${dashboard.unclassifiedGames} unrecognised`
                      : ''}
                  </span>
                </div>

                {/* 3 inline stat cards */}
                <div className={styles.tripleStats}>
                  <div className={`${styles.triStat} ${styles.triStatWin}`}>
                    <span className={styles.triStatLabel}>Wins</span>
                    <span className={styles.triStatValue}>{totalWins}</span>
                  </div>
                  <div className={styles.triStat}>
                    <span className={styles.triStatLabel}>Draws</span>
                    <span className={styles.triStatValue}>{totalDraws}</span>
                  </div>
                  <div className={styles.triStat}>
                    <span className={styles.triStatLabel}>Losses</span>
                    <span className={styles.triStatValue}>{totalLosses}</span>
                  </div>
                </div>

                {/* Highlight cards */}
                {bestOpening && (
                  <Link className={styles.highlightCard} to={openingLink(bestOpening)}>
                    <span className={`${styles.highlightPill} ${styles.highlightPillWin}`}>
                      Top-performing
                    </span>
                    <OpeningNameSplit name={bestOpening.name} className={styles.highlightName} />
                    {bestOpeningMoves && (
                      <span className={styles.highlightMoves}>{bestOpeningMoves}</span>
                    )}
                    <span className={styles.highlightMeta}>
                      {getWinRate(bestOpening)}% win rate &middot; {bestOpening.games} games
                    </span>
                  </Link>
                )}
                {showWeakest && weakestOpening && (
                  <Link className={styles.highlightCard} to={openingLink(weakestOpening)}>
                    <span className={`${styles.highlightPill} ${styles.highlightPillLoss}`}>
                      Needs work
                    </span>
                    <OpeningNameSplit name={weakestOpening.name} className={styles.highlightName} />
                    {weakestOpeningMoves && (
                      <span className={styles.highlightMoves}>{weakestOpeningMoves}</span>
                    )}
                    <span className={styles.highlightMeta}>
                      {getLossRate(weakestOpening)}% loss rate &middot; {weakestOpening.games} games
                    </span>
                  </Link>
                )}

                {/* Side switcher (mobile) — full-width segmented pill */}
                <SegmentedToggle
                  options={SIDE_OPTIONS}
                  value={activeTab}
                  onChange={(v) => {
                    setActiveTab(v);
                    setShowAllMobile(false);
                  }}
                  ariaLabel="View openings by side"
                />

                {/* Section title + grouping / sort filters */}
                <div className={styles.mobileSectionHead}>
                  <h3 className={styles.mobileSectionTitle}>
                    Performance as {activeTab === 'white' ? 'White' : 'Black'}
                  </h3>
                  <div className={styles.mobileFilters}>
                    <GroupToggle
                      grouped={activeGroupBy === 'family'}
                      onChange={(g) => setActiveGroupBy(g ? 'family' : 'variation')}
                      sideLabel={activeTab === 'white' ? 'White' : 'Black'}
                    />
                    <SortMenu
                      value={activeSortMode}
                      onChange={setActiveSortMode}
                      ariaLabel={`Sort ${activeTab} openings`}
                    />
                  </div>
                </div>

                {/* Opening cards */}
                {activeGroupBy === 'family' ? (
                  (() => {
                    const fam = activeTab === 'white' ? whiteFamily : blackFamily;
                    if (fam.rows.length === 0 && !fam.uncategorised) {
                      return <div className={styles.emptyList}>No classified openings.</div>;
                    }
                    return (
                      <>
                        <div className={styles.mobileOpeningList}>
                          {fam.rows.map((row, i) => {
                            const key = `${activeTab}:${row.family_id}`;
                            return (
                              <FamilyRow
                                key={key}
                                colour={activeTab}
                                row={row}
                                rowIndex={i}
                                isExpanded={expanded.has(key)}
                                onToggle={() => toggleExpanded(key)}
                                openingLink={(variationKey) =>
                                  `/opening/${encodeURIComponent(variationKey)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`
                                }
                              />
                            );
                          })}
                        </div>
                        <UncategorisedFootnote summary={fam.uncategorised} />
                      </>
                    );
                  })()
                ) : activeData.openings.length === 0 ? (
                  <div className={styles.emptyList}>No classified openings.</div>
                ) : (
                  <div className={styles.mobileOpeningList}>
                    {(showAllMobile ? activeData.openings : activeData.openings.slice(0, 5)).map(
                      (o, i) => {
                        const wP = o.games > 0 ? Math.round((o.win / o.games) * 100) : 0;
                        const dP = o.games > 0 ? Math.round((o.draw / o.games) * 100) : 0;
                        const lP = o.games > 0 ? Math.round((o.loss / o.games) * 100) : 0;
                        return (
                          <Link
                            key={o.fen}
                            className={styles.mobileCard}
                            to={openingLink(o)}
                            style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                          >
                            <div className={styles.mobileCardHead}>
                              <div className={styles.mobileCardNameCol}>
                                <OpeningNameSplit name={o.name} className={styles.mobileCardName} />
                                {getOpeningMovesDisplay(o.moves) && (
                                  <span className={styles.mobileCardMoves}>
                                    {getOpeningMovesDisplay(o.moves)}
                                  </span>
                                )}
                              </div>
                              <span className={styles.mobileCardGames}>Games {o.games}</span>
                            </div>
                            <div className={styles.mobileCardBar}>
                              {wP > 0 && (
                                <div className={styles.mobileBarWin} style={{ width: `${wP}%` }} />
                              )}
                              {dP > 0 && (
                                <div className={styles.mobileBarDraw} style={{ width: `${dP}%` }} />
                              )}
                              {lP > 0 && (
                                <div className={styles.mobileBarLoss} style={{ width: `${lP}%` }} />
                              )}
                            </div>
                            <div className={styles.mobileCardPcts}>
                              <span className={styles.mobileCardPctWin}>{wP}% win</span>
                              <span className={styles.mobileCardPctDraw}>{dP}% draw</span>
                              <span className={styles.mobileCardPctLoss}>{lP}% loss</span>
                            </div>
                          </Link>
                        );
                      }
                    )}
                    {!showAllMobile && activeData.openings.length > 5 && (
                      <button
                        type="button"
                        className={styles.showMoreBtn}
                        onClick={() => setShowAllMobile(true)}
                      >
                        Show all {activeData.openings.length} openings
                      </button>
                    )}
                  </div>
                )}

                {/* Bottom CTA */}
                <button
                  type="button"
                  className={styles.bottomCta}
                  onClick={() => setShowSearchOverlay(true)}
                >
                  Analyse another player
                </button>
              </div>

              {/* ===== DESKTOP DASHBOARD (unchanged) ===== */}
              <div className={styles.desktopDashboard}>
                {/* Dashboard hero */}
                <div className={styles.dashboardHero}>
                  <div className={styles.dashboardHeroContent}>
                    <h2 className={styles.dashboardPlayerName}>{displayedUsername}</h2>
                    <div className={styles.playerMeta}>
                      <span className={styles.platformBadge}>{displayedPlatformLabel}</span>
                      <span className={styles.gamesAnalysed}>
                        {dashboard.totalGames} games analysed &middot; {dashboard.classifiedGames}{' '}
                        matched
                        {dashboard.unclassifiedGames > 0
                          ? ` · ${dashboard.unclassifiedGames} unrecognised`
                          : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.analyseAnotherBtn}
                    onClick={() => setShowSearchOverlay(true)}
                  >
                    Analyse another player <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>

                {/* Summary cards */}
                <div className={`${styles.cardsGrid} ${!showWeakest ? styles.cardsGridTwo : ''}`}>
                  <div className={styles.card}>
                    <div className={`${styles.cardLabel} ${styles.cardLabelAccent}`}>
                      Overall performance
                    </div>
                    <h3 className={styles.cardTitle}>Career Totals</h3>
                    <div className={styles.statsRows}>
                      <div className={styles.statsRow}>
                        <span className={`${styles.statsLabel} ${styles.statsLabelWin}`}>
                          Total wins
                        </span>
                        <span className={styles.statsValue}>{totalWins.toLocaleString()}</span>
                      </div>
                      <div className={styles.statsRow}>
                        <span className={styles.statsLabel}>Total draws</span>
                        <span className={styles.statsValue}>{totalDraws.toLocaleString()}</span>
                      </div>
                      <div className={styles.statsRow}>
                        <span className={`${styles.statsLabel} ${styles.statsLabelLoss}`}>
                          Total losses
                        </span>
                        <span className={styles.statsValue}>{totalLosses.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {bestOpening && (
                    <Link
                      className={`${styles.card} ${styles.cardClickable}`}
                      to={openingLink(bestOpening)}
                    >
                      <div className={`${styles.cardLabel} ${styles.cardLabelWin}`}>
                        Top-performing opening
                      </div>
                      <OpeningNameSplit
                        name={bestOpening.name}
                        className={styles.cardOpeningName}
                      />
                      {bestOpeningMoves && (
                        <div className={styles.cardMoves}>{bestOpeningMoves}</div>
                      )}
                      <div className={styles.cardContext}>{bestOpening.games} games</div>
                      <div className={styles.winRateRow}>
                        <span className={`${styles.winRateValue} ${styles.winRateValueWin}`}>
                          {getWinRate(bestOpening)}%
                        </span>
                        <span className={styles.winRateLabel}>win rate</span>
                      </div>
                      <div className={`${styles.winRateBar} ${styles.winRateBarWin}`}>
                        <div
                          className={styles.winRateBarFillWin}
                          style={{ width: `${getWinRate(bestOpening)}%` }}
                        />
                      </div>
                    </Link>
                  )}

                  {showWeakest && weakestOpening && (
                    <Link
                      className={`${styles.card} ${styles.cardClickable}`}
                      to={openingLink(weakestOpening)}
                    >
                      <div className={`${styles.cardLabel} ${styles.cardLabelLoss}`}>
                        Needs work
                      </div>
                      <OpeningNameSplit
                        name={weakestOpening.name}
                        className={styles.cardOpeningName}
                      />
                      {weakestOpeningMoves && (
                        <div className={styles.cardMoves}>{weakestOpeningMoves}</div>
                      )}
                      <div className={styles.cardContext}>{weakestOpening.games} games</div>
                      <div className={styles.winRateRow}>
                        <span className={`${styles.winRateValue} ${styles.winRateValueLoss}`}>
                          {getLossRate(weakestOpening)}%
                        </span>
                        <span className={styles.winRateLabel}>loss rate</span>
                      </div>
                      <div className={`${styles.winRateBar} ${styles.winRateBarLoss}`}>
                        <div
                          className={styles.winRateBarFillLoss}
                          style={{ width: `${getLossRate(weakestOpening)}%` }}
                        />
                      </div>
                    </Link>
                  )}
                </div>

                {/* Desktop: side-by-side opening lists */}
                <div className={styles.openingSections}>
                  <div className={styles.openingSection}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>
                        Performance as White
                        <span className={styles.sectionBadge}>{dashboard.whiteGames} games</span>
                      </h3>
                    </div>
                    <div className={styles.filterRow}>
                      <GroupToggle
                        grouped={whiteGroupBy === 'family'}
                        onChange={(g) => setWhiteGroupBy(g ? 'family' : 'variation')}
                        sideLabel="White"
                      />
                      <SortMenu
                        value={whiteSortMode}
                        onChange={setWhiteSortMode}
                        ariaLabel="Sort white openings"
                      />
                    </div>
                    <div className={styles.colHeaders}>
                      <span className={styles.colHeaderName}>Opening name</span>
                      <div className={styles.colHeaderRight}>
                        <span className={styles.colHeaderGp}>GP</span>
                        <span className={styles.colHeaderDist}>W / D / L distribution</span>
                      </div>
                    </div>
                    {whiteGroupBy === 'family' ? (
                      whiteFamily.rows.length === 0 && !whiteFamily.uncategorised ? (
                        <div className={styles.emptyList}>No classified openings.</div>
                      ) : (
                        <>
                          <div className={styles.openingList}>
                            {whiteFamily.rows.map((row, i) => {
                              const key = `white:${row.family_id}`;
                              return (
                                <FamilyRow
                                  key={key}
                                  colour="white"
                                  row={row}
                                  rowIndex={i}
                                  isExpanded={expanded.has(key)}
                                  onToggle={() => toggleExpanded(key)}
                                  openingLink={(variationKey) =>
                                    `/opening/${encodeURIComponent(variationKey)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`
                                  }
                                />
                              );
                            })}
                          </div>
                          <UncategorisedFootnote summary={whiteFamily.uncategorised} />
                        </>
                      )
                    ) : sortedWhite.length === 0 ? (
                      <div className={styles.emptyList}>No classified openings.</div>
                    ) : (
                      <div className={styles.openingList}>
                        {sortedWhite.map((o, i) => (
                          <OpeningRow
                            key={o.fen}
                            opening={o}
                            platform={displayedPlatform}
                            username={displayedUsername}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.openingSection}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>
                        Performance as Black
                        <span className={styles.sectionBadge}>{dashboard.blackGames} games</span>
                      </h3>
                    </div>
                    <div className={styles.filterRow}>
                      <GroupToggle
                        grouped={blackGroupBy === 'family'}
                        onChange={(g) => setBlackGroupBy(g ? 'family' : 'variation')}
                        sideLabel="Black"
                      />
                      <SortMenu
                        value={blackSortMode}
                        onChange={setBlackSortMode}
                        ariaLabel="Sort black openings"
                      />
                    </div>
                    <div className={styles.colHeaders}>
                      <span className={styles.colHeaderName}>Opening name</span>
                      <div className={styles.colHeaderRight}>
                        <span className={styles.colHeaderGp}>GP</span>
                        <span className={styles.colHeaderDist}>W / D / L distribution</span>
                      </div>
                    </div>
                    {blackGroupBy === 'family' ? (
                      blackFamily.rows.length === 0 && !blackFamily.uncategorised ? (
                        <div className={styles.emptyList}>No classified openings.</div>
                      ) : (
                        <>
                          <div className={styles.openingList}>
                            {blackFamily.rows.map((row, i) => {
                              const key = `black:${row.family_id}`;
                              return (
                                <FamilyRow
                                  key={key}
                                  colour="black"
                                  row={row}
                                  rowIndex={i}
                                  isExpanded={expanded.has(key)}
                                  onToggle={() => toggleExpanded(key)}
                                  openingLink={(variationKey) =>
                                    `/opening/${encodeURIComponent(variationKey)}?ref=personal&platform=${displayedPlatform}&username=${encodeURIComponent(displayedUsername)}`
                                  }
                                />
                              );
                            })}
                          </div>
                          <UncategorisedFootnote summary={blackFamily.uncategorised} />
                        </>
                      )
                    ) : sortedBlack.length === 0 ? (
                      <div className={styles.emptyList}>No classified openings.</div>
                    ) : (
                      <div className={styles.openingList}>
                        {sortedBlack.map((o, i) => (
                          <OpeningRow
                            key={o.fen}
                            opening={o}
                            platform={displayedPlatform}
                            username={displayedUsername}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ height: 'var(--space-8)' }} />
            </>
          );
        })()}
    </div>
  );
};

export default PersonalOpeningStats;
