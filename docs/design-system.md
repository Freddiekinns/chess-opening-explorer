# Design System Documentation

*Comprehensive UI/UX design patterns and styling guidelines for the dark-mode interface.*

## **CSS Consolidation Architecture (AD-003)**

### **Single File Strategy**
- **File Location**: `/packages/web/src/styles/simplified.css`
- **Philosophy**: A single, consolidated file provides comprehensive styling for the entire application, ensuring consistency and maintainability.
- **Benefits**: Zero CSS conflicts, a single optimized bundle, consistent theming via CSS variables, and easier maintenance.
- **Coverage**: Complete UI styling, including layout, cards, search, interactive components, and chess-specific elements.

## **Core System: CSS Variables**

All styling is driven by a semantic and scalable set of CSS variables.

### **Color System (Dark Mode)**
```css
:root {
  /* Backgrounds & Surfaces */
  --color-bg-main: #121212;
  --color-bg-surface: #1E1E1E;
  --color-bg-alt: #2A2A2A;

  /* Brand Colors */
  --color-brand-orange: #E85D04;
  --color-brand-orange-hover: #F48C06;

  /* Text Colors (Semantic) */
  --color-text-primary: #FFFFFF;       /* Main content text */
  --color-text-secondary: #A0A0A0;     /* Supporting text, labels */
  --color-text-muted: #808080;         /* Subtle text, fine print */
  --color-text-inverse: #121212;       /* Text on light backgrounds */
  --color-text-accent: #E85D04;        /* Accent text, links */
  --color-text-success: #28a745;       /* Success messages */
  --color-text-warning: #ffc107;       /* Warning messages */
  --color-text-error: #dc3545;         /* Error messages */
  
  /* Borders & Shadows */
  --color-border: #333333;
  --color-border-subtle: rgba(255, 255, 255, 0.1);
  --color-brand-shadow: rgba(232, 93, 4, 0.3);
  --color-shadow-default: rgba(0, 0, 0, 0.1);
  --color-shadow-elevated: rgba(0, 0, 0, 0.2);
}
```

### **Spacing & Layout**
```css
:root {
  /* Spacing Scale */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem;  /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem;    /* 16px */
  --space-6: 1.5rem;  /* 24px */
  --space-8: 2rem;    /* 32px */
  --space-12: 3rem;   /* 48px */

  /* Layout Helpers */
  --border-radius-small: 4px;
  --border-radius-base: 8px;
  --border-radius-large: 12px;
  --transition-base: all 0.2s ease;
  
  /* Common Box Shadows */
  --shadow-sm: 0 1px 3px var(--color-shadow-default);
  --shadow-md: 0 4px 12px var(--color-shadow-default);
  --shadow-lg: 0 6px 20px var(--color-shadow-elevated);
  --shadow-brand: 0 4px 12px var(--color-brand-shadow);
}
```

### **Typography System**
```css
:root {
  /* Font Families */
  --font-family-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --font-family-mono: 'SFMono-Regular', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
  
  /* Font Sizes - Consistent Scale */
  --font-size-xs: 0.75rem;      /* 12px */
  --font-size-sm: 0.875rem;     /* 14px */
  --font-size-base: 1rem;       /* 16px */
  --font-size-md: 1.125rem;     /* 18px */
  --font-size-lg: 1.25rem;      /* 20px */
  --font-size-xl: 1.5rem;       /* 24px */
  --font-size-2xl: 1.875rem;    /* 30px */
  --font-size-3xl: 2.25rem;     /* 36px */
  --font-size-4xl: 3rem;        /* 48px */
  
  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* Line Heights */
  --line-height-tight: 1.25;    /* Headlines */
  --line-height-normal: 1.5;    /* Body text */
  --line-height-relaxed: 1.625; /* Long-form content */
}
```

## **Component Architecture**

### **Button System (BEM)**
A flexible button system using BEM-style modifiers for variants and sizes.

- **Base Class**: `.btn`
- **Variants**: `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--gradient`
- **Sizes**: `.btn--small`, `.btn--large`
- **Special**: `.btn--circular`

```css
/* Base Button Component */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--border-radius-base);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: var(--transition-base);
  border: 1px solid transparent;
}

/* Primary action button */
.btn--primary {
  background-color: var(--color-brand-orange);
  color: white;
  border-color: var(--color-brand-orange);
}

.btn--primary:hover:not(:disabled) {
  background-color: var(--color-brand-orange-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-brand);
}

/* Secondary action button */
.btn--secondary {
  background-color: var(--color-bg-alt);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}
```

### **Layout Components**
- `.two-column-layout`: Main grid for the detail page.
- `.left-column`, `.right-column`: Containers for the two main content areas.
- `.detail-header`: Sticky header for the detail page.

```css
.two-column-layout {
  display: grid;
  grid-template-columns: 45% 55%;
  gap: var(--space-8);
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-4);
}
```

### **Card Components (`.opening-card`)**
Cards are used to display individual chess openings in a grid. They feature hover effects and a clean, structured layout.

```css
.opening-card {
  background-color: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-large);
  padding: var(--space-6);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.opening-card:hover {
  border-color: var(--color-brand-orange);
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  background-color: var(--color-bg-surface);
}
```

### **Search Components**
The search system has variants for the main landing page (`.search-bar-container.landing`) and the header (`.search-bar-container.header`).

```css
.search-input-field {
  flex: 1;
  background-color: var(--color-bg-alt);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-base);
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-base);
}

.search-input-field:focus {
  outline: none;
  border-color: var(--color-brand-orange);
  box-shadow: 0 0 0 2px rgba(232, 93, 4, 0.1);
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-base);
  z-index: 1000;
  max-height: 280px;
  overflow-y: auto;
}
```

### **Chess-Specific Components**
These components are purpose-built for displaying chess information.

- `.chessboard-section`: A container for the interactive chessboard and its controls.
- `.chessboard-fen-utilities`: A section for displaying and copying the FEN string.
- `.opening-moves-list`: A styled list of moves in standard algebraic notation.

```css
.chessboard-section {
  background-color: var(--color-bg-surface);
  border-radius: var(--border-radius-large);
  padding: var(--space-6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.move-btn {
  background-color: var(--color-bg-alt);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-small);
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
}

.move-btn.active {
  background-color: var(--color-brand-orange);
  border-color: var(--color-brand-orange);
  color: white;
}
```

### **Data Visualization**
- `.statistics-component`: A container for game statistics.
- `.stat-bar`: A flexible bar for visualizing win/draw/loss percentages.
- `.segmented-bar`: A three-part bar used on opening cards.

```css
.bar-container {
  flex: 1;
  height: 14px;
  background: var(--color-bg-alt);
  border-radius: var(--border-radius-base);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--border-radius-base);
  transition: width 0.8s ease-out;
}

.bar-fill.white-bar { background-color: #4ECDC4; }
.bar-fill.draw-bar  { background-color: #FFA726; }
.bar-fill.black-bar { background-color: #FF7043; }
```

---

*This documentation is a living document and should be updated to reflect any changes in `simplified.css`.*
