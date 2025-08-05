import React from 'react';

interface ComplexityFiltersProps {
  selectedComplexity: string | null;
  onComplexityChange: (complexity: string | null) => void;
  className?: string;
}

export const ComplexityFilters: React.FC<ComplexityFiltersProps> = ({
  selectedComplexity,
  onComplexityChange,
  className = ''
}) => {
  const complexityLevels = [
    { id: 'Beginner', label: 'Beginner' },
    { id: 'Intermediate', label: 'Intermediate' },
    { id: 'Advanced', label: 'Advanced' }
  ];

  return (
    <div className={`category-filters ${className}`}>
      <button
        className={`category-btn ${!selectedComplexity ? 'active' : ''}`}
        onClick={() => onComplexityChange(null)}
      >
        All Levels
      </button>
      {complexityLevels.map(level => (
        <button
          key={level.id}
          className={`category-btn ${selectedComplexity === level.id ? 'active' : ''}`}
          onClick={() => onComplexityChange(level.id)}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
};

export default ComplexityFilters;
