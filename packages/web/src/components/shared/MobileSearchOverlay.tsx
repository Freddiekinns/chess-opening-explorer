import React from 'react';
import { SearchBar } from './SearchBar';

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (opening: any) => void;
  openingsData: any[];
}

export const MobileSearchOverlay: React.FC<MobileSearchOverlayProps> = ({
  isOpen,
  onClose,
  onSelect,
  openingsData
}) => {
  const handleSelect = (opening: any) => {
    onSelect(opening);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`mobile-search-overlay ${isOpen ? 'active' : ''}`}>
      <div className="mobile-search-header">
        <h2 className="mobile-search-title">Search Openings</h2>
        <button 
          className="mobile-search-close" 
          onClick={onClose}
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
