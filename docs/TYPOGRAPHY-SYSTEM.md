# Typography System Design Guide

## 🎯 Overview

This document outlines the comprehensive typography system for the Chess Opening Explorer web application. The system ensures consistency, readability, and visual hierarchy across all components and pages.

## 📐 Typography Scale

### Font Sizes
Our typography uses a modular scale for consistent sizing:

| Class | Variable | Size | Usage |
|-------|----------|------|-------|
| `.text-xs` | `--font-size-xs` | 12px | Fine print, captions |
| `.text-sm` | `--font-size-sm` | 14px | Labels, secondary text |
| `.text-base` | `--font-size-base` | 16px | Body text (default) |
| `.text-md` | `--font-size-md` | 18px | Large body text |
| `.text-lg` | `--font-size-lg` | 20px | Subheadings |
| `.text-xl` | `--font-size-xl` | 24px | Section headers |
| `.text-2xl` | `--font-size-2xl` | 30px | Page headers |
| `.text-3xl` | `--font-size-3xl` | 36px | Main titles |
| `.text-4xl` | `--font-size-4xl` | 48px | Hero titles |

### Font Weights
Clear hierarchy with semantic naming:

| Class | Variable | Weight | Usage |
|-------|----------|--------|-------|
| `.font-light` | `--font-weight-light` | 300 | Decorative text |
| `.font-normal` | `--font-weight-normal` | 400 | Body text |
| `.font-medium` | `--font-weight-medium` | 500 | Emphasis |
| `.font-semibold` | `--font-weight-semibold` | 600 | Subheadings |
| `.font-bold` | `--font-weight-bold` | 700 | Headlines |
| `.font-extrabold` | `--font-weight-extrabold` | 800 | Strong emphasis |

### Line Heights
Optimized for readability:

| Class | Variable | Value | Usage |
|-------|----------|-------|-------|
| `.leading-tight` | `--line-height-tight` | 1.25 | Headlines, titles |
| `.leading-snug` | `--line-height-snug` | 1.375 | Large text |
| `.leading-normal` | `--line-height-normal` | 1.5 | Body text |
| `.leading-relaxed` | `--line-height-relaxed` | 1.625 | Long-form content |
| `.leading-loose` | `--line-height-loose` | 2 | Spaced content |

## 🎨 Color System

### Text Colors
Semantic color naming for consistency:

| Class | Variable | Color | Usage |
|-------|----------|-------|-------|
| `.text-primary` | `--color-text-primary` | #FFFFFF | Main content text |
| `.text-secondary` | `--color-text-secondary` | #A0A0A0 | Supporting text, labels |
| `.text-muted` | `--color-text-muted` | #808080 | Subtle text, fine print |
| `.text-accent` | `--color-text-accent` | #E85D04 | Accent text, links |
| `.text-success` | `--color-text-success` | #28a745 | Success messages |
| `.text-warning` | `--color-text-warning` | #ffc107 | Warning messages |
| `.text-error` | `--color-text-error` | #dc3545 | Error messages |

## 📝 Semantic Typography Classes

### Pre-composed Typography Styles
Use these classes for common text patterns:

#### `.title-hero`
- **Size**: 48px (3rem)
- **Weight**: Bold (700)
- **Line Height**: Tight (1.25)
- **Letter Spacing**: Tight (-0.025em)
- **Usage**: Main landing page title

#### `.title-page`
- **Size**: 36px (2.25rem)
- **Weight**: Bold (700)
- **Line Height**: Tight (1.25)
- **Usage**: Page-level headings

#### `.title-section`
- **Size**: 30px (1.875rem)
- **Weight**: Semibold (600)
- **Line Height**: Snug (1.375)
- **Usage**: Section headings

#### `.title-subsection`
- **Size**: 24px (1.5rem)
- **Weight**: Medium (500)
- **Line Height**: Snug (1.375)
- **Usage**: Subsection headings

#### `.text-body`
- **Size**: 16px (1rem)
- **Weight**: Normal (400)
- **Line Height**: Normal (1.5)
- **Usage**: Standard body text

#### `.text-body-large`
- **Size**: 18px (1.125rem)
- **Weight**: Normal (400)
- **Line Height**: Relaxed (1.625)
- **Usage**: Large body text, intros

#### `.text-label`
- **Size**: 14px (0.875rem)
- **Weight**: Medium (500)
- **Line Height**: Normal (1.5)
- **Color**: Secondary
- **Usage**: Form labels, data labels

#### `.text-caption`
- **Size**: 12px (0.75rem)
- **Weight**: Normal (400)
- **Line Height**: Normal (1.5)
- **Color**: Muted
- **Usage**: Captions, fine print

## 🔧 Implementation Guidelines

### 1. Component Consistency
Always use the typography variables and classes rather than hardcoded values:

```css
/* ✅ Good */
.opening-name {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

/* ❌ Avoid */
.opening-name {
  font-size: 30px;
  font-weight: 700;
  color: #FFFFFF;
}
```

### 2. Semantic Classes First
Use semantic classes when available:

```tsx
// ✅ Good
<h1 className="title-page">Old Indian Defense</h1>
<p className="text-body-large">Master this classical opening...</p>
<span className="text-label">ECO Code:</span>

// ✅ Also acceptable for custom styling
<h2 className="text-xl font-semibold text-primary">Common Plans</h2>
```

### 3. Component-Specific Patterns

#### Opening Cards
```tsx
<h3 className="text-lg font-bold text-primary">
<span className="text-sm font-medium text-secondary">
<span className="text-xs text-muted">
```

#### Page Headers
```tsx
<h1 className="title-page">
<p className="text-body-large text-secondary">
```

#### Data Display
```tsx
<span className="text-label">Games Played:</span>
<span className="text-base font-medium text-primary">
```

## 📱 Responsive Typography

Typography scales appropriately for different screen sizes:

```css
@media (max-width: 768px) {
  .title-hero { font-size: var(--font-size-3xl); }
  .title-page { font-size: var(--font-size-2xl); }
  .title-section { font-size: var(--font-size-xl); }
}
```

## ✅ Migration Checklist

To harmonize existing components:

1. **Replace hardcoded font sizes** with variables
2. **Use semantic color classes** instead of direct color values
3. **Apply consistent line heights** using the scale
4. **Standardize font weights** using the defined scale
5. **Use semantic typography classes** where applicable

## 🎯 Benefits

This typography system provides:

- **Consistency**: Unified visual hierarchy across the app
- **Maintainability**: Easy to update typography globally
- **Accessibility**: Proper contrast and readable line heights
- **Performance**: Reduced CSS bundle size through reuse
- **Developer Experience**: Clear, semantic class names

## 📚 Quick Reference

Most commonly used combinations:
- **Hero title**: `title-hero`
- **Page title**: `title-page`
- **Section heading**: `title-section`
- **Body text**: `text-body`
- **Labels**: `text-label`
- **Captions**: `text-caption`
- **Emphasis**: `text-base font-medium`
- **Subtle text**: `text-sm text-secondary`
