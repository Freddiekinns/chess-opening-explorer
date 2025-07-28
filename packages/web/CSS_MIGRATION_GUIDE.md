# CSS Design System Migration Guide

## **🎯 Problem Solved**

**Before**: Duplicated button styles across 4+ files, inconsistent variables, conflicting CSS
**After**: Centralized design system, reusable components, TDD-tested architecture

## **📁 New Architecture**

```
packages/web/src/styles/
├── design-system.css     # 🎨 Design tokens & utilities
├── components.css        # 🧩 Reusable UI components  
├── main.css             # 🏗️ Layout & chess-specific components
└── index.css            # 🔄 Entry point + legacy compatibility
```

## **🚀 Quick Start**

### 1. Update Your Imports
```typescript
// OLD: Multiple CSS imports
import './OpeningExplorer.css'
import './OpeningTrainer.css' 
import './Layout.css'

// NEW: Single entry point
import './styles/index.css'
```

### 2. Use Design System Classes

**Buttons** - Replace old button classes:
```html
<!-- OLD -->
<button className="btn-primary">Search</button>
<button className="btn-secondary">Cancel</button>

<!-- NEW -->
<button className="btn btn--primary">Search</button>
<button className="btn btn--secondary">Cancel</button>
```

**Form Inputs** - Consistent styling:
```html
<!-- OLD -->
<input className="search-input" />

<!-- NEW -->
<input className="form-input" />
<input className="form-input form-input--lg" />
```

**Cards** - Unified card components:
```html
<!-- OLD -->
<div className="opening-card">

<!-- NEW -->
<div className="card card--interactive">
```

## **🎨 Design Token Usage**

### Colors
```css
/* Use design tokens instead of hardcoded colors */
.my-component {
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

/* Semantic colors */
.success-state { color: var(--color-success); }
.error-state { color: var(--color-danger); }
```

### Spacing
```css
/* Consistent spacing scale */
.my-component {
  padding: var(--space-4);     /* 16px */
  margin-bottom: var(--space-6); /* 24px */
  gap: var(--space-2);         /* 8px */
}
```

### Typography
```css
/* Typography utilities */
.heading { font-size: var(--font-size-xl); }
.body { font-size: var(--font-size-base); }
.caption { font-size: var(--font-size-sm); }
```

## **📝 Component Migration Examples**

### OpeningExplorer.css → Design System

**Before:**
```css
.btn-primary {
  background-color: #3498db;
  color: white;
  padding: 10px 16px;
  border-radius: 4px;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
  padding: 10px 16px;
  border-radius: 4px;
}
```

**After:**
```typescript
// Use design system classes
<button className="btn btn--primary">Primary Action</button>
<button className="btn btn--secondary">Secondary Action</button>
```

### Form Components

**Before:**
```css
.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #bdc3c7;
  border-radius: 4px;
  font-size: 16px;
}
```

**After:**
```typescript
<input className="form-input form-input--lg" />
```

## **🧪 Testing Your Migration**

Run the TDD tests to validate your changes:

```bash
npm test src/tests/design-system-architecture.test.ts
```

## **📋 Migration Checklist**

### Phase 1: Component Classes ✅
- [x] Design system foundation established
- [x] Component library created 
- [x] TDD tests implemented

### Phase 2: File Migration (In Progress)
- [ ] Migrate `OpeningExplorer.css` → Use `.btn`, `.card`, `.form-input`
- [ ] Migrate `OpeningTrainer.css` → Use design system components
- [ ] Migrate `Layout.css` → Use design system tokens
- [ ] Update all TypeScript components to use new classes

### Phase 3: Cleanup (Upcoming)
- [ ] Remove old CSS files
- [ ] Remove legacy compatibility layer
- [ ] Implement CSS modules for better isolation

## **🎯 Benefits Achieved**

### 🔄 **DRY (Don't Repeat Yourself)**
- **Before**: 4 copies of button styles
- **After**: 1 reusable `.btn` component

### 🎨 **Consistent Design**  
- **Before**: `#3498db` vs `--accent-blue` vs `--brand-orange`
- **After**: Single `--color-brand-orange` token

### 🧪 **TDD-Tested**
- **Before**: No CSS testing
- **After**: Comprehensive test suite validates design tokens

### ⚡ **Better Performance**
- **Before**: Multiple CSS files, duplicated rules
- **After**: Single optimized CSS bundle

### ♿ **Accessibility**
- **Before**: Inconsistent focus states
- **After**: WCAG 2.1 AA compliant focus management

## **🚨 Common Migration Issues**

### Issue: Old button styles not working
```typescript
// ❌ Won't work anymore
<button className="btn-primary">

// ✅ Use new system
<button className="btn btn--primary">
```

### Issue: Colors not matching
```css
/* ❌ Old hardcoded colors */
color: #3498db;

/* ✅ Use design tokens */
color: var(--color-brand-orange);
```

### Issue: Spacing inconsistencies
```css
/* ❌ Magic numbers */
padding: 12px 16px;

/* ✅ Design system spacing */
padding: var(--space-3) var(--space-4);
```

## **🔗 Component Reference**

### Buttons
```html
<button className="btn btn--primary">Primary</button>
<button className="btn btn--secondary">Secondary</button>
<button className="btn btn--success">Success</button>
<button className="btn btn--danger">Danger</button>
<button className="btn btn--outline">Outline</button>
<button className="btn btn--sm">Small</button>
<button className="btn btn--lg">Large</button>
```

### Form Inputs
```html
<input className="form-input" />
<input className="form-input form-input--lg" />
<input className="form-input form-input--sm" />
<select className="form-select"></select>
```

### Cards
```html
<div className="card">Basic card</div>
<div className="card card--interactive">Clickable card</div>
<div className="card card--compact">Compact card</div>
<div className="card card--featured">Featured card</div>
```

### Pills/Tags
```html
<span className="pill">Default</span>
<span className="pill active">Active</span>
<span className="pill pill--eco">ECO Badge</span>
```

### Navigation
```html
<a className="nav-link" href="#">Nav Link</a>
<a className="nav-link active" href="#">Active Link</a>
<button className="tab-button">Tab</button>
<button className="tab-button active">Active Tab</button>
```

## **📚 Next Steps**

1. **Start Migration**: Begin with one component at a time
2. **Test Thoroughly**: Use the provided test suite
3. **Review Design**: Ensure visual consistency 
4. **Performance Check**: Monitor bundle size improvements
5. **Documentation**: Update component documentation

## **🆘 Getting Help**

- Run tests: `npm test design-system`
- Check examples: See `design-system-demo.html`
- Review tokens: Check `design-system.css`
- Ask questions: Reference this migration guide

---

**Migration Status**: Phase 2 - Component Migration In Progress  
**Next Milestone**: Complete OpeningExplorer.css migration
