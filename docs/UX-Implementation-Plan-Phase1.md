# OpeningDetailPage UX Implementation Plan - Phase 1

## 1. Enhanced Chessboard Experience

### Current Issues:
- Board feels cramped in 45% column width
- Navigation controls are basic and unintuitive
- Move list formatting is hard to scan
- FEN display takes too much visual space

### Improvements:
```typescript
// Enhanced board container with better proportions
interface EnhancedChessboardProps {
  size: 'compact' | 'standard' | 'large';
  showCoordinates: boolean;
  highlightLastMove: boolean;
  orientation: 'white' | 'black';
}

// Smart move navigation with keyboard shortcuts
interface MoveNavigationProps {
  currentMove: number;
  totalMoves: number;
  onMoveChange: (move: number) => void;
  keyboardShortcuts: boolean;
  showMoveTime?: boolean;
}
```

### Implementation:
1. **Optimize layout balance**: Adopt a `55/45` split (55% board, 45% info) that gives the chessboard appropriate prominence while maximizing space for rich educational content and analysis.
2. **Utilize whitespace**: Intentionally use negative space to guide focus and reduce cognitive load.
3. **Enhanced board controls**: Circular progress indicator for move position with smooth transitions.
4. **Keyboard navigation**: Arrow keys, Home/End for move navigation.
5. **Move list redesign**: Compact, scannable format with active state highlighting and hover previews.
6. **Micro-interactions**: Subtle animations and hover states that connect board positions to related information in the right column.

## 2. Smart Information Architecture

### Current Issues:
- All content blocks compete for attention
- No clear reading/learning flow
- Important information buried in text walls

### Improvements:
```typescript
interface TabularContentProps {
  defaultTab: 'overview' | 'strategy' | 'analysis' | 'videos';
  tabs: ContentTab[];
  onTabChange: (tab: string) => void;
}

interface ContentTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: number | string;
}
```

### Implementation:
1. **Tabbed right column**: Overview, Strategy, Analysis, Videos
2. **Priority content first**: Most essential info in Overview tab
3. **Clear visual organization**: Each tab contains related content grouped logically

## 3. Visual Hierarchy Enhancement

### Current Issues:
- All sections have same visual weight
- Poor contrast and typography hierarchy
- Inconsistent spacing and component styling

### Improvements:
1. **Typography scale**: Clear heading hierarchy (H1 → H4)
2. **Visual weight**: Primary actions get stronger visual emphasis
3. **Color coding**: Consistent use of brand orange for interactive elements
4. **Spacing system**: Consistent vertical rhythm and component spacing

## CSS Implementation Pattern:
```css
/* Enhanced visual hierarchy */
.detail-page-primary {
  /* Highest priority content */
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  border: 2px solid var(--color-brand-orange);
}

.detail-page-secondary {
  /* Supporting content */
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.detail-page-tertiary {
  /* Background content */
  color: var(--color-text-tertiary);
  background: var(--color-bg-surface);
}

/* Improved spacing and layout */
.two-column-layout {
  display: grid;
  grid-template-columns: 55fr 45fr;
  gap: var(--space-6);
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-6);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .two-column-layout {
    grid-template-columns: 1fr;
    gap: var(--space-4);
    padding: var(--space-4);
  }
}
```
