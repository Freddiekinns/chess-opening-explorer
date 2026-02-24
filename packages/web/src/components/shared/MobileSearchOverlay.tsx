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
  const handleSelect = (opening: Opening) => {
    onClose();
    requestAnimationFrame(() => {
      onSelect(opening);
    });
  };

  if (!isOpen) return null;

  return (
    <div className={`mobile-search-overlay ${isOpen ? 'active' : ''}`}>
      <div className="mobile-search-header">
        <h2 className="mobile-search-title">Search Openings</h2>
        <button className="mobile-search-close" onClick={onClose} aria-label="Close search">
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
