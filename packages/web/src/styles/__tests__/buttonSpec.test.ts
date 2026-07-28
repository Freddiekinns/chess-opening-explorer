import { describe, it, expect } from 'vitest';
import { readWebSource } from '../../test/readSource';

/**
 * The one button spec (UX review change 24): primary is filled
 * --color-brand-orange with --color-text-inverse text; transparent with an
 * orange outline is the *secondary* treatment.
 *
 * These live in a stylesheet test because Vitest proxies CSS module class
 * names — nothing rendered can observe a background colour. They exist
 * because Practice is drawn twice, once per breakpoint, in two different
 * files: phase 0 changed the global rule and the mobile copy in the page
 * module kept the old outline styling for five more phases, leaving the
 * product's most valuable action weaker than pagination on the breakpoint
 * the review cared most about.
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

describe('one button spec — Practice is primary on both breakpoints', () => {
  it('fills the desktop Practice button with the brand colour', () => {
    const rule = ruleBody(readWebSource('src/styles/simplified.css'), '.practice-toggle-btn');

    expect(rule).toMatch(/background-color:\s*var\(--color-brand-orange\)/);
    expect(rule).toMatch(/color:\s*var\(--color-text-inverse\)/);
  });

  it('fills the mobile Practice button with the brand colour', () => {
    const rule = ruleBody(
      readWebSource('src/pages/OpeningDetailPage.module.css'),
      '.mobilePracticeBtn'
    );

    expect(rule).toMatch(/background:\s*var\(--color-brand-orange\)/);
    expect(rule).toMatch(/color:\s*var\(--color-text-inverse\)/);
  });

  it('keeps Load more tertiary, so pagination cannot out-rank Practice', () => {
    const rule = ruleBody(readWebSource('src/styles/simplified.css'), '.load-more-btn');

    expect(rule).not.toMatch(/--color-brand-orange/);
  });
});
