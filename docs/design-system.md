# Design System Documentation

*Comprehensive UI/UX design patterns and styling guidelines*

## **CSS Consolidation Architecture (AD-003)**

### **Single File Strategy**
- **File Location**: `/packages/web/src/styles/simplified.css` (2,100+ lines)
- **Philosophy**: Single consolidated file with comprehensive styling
- **Benefits**: Zero conflicts, single bundle, consistent theming, easier maintenance
- **Coverage**: Complete UI styling including chess board, game statistics, forms, buttons, navigation

### **CSS Variables System**
```css
/* Primary Brand Colors */
:root {
  --color-orange: #ff8c00;        /* Primary brand color */
  --color-dark-blue: #2c3e50;     /* Primary text */
  --color-gray: #6c757d;          /* Secondary text */
  --color-light-gray: #f8f9fa;    /* Background surfaces */
  --color-white: #ffffff;         /* Main background */
  
  /* Game Statistics Colors */
  --color-wins: #4caf50;          /* Green for wins */
  --color-draws: #ffc107;         /* Yellow for draws */
  --color-losses: #f44336;        /* Red for losses */
  
  /* Status Colors */
  --color-success: #28a745;
  --color-danger: #dc3545;
  --color-warning: #ffc107;
  --color-info: #17a2b8;
  
  /* Layout Variables */
  --container-max-width: 1200px;
  --border-radius: 8px;
  --box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  --transition: all 0.3s ease;
}
```

## **Component Architecture**

### **Layout Components**
```css
/* Header Navigation */
.header {
  background: var(--color-white);
  border-bottom: 1px solid var(--color-light-gray);
  position: sticky;
  top: 0;
  z-index: 100;
}

/* Footer */
.footer {
  background: var(--color-dark-blue);
  color: var(--color-white);
  text-align: center;
  padding: 2rem 0;
}

/* Container System */
.container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 1rem;
}
```

### **Interactive Components**
```css
/* Button System */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius);
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  transition: var(--transition);
  font-weight: 500;
}

.btn-primary {
  background: var(--color-orange);
  color: var(--color-white);
}

.btn-primary:hover {
  background: #e67e00;
  transform: translateY(-2px);
}

/* Form Elements */
.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--color-light-gray);
  border-radius: var(--border-radius);
  font-size: 1rem;
  transition: var(--transition);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-orange);
  box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.1);
}
```

### **Chess-Specific Components**
```css
/* Chess Board */
.chess-board {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  aspect-ratio: 1;
  border: 2px solid var(--color-dark-blue);
  border-radius: var(--border-radius);
  overflow: hidden;
}

/* Responsive Chess Board Scaling */
@media (max-width: 768px) {
  .chess-board {
    transform: scale(0.8);
  }
}

@media (max-width: 480px) {
  .chess-board {
    transform: scale(0.7);
  }
}

/* Game Statistics Bars */
.game-stats-bar {
  height: 20px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-light-gray);
  display: flex;
}

.stats-wins {
  background: var(--color-wins);
}

.stats-draws {
  background: var(--color-draws);
}

.stats-losses {
  background: var(--color-losses);
}
```

## **Responsive Design System**

### **Breakpoint Strategy**
```css
/* Mobile First Approach */
.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

/* Tablet */
@media (min-width: 768px) {
  .grid-md-2 {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .grid-lg-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .grid-lg-4 {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Large Desktop */
@media (min-width: 1200px) {
  .container {
    padding: 0 2rem;
  }
}
```

### **Typography System**
```css
/* Typography Scale */
h1 { font-size: 2.5rem; font-weight: 700; line-height: 1.2; }
h2 { font-size: 2rem; font-weight: 600; line-height: 1.3; }
h3 { font-size: 1.5rem; font-weight: 600; line-height: 1.4; }
h4 { font-size: 1.25rem; font-weight: 500; line-height: 1.5; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-dark-blue);
}

/* Responsive Typography */
@media (max-width: 768px) {
  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }
}
```

## **Component-Specific Patterns**

### **Search Components**
```css
/* Search Bar Variants */
.search-hero {
  /* Landing page hero search */
  max-width: 600px;
  margin: 0 auto;
}

.search-header {
  /* Sticky header search */
  max-width: 400px;
}

.search-inline {
  /* Inline overlay search */
  position: relative;
  z-index: 50;
}

/* Autocomplete Dropdown */
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-white);
  border: 1px solid var(--color-light-gray);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}
```

### **Card Components**
```css
/* Opening Cards */
.opening-card {
  background: var(--color-white);
  border: 1px solid var(--color-light-gray);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  transition: var(--transition);
  cursor: pointer;
}

.opening-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  border-color: var(--color-orange);
}

/* Video Cards */
.video-card {
  background: var(--color-white);
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--box-shadow);
  transition: var(--transition);
}

.video-thumbnail {
  aspect-ratio: 16/9;
  object-fit: cover;
  width: 100%;
}
```

## **Animation & Interaction Patterns**

### **Hover Effects**
```css
/* Subtle Hover Animations */
.hover-lift:hover {
  transform: translateY(-2px);
  transition: var(--transition);
}

.hover-scale:hover {
  transform: scale(1.05);
  transition: var(--transition);
}

/* Focus States */
.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.3);
}
```

### **Loading States**
```css
/* Loading Spinner */
.spinner {
  border: 3px solid var(--color-light-gray);
  border-top: 3px solid var(--color-orange);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

## **Accessibility Patterns**

### **Focus Management**
```css
/* Skip Links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--color-dark-blue);
  color: var(--color-white);
  padding: 8px;
  text-decoration: none;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}

/* High Contrast Mode Support */
@media (prefers-contrast: high) {
  .btn {
    border: 2px solid currentColor;
  }
}
```

### **Screen Reader Support**
```css
/* Visually Hidden */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

*For quick reference, see: memory_bank.md*
