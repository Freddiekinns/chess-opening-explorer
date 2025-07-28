# Technical Implementation Plan: Enhanced OpeningDetailPage

## 🧪 TDD Implementation Strategy

Following the established TDD workflow from the coding instructions, each improvement will follow:
**RED → GREEN → REFACTOR** with comprehensive testing.

### Phase 1: Core UX Improvements

#### 1.1 Enhanced Chessboard Component

**RED Phase - Write failing tests:**
```typescript
// packages/web/src/components/detail/EnhancedChessboard/EnhancedChessboard.test.tsx
describe('EnhancedChessboard', () => {
  test('should render chessboard with proper size ratio', () => {
    render(<EnhancedChessboard size="large" />);
    const board = screen.getByTestId('enhanced-chessboard');
    expect(board).toHaveClass('chessboard--large');
  });

  test('should handle keyboard navigation for moves', () => {
    const onMoveChange = jest.fn();
    render(<EnhancedChessboard onMoveChange={onMoveChange} />);
    
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onMoveChange).toHaveBeenCalledWith('next');
  });

  test('should highlight current move in move list', () => {
    render(<EnhancedChessboard currentMove={3} moves={mockMoves} />);
    const currentMoveBtn = screen.getByText('Nf3');
    expect(currentMoveBtn).toHaveClass('move-btn--active');
  });
});
```

**GREEN Phase - Implement component:**
```typescript
// packages/web/src/components/detail/EnhancedChessboard/EnhancedChessboard.tsx
interface EnhancedChessboardProps {
  size: 'compact' | 'standard' | 'large';
  moves: string[];
  currentMove: number;
  onMoveChange: (direction: 'prev' | 'next' | number) => void;
  fen: string;
  showCoordinates?: boolean;
}

export const EnhancedChessboard: React.FC<EnhancedChessboardProps> = ({
  size = 'standard',
  moves,
  currentMove,
  onMoveChange,
  fen,
  showCoordinates = true
}) => {
  // Keyboard navigation hook
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          onMoveChange('prev');
          break;
        case 'ArrowRight':
          onMoveChange('next');
          break;
        case 'Home':
          onMoveChange(0);
          break;
        case 'End':
          onMoveChange(moves.length);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMoveChange, moves.length]);

  return (
    <div 
      className={`enhanced-chessboard chessboard--${size}`}
      data-testid="enhanced-chessboard"
    >
      {/* Chessboard component implementation */}
    </div>
  );
};
```

#### 1.2 CSS Architecture & Styling

**Goal**: Establish a scalable and maintainable CSS architecture that separates concerns.

**Strategy**:
- **`packages/web/src/styles/layouts.css`**: This file is dedicated to defining reusable, page-level layout structures. Its primary responsibility is the new `two-column-layout` (60/40 split), ensuring a consistent structural foundation. It should not contain component-specific aesthetics.
- **`packages/web/src/styles/chess-components.css` (New File)**: This new file will be created to house all styles for the new, complex, interactive components planned in the UX overhaul (e.g., `EnhancedChessboard`, `TabbedContent`, `InteractiveStats`). This approach isolates component styles, making them modular and easier to manage.
- **Component Imports**: Components will import only the styles they need, reinforcing the modular structure.

**Implementation Steps**:
1. Create the new `packages/web/src/styles/chess-components.css` file.
2. Ensure `layouts.css` correctly implements the 60/40 grid.
3. As new components are built, their styles will be added to `chess-components.css`.
4. The main `OpeningDetailPage.tsx` will be updated to import these stylesheets, ensuring they are applied correctly.

#### 1.3 Tabbed Content System

**RED Phase - Test tabbed interface:**
```typescript
// packages/web/src/components/detail/TabbedContent/TabbedContent.test.tsx
describe('TabbedContent', () => {
  test('should render all tabs with correct labels', () => {
    const tabs = [
      { id: 'overview', label: 'Overview', content: <div>Overview content</div> },
      { id: 'strategy', label: 'Strategy', content: <div>Strategy content</div> }
    ];
    
    render(<TabbedContent tabs={tabs} defaultTab="overview" />);
    
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Strategy')).toBeInTheDocument();
  });

  test('should show correct content when tab is clicked', () => {
    const tabs = [
      { id: 'overview', label: 'Overview', content: <div>Overview content</div> },
      { id: 'strategy', label: 'Strategy', content: <div>Strategy content</div> }
    ];
    
    render(<TabbedContent tabs={tabs} defaultTab="overview" />);
    
    fireEvent.click(screen.getByText('Strategy'));
    expect(screen.getByText('Strategy content')).toBeInTheDocument();
    expect(screen.queryByText('Overview content')).not.toBeInTheDocument();
  });

  test('should apply active styling to current tab', () => {
    const tabs = [{ id: 'overview', label: 'Overview', content: <div>Content</div> }];
    
    render(<TabbedContent tabs={tabs} defaultTab="overview" />);
    
    const activeTab = screen.getByText('Overview');
    expect(activeTab).toHaveClass('tab-button--active');
  });
});
```

**GREEN Phase - Implement tabbed system:**
```typescript
// packages/web/src/components/detail/TabbedContent/TabbedContent.tsx
interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: string | number;
  icon?: React.ReactNode;
}

interface TabbedContentProps {
  tabs: Tab[];
  defaultTab: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export const TabbedContent: React.FC<TabbedContentProps> = ({
  tabs,
  defaultTab,
  onTabChange,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={`tabbed-content ${className}`}>
      <div className="tab-buttons" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>
      
      <div className="tab-content" role="tabpanel">
        {activeTabContent}
      </div>
    </div>
  );
};
```

#### 1.3 Interactive Statistics Component

**RED Phase - Test enhanced statistics:**
```typescript
// packages/web/src/components/detail/InteractiveStats/InteractiveStats.test.tsx
describe('InteractiveStats', () => {
  const mockStats = {
    white_win_rate: 0.48,
    draw_rate: 0.32,
    black_win_rate: 0.20,
    games_analyzed: 33152,
    avg_rating: 1979
  };

  test('should render animated stat bars with correct widths', () => {
    render(<InteractiveStats stats={mockStats} showAnimations={true} />);
    
    const whiteBar = screen.getByTestId('white-success-bar');
    expect(whiteBar).toHaveStyle('width: 48%');
  });

  test('should show detailed breakdown on hover', () => {
    render(<InteractiveStats stats={mockStats} allowDrilldown={true} />);
    
    const whiteBar = screen.getByTestId('white-success-bar');
    fireEvent.mouseEnter(whiteBar);
    
    expect(screen.getByText('White wins: 48%')).toBeInTheDocument();
    expect(screen.getByText('Based on 33,152 games')).toBeInTheDocument();
  });

  test('should format large numbers properly', () => {
    render(<InteractiveStats stats={mockStats} />);
    
    expect(screen.getByText('33,152')).toBeInTheDocument();
  });
});
```

### Phase 2: Design System Integration

#### 2.1 Enhanced CSS Architecture

**Update design system with chess-specific components:**
```css
/* packages/web/src/styles/chess-components.css */

/* Enhanced Chessboard Styling */
.enhanced-chessboard {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  transition: all var(--transition-base);
}

.chessboard--large {
  max-width: 500px;
  margin: 0 auto;
}

.chessboard--standard {
  max-width: 400px;
  margin: 0 auto;
}

.chessboard--compact {
  max-width: 300px;
  margin: 0 auto;
}

/* Tabbed Content System */
.tabbed-content {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.tab-buttons {
  display: flex;
  background: var(--color-bg-main);
  border-bottom: 1px solid var(--color-border);
}

.tab-button {
  flex: 1;
  padding: var(--space-4) var(--space-6);
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
}

.tab-button--active {
  color: var(--color-brand-orange);
  background: var(--color-bg-surface);
}

.tab-button--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-brand-orange);
}

.tab-content {
  padding: var(--space-6);
}

/* Interactive Statistics */
.interactive-stats {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  border: 1px solid var(--color-border);
}

.stat-bar-container {
  position: relative;
  margin-bottom: var(--space-4);
}

.stat-bar {
  height: 12px;
  background: var(--color-bg-main);
  border-radius: var(--radius-full);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-base);
}

.stat-bar:hover {
  transform: scaleY(1.2);
  box-shadow: var(--shadow-md);
}

.stat-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-bar-fill--white {
  background: linear-gradient(90deg, var(--color-success), var(--color-success-hover));
}

.stat-bar-fill--draw {
  background: linear-gradient(90deg, #ffc107, #ffb300);
}

.stat-bar-fill--black {
  background: linear-gradient(90deg, var(--color-danger), var(--color-danger-hover));
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .enhanced-chessboard {
    padding: var(--space-4);
  }
  
  .chessboard--large,
  .chessboard--standard {
    max-width: 100%;
  }
  
  .tab-button {
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-sm);
  }
}
```

#### 2.2 Component Integration Tests

**Test integration with existing design system:**
```typescript
// packages/web/src/tests/design-system-integration.test.ts
describe('Chess Component Design System Integration', () => {
  test('enhanced chessboard should use design system tokens', () => {
    render(<EnhancedChessboard size="standard" />);
    const board = screen.getByTestId('enhanced-chessboard');
    
    const styles = window.getComputedStyle(board);
    expect(styles.borderRadius).toBe('var(--radius-lg)');
    expect(styles.padding).toBe('var(--space-6)');
  });

  test('tabbed content should follow color system', () => {
    const tabs = [{ id: 'test', label: 'Test', content: <div>Content</div> }];
    render(<TabbedContent tabs={tabs} defaultTab="test" />);
    
    const activeTab = screen.getByText('Test');
    const styles = window.getComputedStyle(activeTab);
    expect(styles.color).toBe('var(--color-brand-orange)');
  });
});
```

### Phase 3: Performance & Accessibility

#### 3.1 Accessibility Enhancements

**Implement WCAG 2.1 AA compliance:**
```typescript
// Accessible chessboard with proper ARIA labels
export const AccessibleChessboard: React.FC<ChessboardProps> = (props) => {
  const [focusedSquare, setFocusedSquare] = useState<string | null>(null);
  
  return (
    <div
      role="grid"
      aria-label={`Chess position: ${props.fen}`}
      aria-describedby="chessboard-description"
      tabIndex={0}
      onKeyDown={handleKeyboardNavigation}
    >
      <div id="chessboard-description" className="sr-only">
        Interactive chess position. Use arrow keys to navigate moves, 
        Space to announce position, Enter to make move.
      </div>
      {/* Board implementation with proper focus management */}
    </div>
  );
};

// Screen reader announcements for move changes
const useMoveAnnouncements = (currentMove: number, moves: string[]) => {
  useEffect(() => {
    if (moves[currentMove]) {
      const announcement = `Move ${currentMove + 1}: ${moves[currentMove]}`;
      announceToScreenReader(announcement);
    }
  }, [currentMove, moves]);
};
```

#### 3.2 Performance Optimization

**Implement lazy loading and code splitting:**
```typescript
// Lazy load heavy components
const EnhancedChessboard = lazy(() => import('./EnhancedChessboard'));
const InteractiveStats = lazy(() => import('./InteractiveStats'));
const VideoPlayer = lazy(() => import('./VideoPlayer'));

// Optimize with React.memo and useMemo
export const OpeningDetailPage = React.memo(() => {
  const memoizedStats = useMemo(() => 
    processStatistics(rawStats), [rawStats]
  );
  
  const memoizedMoves = useMemo(() => 
    parseMoveString(opening.moves), [opening.moves]
  );
  
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      {/* Component implementation */}
    </Suspense>
  );
});
```

## Implementation Order & Dependencies

### Week 1: Foundation (RED → GREEN → REFACTOR)
1. **Enhanced Chessboard Component** - TDD with keyboard navigation tests
2. **Tabbed Content System** - TDD with accessibility tests  
3. **Interactive Statistics** - TDD with animation and hover tests
4. **CSS Design System Integration** - TDD with design token validation

### Week 2: Integration & Polish
1. **Component Integration** - TDD with integration tests
2. **Performance Optimization** - TDD with performance benchmarks
3. **Accessibility Compliance** - TDD with accessibility testing
4. **Mobile Responsive Design** - TDD with viewport tests

### Week 3: Advanced Features
1. **Video Integration** - TDD with sync functionality tests
2. **Advanced Search** - TDD with filtering and sorting tests
3. **Community Features** - TDD with user interaction tests
4. **Analytics Dashboard** - TDD with data visualization tests

## Success Metrics & Validation

### Performance Benchmarks
- [ ] Page load time: <2 seconds
- [ ] Interactive chessboard: <100ms response time
- [ ] Search functionality: <100ms (maintained)
- [ ] Component rendering: <16ms (60fps)

### Accessibility Compliance
- [ ] Keyboard navigation: 100% feature coverage
- [ ] Screen reader support: All content accessible
- [ ] Color contrast: WCAG 2.1 AA compliant
- [ ] Focus management: Logical tab order

### User Experience Metrics
- [ ] Time on page: +40% improvement
- [ ] User comprehension: +60% improvement (via user testing)
- [ ] Mobile usability: 90%+ feature parity
- [ ] Error reduction: <1% user-reported issues
