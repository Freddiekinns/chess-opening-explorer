import React from 'react';
import { Link } from 'react-router-dom';
import type { FamilyRollupRow } from './familyAggregation';
import { DistributionBar } from './DistributionBar';
import styles from './FamilyRow.module.css';

interface Props {
  colour: 'white' | 'black';
  row: FamilyRollupRow;
  isExpanded: boolean;
  onToggle: () => void;
  /** Returns the route to navigate to when a variation row is clicked. */
  openingLink: (variationKey: string) => string;
  rowIndex?: number;
}

/** Disclosure chevron — single-path, 1.5px stroke, rotates 90° when open. */
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

/** "Sicilian: Najdorf" → "Najdorf"; passes through if no colon. */
function stripFamilyPrefix(name: string): string {
  const idx = name.indexOf(':');
  return idx === -1 ? name : name.slice(idx + 1).trimStart();
}

/** Child rows whose name is just the bare family ("Vienna Game" inside the
    Vienna Game rollup) would repeat the header verbatim — label them "Main
    line" so they read as the family's stem line, not a duplicate. */
function variationLabel(name: string, familyDisplayName: string): string {
  const stripped = stripFamilyPrefix(name);
  if (name.indexOf(':') === -1 && name.trim() === familyDisplayName.trim()) {
    return 'Main line';
  }
  return stripped;
}

export const FamilyRow: React.FC<Props> = ({
  colour,
  row,
  isExpanded,
  onToggle,
  openingLink,
  rowIndex = 0,
}) => {
  const variationsId = `variations-${colour}-${row.family_id}`;
  const lineNoun = row.variation_count === 1 ? 'line' : 'lines';

  return (
    <div className={styles.familyRow} style={{ ['--row-index' as never]: Math.min(rowIndex, 12) }}>
      <button
        type="button"
        className={styles.header}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={variationsId}
      >
        <span className={styles.left}>
          <span className={styles.chevronCell}>
            <ChevronIcon open={isExpanded} />
          </span>
          <span className={styles.nameCol}>
            <span className={styles.familyName}>{row.display_name}</span>
            <span className={styles.familyMeta}>
              <span className={styles.metaGames}>{row.games} games · </span>
              {row.variation_count} {lineNoun}
            </span>
          </span>
        </span>
        <span className={styles.right}>
          <span className={styles.gamesCount}>{row.games}</span>
          <span className={styles.barCell}>
            <DistributionBar win={row.wins} draw={row.draws} loss={row.losses} games={row.games} />
          </span>
        </span>
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
                <span className={styles.variationName}>
                  {variationLabel(v.name, row.display_name)}
                </span>
                <span className={styles.right}>
                  <span className={styles.variationGames}>{v.games}</span>
                  <span className={styles.barCell}>
                    <DistributionBar
                      win={v.wins}
                      draw={v.draws}
                      loss={v.losses}
                      games={v.games}
                      compact
                    />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FamilyRow;
