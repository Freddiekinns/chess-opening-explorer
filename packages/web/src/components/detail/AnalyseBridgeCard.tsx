import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import styles from './AnalyseBridgeCard.module.css';
import { trackEvent } from '../../lib/analytics';

/**
 * Detail-page → Analyse funnel bridge (deviation-trainer PRD §5.2): shown on
 * pages whose snapshot has ≥1,000 games, dismissable for the session.
 */

const MIN_GAMES = 1000;
const DISMISS_KEY = 'openingbook:bridge-dismissed';

interface AnalyseBridgeCardProps {
  gamesAnalyzed: number;
  openingName: string;
}

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export const AnalyseBridgeCard: React.FC<AnalyseBridgeCardProps> = ({
  gamesAnalyzed,
  openingName,
}) => {
  const [dismissed, setDismissed] = useState(isDismissed);

  if (dismissed || gamesAnalyzed < MIN_GAMES) return null;

  const family = openingName.split(':')[0].trim();

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Dismiss is best-effort; worst case the card reappears.
    }
  };

  return (
    <div className={styles.card}>
      <Link to="/analyse" className={styles.link} onClick={() => trackEvent('bridge_click')}>
        See how you actually play the {family} — free, no account.
      </Link>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
};

export default AnalyseBridgeCard;
