import React, { useEffect, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import styles from './PositionSheet.module.css';

/**
 * Mobile bottom sheet for position tools (design 2a): the FEN string plus
 * Copy / Analyse-on-Lichess actions, opened from the "…" button in the
 * board controls. Replaces the always-visible FEN utilities block on
 * ≤767px. Backdrop tap and Escape both close.
 */

interface PositionSheetProps {
  fen: string;
  open: boolean;
  onClose: () => void;
}

export const PositionSheet: React.FC<PositionSheetProps> = ({ fen, open, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const copyFen = async () => {
    try {
      await navigator.clipboard.writeText(fen);
      setCopied(true);
    } catch {
      // Clipboard can be unavailable (permissions); the FEN stays visible to select manually.
    }
  };

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close position tools"
        onClick={onClose}
      />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Position tools">
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.title}>Position</div>
        <div className={styles.fen}>{fen}</div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.action} ${styles.actionPrimary}`}
            onClick={copyFen}
          >
            <Copy size={14} />
            {copied ? 'Copied!' : 'Copy FEN'}
          </button>
          <a
            href={`https://lichess.org/analysis/${fen}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.action}
          >
            Analyse on Lichess
            <ExternalLink size={12} className={styles.externalIcon} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default PositionSheet;
