import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  buildOpeningsMap,
  lookupOpeningFromPGN,
  OpeningForLookup,
  PGNLookupResult,
} from '../../../../shared/src';

interface PGNInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpeningFound: (fen: string) => void;
  openingsData: OpeningForLookup[];
}

export const PGNInputModal: React.FC<PGNInputModalProps> = ({
  isOpen,
  onClose,
  onOpeningFound,
  openingsData,
}) => {
  const [pgnText, setPgnText] = useState('');
  const [result, setResult] = useState<PGNLookupResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Build openings map once when data changes
  const openingsMap = useMemo(() => {
    return buildOpeningsMap(openingsData);
  }, [openingsData]);

  // Handle keyboard events and focus trap
  useEffect(() => {
    if (isOpen) {
      lastFocusedRef.current = document.activeElement as HTMLElement;

      // Focus textarea after modal opens
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
        if (e.key === 'Tab') {
          handleTabKey(e);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        lastFocusedRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPgnText('');
      setResult(null);
      setIsSearching(false);
    }
  }, [isOpen]);

  const handleTabKey = (e: KeyboardEvent) => {
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else if (document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  };

  const handleFindOpening = useCallback(() => {
    if (!pgnText.trim() || openingsMap.size === 0) return;

    setIsSearching(true);
    setResult(null);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const lookupResult = lookupOpeningFromPGN(pgnText, openingsMap);
      setResult(lookupResult);
      setIsSearching(false);
    }, 10);
  }, [pgnText, openingsMap]);

  const handleGoToOpening = useCallback(() => {
    if (result?.bestMatch?.fen) {
      onOpeningFound(result.bestMatch.fen);
      onClose();
    }
  }, [result, onOpeningFound, onClose]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPgnText(e.target.value);
    // Clear previous result when text changes
    if (result) {
      setResult(null);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const canSearch = pgnText.trim().length > 0 && openingsMap.size > 0;
  const hasMatch = result?.success && result.bestMatch;

  return (
    <div className="pgn-modal-overlay" role="presentation" onClick={handleOverlayClick}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pgn-modal-title"
        className="pgn-modal"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="pgn-modal-header">
          <h2 id="pgn-modal-title">Find opening from PGN</h2>
          <button onClick={onClose} className="pgn-modal-close-btn" aria-label="Close modal">
            ×
          </button>
        </div>

        <div className="pgn-modal-body">
          <p className="pgn-modal-instructions">
            Paste a PGN game or move sequence to identify the opening.
          </p>

          <textarea
            ref={textareaRef}
            className="pgn-textarea"
            value={pgnText}
            onChange={handleTextareaChange}
            placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4..."
            aria-label="PGN input"
            rows={8}
          />

          <button
            className="pgn-find-btn"
            onClick={handleFindOpening}
            disabled={!canSearch || isSearching}
          >
            {isSearching ? 'Searching...' : 'Find Opening'}
          </button>

          {result && (
            <div
              className={`pgn-result ${
                hasMatch
                  ? result.bestMatch?.isExactEndMatch
                    ? 'pgn-result-success'
                    : 'pgn-result-partial'
                  : 'pgn-result-error'
              }`}
              role="status"
              aria-live="polite"
            >
              {hasMatch ? (
                <>
                  <div className="pgn-result-opening">
                    <span className="pgn-result-eco">{result.bestMatch?.eco}</span>
                    <span className="pgn-result-name">{result.bestMatch?.name}</span>
                  </div>
                  <div className="pgn-result-details">
                    {result.bestMatch?.isExactEndMatch ? (
                      <span>Exact match at move {result.bestMatch.matchedAtMove}</span>
                    ) : (
                      <span>
                        Last known opening at move {result.bestMatch?.matchedAtMove} of{' '}
                        {result.totalMoves}
                      </span>
                    )}
                  </div>
                  <button className="pgn-go-btn" onClick={handleGoToOpening}>
                    Go to Opening
                  </button>
                </>
              ) : (
                <div className="pgn-result-error-message">
                  {result.error || 'No matching opening found in the database.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PGNInputModal;
