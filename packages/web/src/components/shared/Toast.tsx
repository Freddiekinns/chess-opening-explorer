import React from 'react';
import { Star } from 'lucide-react';
import styles from './Toast.module.css';

export interface ToastProps {
  message: string;
  /** Renders an "Undo" button when provided. */
  onUndo?: () => void;
  /** Star glyph before the message. */
  showStar?: boolean;
}

/**
 * Floating confirmation above the mobile tab bar. Presentational only — the
 * caller owns the dismiss timer (see useRepertoireToast), so a toast can be
 * held open or replaced without this component tracking state.
 */
export const Toast: React.FC<ToastProps> = ({ message, onUndo, showStar = true }) => (
  <div className={styles.toast} role="status">
    {showStar && <Star size={13} className={styles.star} aria-hidden="true" />}
    <span className={styles.message}>{message}</span>
    {onUndo && (
      <button type="button" className={styles.undo} onClick={onUndo}>
        Undo
      </button>
    )}
  </div>
);

export default Toast;
