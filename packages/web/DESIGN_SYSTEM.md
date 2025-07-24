# **Design System: Frontend Components and UI/UX Standards**

## **Purpose**
This document defines the design system, component patterns, and UI/UX standards for the Chess Opening Explorer frontend. It serves as the authoritative source for all frontend development decisions and ensures consistency across the application.

**Reference from:** `copilot-instructions.md` → **Frontend development tasks must consult this file**

---

## **🎨 Design Principles**

### **Visual Identity**
- **Modern Chess Aesthetic**: Clean, professional interface that appeals to chess players
- **Dark Theme First**: Primary design built for dark mode with light theme as alternative
- **Information Density**: Balanced information presentation without overwhelming users
- **Performance-First UI**: Prioritize speed and responsiveness over visual complexity
- **Accessibility**: WCAG 2.1 AA compliance for inclusive design

### **User Experience Principles**
- **Instant Feedback**: Sub-100ms interactions, zero-lag search experience
- **Progressive Disclosure**: Show essential information first, details on demand
- **Keyboard Navigation**: Full keyboard accessibility for power users
- **Mobile Responsive**: Seamless experience across all device sizes
- **Error Prevention**: Guide users toward success, prevent mistakes where possible

---

## **🎯 Color Palette**

### **Primary Colors**
```css
:root {
  /* Background Colors */
  --bg-dark: #1a1a1a;              /* Main application background */
  --panel-dark: #282828;           /* Primary container/panel background */
  --content-dark: #3a3a3a;         /* Input fields, interactive elements */
  --hover-dark: #4a4a4a;           /* Hover states for dark elements */
  
  /* Text Colors */
  --text-primary: #e0e0e0;         /* Main readable text */
  --text-secondary: #999999;       /* Less important text, labels */
  --text-muted: #666666;           /* Placeholder text, disabled states */
  --text-inverse: #1a1a1a;         /* Text on light backgrounds */
  
  /* Accent Colors */
  --accent-blue: #007bff;          /* Primary links, call-to-action */
  --accent-green: #28a745;         /* Success states, confirmation actions */
  --accent-red: #dc3545;           /* Error states, destructive actions */
  --accent-yellow: #ffc107;        /* Warning states, attention */
  --accent-orange: #fd7e14;        /* Opening popularity indicators */
  
  /* Chess-Specific Colors */
  --chess-white: #f0d9b5;          /* Light chess squares */
  --chess-black: #b58863;          /* Dark chess squares */
  --chess-highlight: #ffff00;      /* Move highlighting */
  --chess-selection: #00ff00;      /* Selected piece/square */
}
```

### **Semantic Color Usage**
```css
/* Status Colors */
.success { color: var(--accent-green); }
.error { color: var(--accent-red); }
.warning { color: var(--accent-yellow); }
.info { color: var(--accent-blue); }

/* Interactive States */
.clickable:hover { background-color: var(--hover-dark); }
.active { background-color: var(--accent-blue); color: white; }
.disabled { color: var(--text-muted); opacity: 0.6; }
```

---

## **📝 Typography**

### **Font Stack**
```css
:root {
  /* Primary Font Family */
  --font-primary: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  
  /* Monospace Font (for PGN notation, code) */
  --font-mono: 'Roboto Mono', 'Monaco', 'Consolas', 'Courier New', monospace;
  
  /* Font Sizes */
  --font-xs: 0.75rem;    /* 12px - Small labels, metadata */
  --font-sm: 0.875rem;   /* 14px - Secondary text */
  --font-base: 1rem;     /* 16px - Body text */
  --font-lg: 1.125rem;   /* 18px - Prominent text */
  --font-xl: 1.25rem;    /* 20px - Small headings */
  --font-2xl: 1.5rem;    /* 24px - Section headings */
  --font-3xl: 1.875rem;  /* 30px - Page headings */
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### **Typography Scale**
```tsx
// Typography Components
const Heading1 = styled.h1`
  font-size: var(--font-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  color: var(--text-primary);
  margin-bottom: 1rem;
`;

const Heading2 = styled.h2`
  font-size: var(--font-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  color: var(--text-primary);
  margin-bottom: 0.75rem;
`;

const BodyText = styled.p`
  font-size: var(--font-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
  color: var(--text-primary);
  margin-bottom: 1rem;
`;

const Caption = styled.span`
  font-size: var(--font-sm);
  font-weight: var(--font-normal);
  color: var(--text-secondary);
`;

const PgnNotation = styled.span`
  font-family: var(--font-mono);
  font-size: var(--font-sm);
  background-color: var(--content-dark);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
`;
```

---

## **🧩 Core Components**

### **Layout Components**

#### **ContentPanel**
```tsx
interface ContentPanelProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const ContentPanel = styled.div<ContentPanelProps>`
  background-color: var(--panel-dark);
  border-radius: 8px;
  padding: ${props => {
    switch (props.padding) {
      case 'none': return '0';
      case 'sm': return '0.75rem';
      case 'md': return '1.5rem';
      case 'lg': return '2rem';
      default: return '1rem';
    }
  }};
  
  /* Subtle border for definition */
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  /* Smooth transitions */
  transition: all 0.2s ease;
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }
`;

// Usage
<ContentPanel padding="md">
  <Heading2>Opening Details</Heading2>
  <BodyText>Sicilian Defense: Accelerated Dragon</BodyText>
</ContentPanel>
```

#### **SearchContainer**
```tsx
const SearchContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  
  @media (max-width: 768px) {
    max-width: 100%;
    margin: 0 1rem;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem 1.5rem;
  font-size: var(--font-lg);
  background-color: var(--content-dark);
  border: 2px solid transparent;
  border-radius: 8px;
  color: var(--text-primary);
  
  &::placeholder {
    color: var(--text-muted);
  }
  
  &:focus {
    outline: none;
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  
  &:hover {
    background-color: var(--hover-dark);
  }
`;
```

### **Interactive Components**

#### **Button System**
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  font-family: var(--font-primary);
  font-weight: var(--font-medium);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  /* Size variants */
  ${props => {
    switch (props.size) {
      case 'sm': return `
        padding: 0.5rem 1rem;
        font-size: var(--font-sm);
      `;
      case 'lg': return `
        padding: 1rem 2rem;
        font-size: var(--font-lg);
      `;
      default: return `
        padding: 0.75rem 1.5rem;
        font-size: var(--font-base);
      `;
    }
  }}
  
  /* Color variants */
  ${props => {
    switch (props.variant) {
      case 'primary': return `
        background-color: var(--accent-blue);
        color: white;
        &:hover { background-color: #0056b3; transform: translateY(-1px); }
      `;
      case 'success': return `
        background-color: var(--accent-green);
        color: white;
        &:hover { background-color: #1e7e34; transform: translateY(-1px); }
      `;
      case 'danger': return `
        background-color: var(--accent-red);
        color: white;
        &:hover { background-color: #c82333; transform: translateY(-1px); }
      `;
      default: return `
        background-color: var(--content-dark);
        color: var(--text-primary);
        &:hover { background-color: var(--hover-dark); transform: translateY(-1px); }
      `;
    }
  }}
  
  /* States */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
  
  ${props => props.fullWidth && 'width: 100%;'}
`;

// Loading Button Component
const LoadingButton: React.FC<ButtonProps & { children: React.ReactNode }> = ({
  loading,
  children,
  ...props
}) => (
  <Button {...props} disabled={loading || props.disabled}>
    {loading && <Spinner size="sm" />}
    {children}
  </Button>
);
```

#### **Tag System**
```tsx
interface TagProps {
  variant?: 'eco' | 'popularity' | 'category' | 'difficulty';
  size?: 'sm' | 'md';
}

const Tag = styled.span<TagProps>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  
  font-size: ${props => props.size === 'sm' ? 'var(--font-xs)' : 'var(--font-sm)'};
  font-weight: var(--font-medium);
  padding: ${props => props.size === 'sm' ? '0.125rem 0.5rem' : '0.25rem 0.75rem'};
  border-radius: 12px;
  
  /* Variant colors */
  ${props => {
    switch (props.variant) {
      case 'eco': return `
        background-color: rgba(0, 123, 255, 0.1);
        color: var(--accent-blue);
        border: 1px solid rgba(0, 123, 255, 0.3);
      `;
      case 'popularity': return `
        background-color: rgba(253, 126, 20, 0.1);
        color: var(--accent-orange);
        border: 1px solid rgba(253, 126, 20, 0.3);
      `;
      case 'category': return `
        background-color: rgba(40, 167, 69, 0.1);
        color: var(--accent-green);
        border: 1px solid rgba(40, 167, 69, 0.3);
      `;
      default: return `
        background-color: var(--content-dark);
        color: var(--text-secondary);
        border: 1px solid rgba(255, 255, 255, 0.1);
      `;
    }
  }}
`;

// Usage Examples
<Tag variant="eco" size="sm">A00</Tag>
<Tag variant="popularity">Popular</Tag>
<Tag variant="category">Aggressive</Tag>
```

---

## **📱 Responsive Design**

### **Breakpoint System**
```css
:root {
  --breakpoint-sm: 640px;   /* Small tablets, large phones */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Small desktops */
  --breakpoint-xl: 1280px;  /* Large desktops */
}
```

### **Layout Patterns**

#### **Two-Column Detail Layout**
```tsx
const DetailLayout = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }
`;

const MainContent = styled.div`
  min-width: 0; /* Prevent grid blowout */
`;

const Sidebar = styled.div`
  @media (max-width: 768px) {
    order: -1; /* Move sidebar above main content on mobile */
  }
`;
```

#### **Responsive Card Grid**
```tsx
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;
```

---

## **🎭 Animation and Transitions**

### **Transition Standards**
```css
:root {
  /* Transition Durations */
  --transition-fast: 0.15s;
  --transition-normal: 0.2s;
  --transition-slow: 0.3s;
  
  /* Easing Functions */
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0.0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* Common Transition Classes */
.transition-all { transition: all var(--transition-normal) var(--ease-out); }
.transition-colors { transition: color var(--transition-fast) var(--ease-out), background-color var(--transition-fast) var(--ease-out); }
.transition-transform { transition: transform var(--transition-normal) var(--ease-out); }
```

### **Loading States**
```tsx
const Spinner = styled.div<{ size?: 'sm' | 'md' | 'lg' }>`
  display: inline-block;
  width: ${props => {
    switch (props.size) {
      case 'sm': return '1rem';
      case 'lg': return '2rem';
      default: return '1.5rem';
    }
  }};
  height: ${props => {
    switch (props.size) {
      case 'sm': return '1rem';
      case 'lg': return '2rem';
      default: return '1.5rem';
    }
  }};
  border: 2px solid var(--text-muted);
  border-radius: 50%;
  border-top-color: var(--accent-blue);
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const SkeletonLoader = styled.div`
  background: linear-gradient(90deg, var(--content-dark) 25%, var(--hover-dark) 50%, var(--content-dark) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
  
  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
```

---

## **♿ Accessibility Standards**

### **Focus Management**
```css
/* Focus Ring System */
.focus-ring {
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    border-color: var(--accent-blue);
  }
  
  &:focus:not(:focus-visible) {
    box-shadow: none;
    border-color: transparent;
  }
}

/* Skip Link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--accent-blue);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  
  &:focus {
    top: 6px;
  }
}
```

### **ARIA Patterns**
```tsx
// Search Results with Accessibility
const SearchResults: React.FC<{ results: Opening[]; query: string }> = ({ results, query }) => (
  <div
    role="region"
    aria-label={`Search results for "${query}"`}
    aria-live="polite"
  >
    <div
      role="status"
      aria-label={`${results.length} results found`}
      className="sr-only"
    >
      {results.length} results found for {query}
    </div>
    
    <ul role="list">
      {results.map((opening, index) => (
        <li key={opening.fen} role="listitem">
          <OpeningCard
            opening={opening}
            aria-label={`Opening ${index + 1} of ${results.length}: ${opening.name}`}
          />
        </li>
      ))}
    </ul>
  </div>
);

// Keyboard Navigation
const useKeyboardNavigation = (items: any[], onSelect: (item: any) => void) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          if (selectedIndex >= 0) {
            onSelect(items[selectedIndex]);
          }
          break;
        case 'Escape':
          setSelectedIndex(-1);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onSelect]);
  
  return selectedIndex;
};
```

---

## **🎯 Performance Optimization**

### **Code Splitting**
```tsx
// Lazy load heavy components
const OpeningAnalysis = React.lazy(() => import('./OpeningAnalysis'));
const VideoCarousel = React.lazy(() => import('./VideoCarousel'));
const ChessBoard = React.lazy(() => import('./ChessBoard'));

// Preload critical components
const HomePage = React.lazy(() => 
  import('./HomePage').then(module => {
    // Preload next likely pages
    import('./OpeningDetail');
    return module;
  })
);
```

### **Image Optimization**
```tsx
const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
}> = ({ src, alt, width, height, priority = false }) => {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div className="image-container" style={{ width, height }}>
      {!loaded && <SkeletonLoader style={{ width, height }} />}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
};
```

---

## **📋 Component Usage Guidelines**

### **Do's and Don'ts**

#### **✅ Do's**
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<section>`)
- Implement proper ARIA attributes for screen readers
- Test components with keyboard navigation
- Use consistent spacing and sizing from the design system
- Optimize for performance with React.memo and useMemo when appropriate
- Follow the established color palette and typography scale
- Implement loading states for all async operations

#### **❌ Don'ts**
- Don't use div elements where semantic elements exist
- Don't hardcode colors or fonts outside the design system
- Don't implement custom animations without considering accessibility
- Don't forget focus management in modal dialogs and dropdowns
- Don't skip error states and edge cases in component design
- Don't ignore mobile-first responsive design principles

### **Component Testing Standards**
```tsx
// Test component accessibility and behavior
describe('OpeningCard Component', () => {
  it('should be keyboard accessible', async () => {
    render(<OpeningCard opening={mockOpening} />);
    
    const card = screen.getByRole('button');
    card.focus();
    
    // Test keyboard navigation
    fireEvent.keyDown(card, { key: 'Enter' });
    
    expect(mockOnClick).toHaveBeenCalled();
  });
  
  it('should have proper ARIA attributes', () => {
    render(<OpeningCard opening={mockOpening} />);
    
    const card = screen.getByRole('button');
    
    expect(card).toHaveAttribute('aria-label');
    expect(card).toHaveAttribute('tabIndex', '0');
  });
  
  it('should display loading state correctly', () => {
    render(<OpeningCard opening={mockOpening} loading={true} />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

---

*Last Updated: 2025-07-23*
*Referenced by: copilot-instructions.md, frontend development workflows*
