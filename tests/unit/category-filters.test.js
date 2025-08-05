import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryFilters } from '../../packages/web/src/components/search/CategoryFilters';

describe('CategoryFilters UX Improvements', () => {
  const mockProps = {
    selectedCategories: ['most-popular'],
    onCategoryToggle: jest.fn(),
    onClearFilters: jest.fn(),
    resultCount: 12377
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Three-Column Layout', () => {
    it('should render three category groups with proper structure', () => {
      render(<CategoryFilters {...mockProps} />);
      
      // Check for group titles
      expect(screen.getByText('Skill Level')).toBeInTheDocument();
      expect(screen.getByText('Playing Style')).toBeInTheDocument();
      expect(screen.getByText('Approach')).toBeInTheDocument();
    });

    it('should display improved category names', () => {
      render(<CategoryFilters {...mockProps} />);
      
      // Check for chess-accurate naming
      expect(screen.getByText('Beginner')).toBeInTheDocument();
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('Attacking')).toBeInTheDocument();
      expect(screen.getByText('Positional')).toBeInTheDocument();
      expect(screen.getByText('Solid')).toBeInTheDocument();
      expect(screen.getByText('Dynamic')).toBeInTheDocument();
      expect(screen.getByText('Classical')).toBeInTheDocument();
      expect(screen.getByText('Hypermodern')).toBeInTheDocument();
    });
  });

  describe('Header Improvements', () => {
    it('should show "Find Your Opening Style" title', () => {
      render(<CategoryFilters {...mockProps} />);
      expect(screen.getByText('Find Your Opening Style')).toBeInTheDocument();
    });

    it('should show "Show All Popular" button as primary action', () => {
      render(<CategoryFilters {...mockProps} />);
      const showAllBtn = screen.getByText('Show All Popular');
      expect(showAllBtn).toBeInTheDocument();
      expect(showAllBtn).toHaveClass('btn--primary');
    });

    it('should call onClearFilters when "Show All Popular" is clicked', () => {
      render(<CategoryFilters {...mockProps} />);
      const showAllBtn = screen.getByText('Show All Popular');
      fireEvent.click(showAllBtn);
      expect(mockProps.onClearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Results Summary', () => {
    it('should display result count with proper formatting', () => {
      render(<CategoryFilters {...mockProps} />);
      expect(screen.getByText(/Currently Showing: Most Popular \(12,377 openings\)/)).toBeInTheDocument();
    });

    it('should display selected category names in summary', () => {
      const propsWithSelected = {
        ...mockProps,
        selectedCategories: ['attacking'],
        resultCount: 6864
      };
      render(<CategoryFilters {...propsWithSelected} />);
      expect(screen.getByText(/Currently Showing: Attacking \(6,864 openings\)/)).toBeInTheDocument();
    });

    it('should display multiple selected categories', () => {
      const propsWithMultiple = {
        ...mockProps,
        selectedCategories: ['attacking', 'advanced'],
        resultCount: 2134
      };
      render(<CategoryFilters {...propsWithMultiple} />);
      expect(screen.getByText(/Currently Showing: Attacking, Advanced \(2,134 openings\)/)).toBeInTheDocument();
    });
  });

  describe('Category Selection Behavior', () => {
    it('should handle skill level category selection', () => {
      render(<CategoryFilters {...mockProps} />);
      const beginnerBtn = screen.getByText('Beginner');
      fireEvent.click(beginnerBtn);
      expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('beginner-friendly');
    });

    it('should handle intermediate category selection', () => {
      render(<CategoryFilters {...mockProps} />);
      const intermediateBtn = screen.getByText('Intermediate');
      fireEvent.click(intermediateBtn);
      expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('intermediate');
    });

    it('should handle playing style category selection', () => {
      render(<CategoryFilters {...mockProps} />);
      const attackingBtn = screen.getByText('Attacking');
      fireEvent.click(attackingBtn);
      expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('attacking');
    });

    it('should handle approach category selection', () => {
      render(<CategoryFilters {...mockProps} />);
      const classicalBtn = screen.getByText('Classical');
      fireEvent.click(classicalBtn);
      expect(mockProps.onCategoryToggle).toHaveBeenCalledWith('classical');
    });
  });

  describe('Visual States', () => {
    it('should highlight selected categories with active class', () => {
      const propsWithSelected = {
        ...mockProps,
        selectedCategories: ['attacking', 'advanced']
      };
      render(<CategoryFilters {...propsWithSelected} />);
      
      const attackingBtn = screen.getByText('Attacking');
      const advancedBtn = screen.getByText('Advanced');
      const beginnerBtn = screen.getByText('Beginner');
      
      expect(attackingBtn).toHaveClass('active');
      expect(advancedBtn).toHaveClass('active');
      expect(beginnerBtn).not.toHaveClass('active');
    });

    it('should show primary state for Show All Popular when most-popular is selected', () => {
      render(<CategoryFilters {...mockProps} />);
      const showAllBtn = screen.getByText('Show All Popular');
      expect(showAllBtn).toHaveClass('btn--primary');
    });

    it('should show secondary state for Show All Popular when other categories are selected', () => {
      const propsWithOther = {
        ...mockProps,
        selectedCategories: ['attacking']
      };
      render(<CategoryFilters {...propsWithOther} />);
      const showAllBtn = screen.getByText('Show All Popular');
      expect(showAllBtn).toHaveClass('btn--secondary');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure with headings', () => {
      render(<CategoryFilters {...mockProps} />);
      
      // Main title should be h3
      const mainTitle = screen.getByRole('heading', { level: 3 });
      expect(mainTitle).toHaveTextContent('Find Your Opening Style');
      
      // Group titles should be h4
      const groupTitles = screen.getAllByRole('heading', { level: 4 });
      expect(groupTitles).toHaveLength(3);
      expect(groupTitles[0]).toHaveTextContent('Skill Level');
      expect(groupTitles[1]).toHaveTextContent('Playing Style');
      expect(groupTitles[2]).toHaveTextContent('Approach');
    });

    it('should have clickable buttons for all categories', () => {
      render(<CategoryFilters {...mockProps} />);
      
      // All category buttons should be clickable
      const categoryButtons = screen.getAllByRole('button').filter(btn => 
        !btn.textContent.includes('Show All Popular')
      );
      
      expect(categoryButtons).toHaveLength(9); // 3 skill + 4 style + 2 approach
      categoryButtons.forEach(btn => {
        expect(btn).toBeEnabled();
      });
    });
  });
});
