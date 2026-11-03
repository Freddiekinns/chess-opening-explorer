/**
 * Practice used to record only its start, so a session that practised for ten
 * minutes looked the same in PostHog as one that left at once.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import OpeningDetailPage from '../OpeningDetailPage';
import { trackEvent } from '../../lib/analytics';
import { mockOpeningDataSimple } from '../../test/fixtures/openingData';

vi.mock('../../lib/analytics', () => ({ trackEvent: vi.fn() }));

type DropHandler = (move: { sourceSquare: string; targetSquare: string }) => boolean;
let onPieceDrop: DropHandler | undefined;
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: { onPieceDrop?: DropHandler } }) => {
    onPieceDrop = options.onPieceDrop;
    return <div data-testid="board" />;
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const italian = {
  ...mockOpeningDataSimple,
  name: 'Italian Game',
  eco: 'C50',
  moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
};

const respond = (data: unknown) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });

async function openPractice() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[`/opening/${encodeURIComponent(italian.fen)}`]}>
        <Routes>
          <Route path="/opening/:fen" element={<OpeningDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  });
  await waitFor(() => expect(screen.getByText('Italian Game')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Practice'));
  await waitFor(() => expect(screen.getByText('Playing as:')).toBeInTheDocument());
}

async function play(from: string, to: string, expectedCounter: RegExp) {
  act(() => {
    onPieceDrop?.({ sourceSquare: from, targetSquare: to });
  });
  await waitFor(() => expect(screen.getAllByText(expectedCounter).length).toBeGreaterThan(0));
}

const calls = (event: string) => vi.mocked(trackEvent).mock.calls.filter(([e]) => e === event);

describe('Practice analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) =>
      respond(
        url.includes('/api/openings/page/')
          ? {
              success: true,
              data: {
                opening: italian,
                stats: null,
                videos: [],
                courses: { courses: [], searchLinks: null },
                tree: null,
              },
            }
          : { success: true, data: [] }
      )
    );
  });

  test('a finished line records practice_complete with its length', async () => {
    await openPractice();
    await play('e2', 'e4', /Move 2 of 3/);
    await play('g1', 'f3', /Move 3 of 3/);
    await play('f1', 'c4', /Complete!/);

    expect(calls('practice_complete')).toEqual([['practice_complete', { moves: 5 }]]);
  });

  test('leaving mid-line records practice_abandon with how far it got', async () => {
    await openPractice();
    await play('e2', 'e4', /Move 2 of 3/);
    fireEvent.click(screen.getAllByText('Exit')[0]);

    expect(calls('practice_abandon')).toEqual([['practice_abandon', { moves: 2, of: 5 }]]);
    expect(calls('practice_complete')).toEqual([]);
  });

  test('exiting after the line is finished is not an abandonment', async () => {
    await openPractice();
    await play('e2', 'e4', /Move 2 of 3/);
    await play('g1', 'f3', /Move 3 of 3/);
    await play('f1', 'c4', /Complete!/);
    fireEvent.click(screen.getAllByText('Exit')[0]);

    expect(calls('practice_abandon')).toEqual([]);
  });
});
