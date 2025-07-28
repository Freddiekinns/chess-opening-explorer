# OpeningDetailPage UX Implementation Plan - Phase 2

## 4. Mobile-First Responsive Design

### Current Issues:
- Two-column layout breaks on mobile
- Touch targets too small for mobile interaction
- Chessboard navigation awkward on touch devices

### Mobile UX Improvements:
1. **Single column layout** on mobile with tab-based navigation
2. **Large touch targets** (minimum 44px) for all interactive elements
3. **Improved mobile chessboard** with better touch controls
4. **Prioritized Content Order**: Chessboard appears first, then tabbed content below

### Implementation:
```css
/* Mobile-optimized layout */
@media (max-width: 768px) {
  .two-column-layout {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .mobile-tab-button {
    min-height: 44px;
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-base);
  }
  
  .chessboard-controls button {
    min-width: 44px;
    min-height: 44px;
  }
}
```

## 5. Basic Accessibility Improvements

### Current Gaps:
- Poor keyboard navigation
- Missing basic labels
- Insufficient focus indicators

### Simple Accessibility Fixes:
```html
<!-- Basic accessibility -->
<button aria-label="Next move" tabindex="0">→</button>
<div role="tabpanel" aria-labelledby="overview-tab">
  <!-- Tab content -->
</div>
```

### Implementation:
1. **Keyboard navigation**: Arrow keys work for move navigation
2. **Basic labels**: Add aria-label to buttons and interactive elements
3. **Focus indicators**: Clear visual focus states
4. **Tab order**: Logical navigation sequence

## 6. Simple Loading States

### Current Issues:
- No loading feedback while data loads
- Jarring content shifts when data arrives

### Basic Loading Experience:
```typescript
interface SimpleLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
}

const SimpleLoader = ({ isLoading, children }: SimpleLoadingProps) => (
  isLoading ? <div className="loading-spinner" /> : children
);
```

### Implementation:
1. **Spinner during load**: Simple loading indicator while opening data loads
2. **Graceful content reveal**: Smooth transition when content appears
3. **Preserve layout**: Avoid layout shifts during loading
