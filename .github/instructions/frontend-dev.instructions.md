---
applyTo: "packages/web/**/*.{ts,tsx,js,jsx}"
---

# Frontend Development: Simple & Clean

*React/TypeScript patterns focused on functionality and maintainability.*

## 🎯 React Component Essentials
```typescript
// ✅ Simple, clear component structure
interface Props {
  title: string;
  onClick: () => void;
}

export const Button: React.FC<Props> = ({ title, onClick }) => {
  return (
    <button className="button" onClick={onClick}>
      {title}
    </button>
  );
};
```

## 🎨 CSS Strategy (Simplified Approach)
- **Single CSS file**: `simplified.css` contains all styles
- **CSS variables**: Use for colors, spacing, typography
- **Minimal selectors**: Avoid complex nested rules
- **Component-based**: One CSS class per component concept

## 🧪 Testing Approach
```typescript
// ✅ Test behavior, not implementation
import { render, screen, fireEvent } from '@testing-library/react';

test('button calls onClick when clicked', () => {
  const handleClick = jest.fn();
  render(<Button title="Click me" onClick={handleClick} />);
  
  fireEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalled();
});
```

## ⚡ Performance Guidelines
- **Bundle size**: Import only what you need
- **API calls**: Mock external dependencies in tests
- **State management**: Keep it simple, use built-in React state
- **File organization**: Group related components together

## ❌ Frontend Anti-Patterns
- **Prop drilling** - Pass props through many component levels
- **Inline styles** - Use CSS classes instead for consistency
- **Complex component logic** - Break large components into smaller ones
- **Missing key props** - Always provide keys for list items
- **Unmocked API calls** in tests
- **CSS-in-JS overuse** - Prefer simplified.css approach
- Component render tests: <100ms
- User interaction tests: <200ms
- Mock all API calls and external dependencies

### **React-Specific Anti-Patterns**
- ❌ Testing implementation details (state, props directly)
- ❌ Snapshot testing for dynamic content
- ❌ Not mocking external APIs in component tests
- ❌ Testing styling details instead of behavior

### **File Patterns This Applies To**
- `packages/web/**/*.{ts,tsx,jsx}` (React frontend)
- `packages/web/**/*.test.{ts,tsx,jsx}` (Frontend test files)
- `packages/shared/**/*.ts` (Shared TypeScript utilities)
