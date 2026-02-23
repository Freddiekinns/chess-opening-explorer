import React from 'react';
import { SearchBar, type Opening } from './SearchBar';

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (opening: Opening) => void;
  openingsData: Opening[];
}

export const MobileSearchOverlay: React.FC<MobileSearchOverlayProps> = ({
  isOpen,
  onClose,
  onSelect,
  openingsData,
}) => {
  const closeOverlaySafely = () => {
    // Mobile: dismiss keyboard first to avoid viewport/layout jitter
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement) {
      activeEl.blur();
    }

    onClose();
  };

  const handleSelect = (opening: Opening) => {
    closeOverlaySafely();

    // Force-reset horizontal scroll before route navigation to prevent
    // occasional carryover offset on mobile opening-to-opening transitions.
    window.scrollTo({ top: window.scrollY, left: 0, behavior: 'auto' });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;

    // Give overlay + visual viewport (keyboard) time to settle.
    window.setTimeout(() => {
      onSelect(opening);
    }, 180);
  };

  if (!isOpen) return null;

  return (
    <div className={`mobile-search-overlay ${isOpen ? 'active' : ''}`}>
      <div className="mobile-search-header">
        <h2 className="mobile-search-title">Search Openings</h2>
        <button
          className="mobile-search-close"
          onClick={closeOverlaySafely}
          aria-label="Close search"
        >
          ×
        </button>
      </div>

      <div className="mobile-search-content">
        <SearchBar
          variant="landing"
          onSelect={handleSelect}
          placeholder="Search for any chess opening..."
          openingsData={openingsData}
          autoFocus={true}
        />
      </div>
    </div>
  );
};

export default MobileSearchOverlay;
