import React from 'react';
import { Link } from 'react-router-dom';
import type { FamilyRollupRow, FamilyVariationRow } from './familyAggregation';
import { useCountUp } from './useCountUp';
import styles from './FamilyRow.module.css';

interface Props {
  colour: 'white' | 'black';
  row: FamilyRollupRow;
  isExpanded: boolean;
  onToggle: () => void;
  /** Returns the route to navigate to when a variation row is clicked. */
  openingLink: (variationKey: string) => string;
}

function pct(games: number, wins: number, draws: number): number {
  if (games === 0) return 0;
  return Math.round(((wins + 0.5 * draws) / games) * 100);
}

/** Disclosure chevron — single-path, 1.5px stroke, 16x16 viewbox. */
const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={open ? styles.chevronOpen : styles.chevron}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <path
      d="M 6 4 L 10 8 L 6 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VariationFragment: React.FC<{ label: string; v: FamilyVariationRow }> = ({ label, v }) => (
  <span className={styles.subMetaPart}>
    <span className={styles.subMetaLabel}>{label}</span>{' '}
    <span className={styles.subMetaName}>{stripFamilyPrefix(v.name)}</span>
    <span className={styles.subMetaDash}> — </span>
    <span className={styles.subMetaPct}>{pct(v.games, v.wins, v.draws)}%</span>
  </span>
);

const SubMeta: React.FC<{
  best: FamilyVariationRow | null;
  weak: FamilyVariationRow | null;
}> = ({ best, weak }) => {
  if (!best && !weak) return null;
  // When best and weak point to the same variation (only one qualifies),
  // render only the best half.
  const showWeak = best && weak && best.key !== weak.key;
  return (
    <div className={styles.subMeta}>
      {best && <VariationFragment label="Best" v={best} />}
      {showWeak && (
        <>
          <span className={styles.subMetaSep} aria-hidden="true">
            ·
          </span>
          <VariationFragment label="Needs work" v={weak!} />
        </>
      )}
      {/* Defensive: best===null && weak!==null cannot arise from groupByFamily
          today, but if a future caller passes that asymmetry the weak entry
          is still rendered rather than silently dropped. */}
      {!best && weak && <VariationFragment label="Needs work" v={weak} />}
    </div>
  );
};

/** "Sicilian: Najdorf" → "Najdorf"; passes through if no colon. */
function stripFamilyPrefix(name: string): string {
  const idx = name.indexOf(':');
  return idx === -1 ? name : name.slice(idx + 1).trimStart();
}

export const FamilyRow: React.FC<Props & { rowIndex?: number }> = ({
  colour,
  row,
  isExpanded,
  onToggle,
  openingLink,
  rowIndex = 0,
}) => {
  const target = pct(row.games, row.wins, row.draws);
  const animated = useCountUp(target, 350);
  const display = Math.round(animated);
  const variationsId = `variations-${colour}-${row.family_id}`;
  const wrClass = colour === 'white' ? styles.winRateWhite : styles.winRateBlack;

  return (
    <div className={styles.familyRow} style={{ ['--row-index' as never]: Math.min(rowIndex, 12) }}>
      <button
        type="button"
        className={styles.header}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={variationsId}
      >
        <span className={styles.chevronCell}>
          <ChevronIcon open={isExpanded} />
        </span>
        <span className={styles.nameCol}>
          <span className={styles.familyName}>{row.display_name}</span>
          <SubMeta best={row.best_variation} weak={row.weak_variation} />
        </span>
        <span className={styles.leader} aria-hidden="true" />
        <span className={`${styles.winRate} ${wrClass}`}>{display}%</span>
        <span className={styles.gamesMeta}>{row.games} games</span>
      </button>
      {isExpanded && (
        <ul id={variationsId} className={styles.variations}>
          {row.variations.map((v, i) => (
            <li
              key={v.key}
              className={styles.variationItem}
              style={{ ['--child-index' as never]: i }}
            >
              <Link className={styles.variationLink} to={openingLink(v.key)}>
                <span className={styles.variationName}>{stripFamilyPrefix(v.name)}</span>
                <span className={styles.variationLeader} aria-hidden="true" />
                <span className={`${styles.variationPct} ${wrClass}`}>
                  {pct(v.games, v.wins, v.draws)}%
                </span>
                <span className={styles.variationGames}>{v.games}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
