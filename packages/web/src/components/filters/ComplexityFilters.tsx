import React from 'react';

interface ComplexityFiltersProps {
  selectedComplexity: string | null;
  onComplexityChange: (complexity: string | null) => void;
  className?: string;
}

export const ComplexityFilters: React.FC<ComplexityFiltersProps> = ({
  selectedComplexity,
  onComplexityChange,
  className = '',
}) => {
  const complexityLevels = [
    { id: 'Beginner', label: 'Beginner' },
    { id: 'Intermediate', label: 'Intermediate' },
    { id: 'Advanced', label: 'Advanced' },
  ];

  return (
    // Wrapper carries the mobile right-edge fade (see .filter-scroll) that hints
    // the pill row scrolls sideways; the inner row is the scroll container.
    <div className="filter-scroll">
      <div className={`category-filters ${className}`}>
        <button
          className={`category-btn ${!selectedComplexity ? 'active' : ''}`}
          onClick={() => onComplexityChange(null)}
        >
          All levels
        </button>
        {complexityLevels.map((level) => (
          <button
            key={level.id}
            className={`category-btn ${selectedComplexity === level.id ? 'active' : ''}`}
            onClick={() => onComplexityChange(level.id)}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ComplexityFilters;
