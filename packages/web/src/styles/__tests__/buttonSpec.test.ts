import { describe, it, expect } from 'vitest';
import { readWebSource } from '../../test/readSource';

/**
 * The button tiers: primary is filled --color-brand-orange on
 * --color-text-inverse; accent-outline is transparent with an orange border and
 * orange label; secondary is the grey --btn--secondary.
 *
 * Practice is **accent-outline** on both breakpoints. It was filled primary
 * until 2026-07-30 — the spec argued from implementation completeness, which is
 * a different question from how much of the page's attention the feature has
 * earned. That one is the product owner's call, and the answer is not yet. See
 * §3.4 of the UX-review spec before promoting it back.
 *
 * These live in a stylesheet test because Vitest proxies CSS module class names
 * — nothing rendered can observe a background colour. The durable reason they
 * exist is that Practice is drawn twice, once per breakpoint, in two different
 * files, and it has drifted across them twice: once on fill (phase 0 changed the
 * global rule and the mobile copy kept the old styling for five phases) and once
 * on type size (11px desktop against 13px mobile, unnoticed for longer). The
 * tests below assert the two halves *agree*, not merely that each is right.
 */

/**
 * The rule where `selector` stands alone at the start of a line. Anchored,
 * because simplified.css also carries `.chessboard-navigation
 * .practice-toggle-btn` — a higher-specificity positioning rule that an
 * unanchored search finds first.
 */
const ruleBody = (css: string, selector: string): string => {
  const match = new RegExp(`^\\${selector} \\{`, 'm').exec(css);
  expect(match, `${selector} not found`).not.toBeNull();
  const start = match!.index;
  return css.slice(start, css.indexOf('}', start));
};

const desktopRule = () =>
  ruleBody(readWebSource('src/styles/simplified.css'), '.practice-toggle-btn');

const mobileRule = () =>
  ruleBody(readWebSource('src/pages/OpeningDetailPage.module.css'), '.mobilePracticeBtn');

describe('button tiers — Practice is accent-outline on both breakpoints', () => {
  it('draws the desktop Practice button as an orange outline, not a fill', () => {
    const rule = desktopRule();

    expect(rule).toMatch(/background-color:\s*transparent/);
    expect(rule).toMatch(/border:\s*1px solid var\(--accent-a50\)/);
    expect(rule).toMatch(/color:\s*var\(--color-brand-orange\)/);
    // The filled primary treatment, explicitly not this one.
    expect(rule).not.toMatch(/--color-text-inverse/);
  });

  it('draws the mobile Practice button the same way', () => {
    const rule = mobileRule();

    expect(rule).toMatch(/background:\s*transparent/);
    expect(rule).toMatch(/border:\s*1px solid var\(--accent-a50\)/);
    expect(rule).toMatch(/color:\s*var\(--color-brand-orange\)/);
    expect(rule).not.toMatch(/--color-text-inverse/);
  });

  it('sizes the label identically on both breakpoints', () => {
    // Desktop said --text-2xs and mobile --text-sm for the same control, which
    // is how the desktop button ended up 11px of text inside 24px of padding.
    const sizeOf = (rule: string) => /font-size:\s*(var\(--[\w-]+\))/.exec(rule)?.[1];

    expect(sizeOf(desktopRule())).toBe('var(--text-sm)');
    expect(sizeOf(mobileRule())).toBe(sizeOf(desktopRule()));
  });

  it('keeps Load more below Practice: no brand colour on pagination', () => {
    const rule = ruleBody(readWebSource('src/styles/simplified.css'), '.load-more-btn');

    expect(rule).not.toMatch(/--color-brand-orange/);
  });
});
