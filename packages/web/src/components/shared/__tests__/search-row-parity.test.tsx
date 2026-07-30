/**
 * Guard: the blank search state and the typing state draw the same row.
 *
 * They did not. The hub was built on the `--text-*` scale (13px medium names,
 * ECO as inline mono text in a meta line) and the results list on the
 * `--font-size-*` legacy aliases (16px semibold names, ECO as a bordered pill,
 * moves on their own line, a 135deg gradient and a half-pixel lift on hover).
 * Typing a second character therefore changed an opening's size, weight,
 * layout and hover behaviour, on all three surfaces. Surprise me changed from
 * a muted two-line row to brand orange semibold with its hint flung right.
 *
 * Nothing about a row should depend on whether the query is empty, so both
 * states now render `SearchRow` / `SurpriseRow`. This test pins that: it
 * compares the rendered structure of a hub row against a results row, which is
 * the thing that silently drifted for six months.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchBar } from '../SearchBar';

const OPENINGS = [
  {
    fen: 'fen-kings-pawn',
    name: "King's Pawn Game",
    eco: 'C20',
    moves: '1. e4 e5',
    src: 'test',
    games_analyzed: 5000,
  },
];

const RECENT = {
  fen: 'fen-recent',
  name: 'Sicilian Defense',
  eco: 'B20',
  moves: '1. e4 c5',
  viewedAt: Date.now(),
};

/** The shape of a row, independent of which state produced it. */
const describeRow = (row: HTMLElement) => ({
  tag: row.tagName,
  hasName: Boolean(row.querySelector('[class*="rowName"]')),
  hasMoves: Boolean(row.querySelector('[class*="rowMoves"]')),
  hasEcoPill: Boolean(row.querySelector('[class*="rowEco"]')),
});

describe('search row parity between the blank and typing states', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('chess-recent-openings', JSON.stringify([RECENT]));
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    );
  });

  const renderBar = () =>
    render(
      <SearchBar
        variant="landing"
        onSelect={() => {}}
        onSurprise={() => {}}
        openingsData={OPENINGS}
      />
    );

  it('renders the same row structure before and after typing', async () => {
    const user = userEvent.setup();
    renderBar();

    const input = screen.getByRole('textbox');
    await user.click(input);

    const hubRow = (await screen.findByText('Sicilian Defense')).closest('button');
    expect(hubRow).not.toBeNull();
    const hubShape = describeRow(hubRow as HTMLElement);

    await user.type(input, 'pawn');
    await waitFor(() => expect(screen.getByText("King's Pawn Game")).toBeInTheDocument());

    const resultRow = screen.getByText("King's Pawn Game").closest('button');
    expect(resultRow).not.toBeNull();

    expect(describeRow(resultRow as HTMLElement)).toEqual(hubShape);
    // Both are real rows, not a shape that happens to match while empty.
    expect(hubShape).toEqual({ tag: 'BUTTON', hasName: true, hasMoves: true, hasEcoPill: true });
  });

  it('draws one Surprise me, quiet, in both states', async () => {
    const user = userEvent.setup();
    renderBar();

    const input = screen.getByRole('textbox');
    await user.click(input);

    const hubSurprise = (await screen.findByText('Surprise me')).closest('button');
    expect(hubSurprise?.className).toMatch(/row/);
    expect(hubSurprise?.querySelector('[class*="rowHint"]')?.textContent).toBe(
      'Jump to a random opening'
    );

    await user.type(input, 'pawn');
    await waitFor(() => expect(screen.getByText("King's Pawn Game")).toBeInTheDocument());

    const resultsSurprise = screen.getByText('Surprise me').closest('button');
    // Same component, so same classes — the results version used to be brand
    // orange and semibold, louder than the twenty real answers above it.
    expect(resultsSurprise?.className).toBe(hubSurprise?.className);
  });

  it('carries no leading icon, so the name starts in the same place in both states', async () => {
    const user = userEvent.setup();
    renderBar();

    const input = screen.getByRole('textbox');
    await user.click(input);

    // Hub rows used to lead with a clock or a star and results with nothing,
    // which put the opening's name 26px further right before you typed than
    // after. The name being the first child is what keeps the two aligned; an
    // icon reintroduced on one side and not the other would break it silently.
    const hubRow = (await screen.findByText('Sicilian Defense')).closest('button');
    const surprise = screen.getByText('Surprise me').closest('button');
    expect(hubRow?.querySelector('svg')).toBeNull();
    expect(surprise?.querySelector('svg')).toBeNull();

    await user.type(input, 'pawn');
    await waitFor(() => expect(screen.getByText("King's Pawn Game")).toBeInTheDocument());

    const resultRow = screen.getByText("King's Pawn Game").closest('button');
    expect(resultRow?.querySelector('svg')).toBeNull();
    expect(resultRow?.firstElementChild?.className).toBe(hubRow?.firstElementChild?.className);
  });
});
