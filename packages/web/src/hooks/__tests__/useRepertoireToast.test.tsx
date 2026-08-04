import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRepertoireToast } from '../useRepertoireToast';

const opening = {
  fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  name: 'Sicilian Defence',
  eco: 'B20',
  moves: '1. e4 c5',
};

describe('useRepertoireToast', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves and raises a toast naming the destination', () => {
    const { result } = renderHook(() => useRepertoireToast());

    act(() => result.current.toggleWithToast(opening));

    expect(result.current.isSaved(opening.fen)).toBe(true);
    expect(result.current.toast?.message).toBe('Added to your repertoire');
  });

  it('undo restores the previous state', () => {
    const { result } = renderHook(() => useRepertoireToast());

    act(() => result.current.toggleWithToast(opening));
    act(() => result.current.toast!.onUndo());

    expect(result.current.isSaved(opening.fen)).toBe(false);
    expect(result.current.toast).toBeNull();
  });

  it('undo after a removal puts the opening back', () => {
    const { result } = renderHook(() => useRepertoireToast());

    act(() => result.current.toggleWithToast(opening));
    act(() => result.current.toggleWithToast(opening));
    expect(result.current.isSaved(opening.fen)).toBe(false);

    act(() => result.current.toast!.onUndo());

    expect(result.current.isSaved(opening.fen)).toBe(true);
  });

  it('reports removal in the second person', () => {
    const { result } = renderHook(() => useRepertoireToast());

    act(() => result.current.toggleWithToast(opening));
    act(() => result.current.toggleWithToast(opening));

    expect(result.current.toast?.message).toBe('Removed from your repertoire');
  });

  it('dismisses itself after 4 seconds', () => {
    const { result } = renderHook(() => useRepertoireToast());

    act(() => result.current.toggleWithToast(opening));
    act(() => vi.advanceTimersByTime(4000));

    expect(result.current.toast).toBeNull();
  });
});
