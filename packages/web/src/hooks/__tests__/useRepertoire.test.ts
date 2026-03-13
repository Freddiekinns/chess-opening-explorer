import { renderHook, act } from '@testing-library/react';
import { useRepertoire } from '../useRepertoire';

const STORAGE_KEY = 'chess-repertoire';

const sicilian = {
  fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  name: 'Sicilian Defense',
  eco: 'B20',
  moves: '1. e4 c5',
};
const french = {
  fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  name: 'French Defense',
  eco: 'C00',
  moves: '1. e4 e6',
};

beforeEach(() => {
  localStorage.clear();
});

describe('useRepertoire', () => {
  it('starts empty when localStorage is empty', () => {
    const { result } = renderHook(() => useRepertoire());
    expect(result.current.repertoire).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('loads existing entries from localStorage', () => {
    const entries = [{ ...sicilian, savedAt: 1000 }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    const { result } = renderHook(() => useRepertoire());
    expect(result.current.count).toBe(1);
    expect(result.current.repertoire[0].name).toBe('Sicilian Defense');
  });

  it('toggle adds an opening', () => {
    const { result } = renderHook(() => useRepertoire());

    act(() => result.current.toggle(sicilian));

    expect(result.current.count).toBe(1);
    expect(result.current.isSaved(sicilian.fen)).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(1);
  });

  it('toggle removes an existing opening', () => {
    const { result } = renderHook(() => useRepertoire());

    act(() => result.current.toggle(sicilian));
    expect(result.current.count).toBe(1);

    act(() => result.current.toggle(sicilian));
    expect(result.current.count).toBe(0);
    expect(result.current.isSaved(sicilian.fen)).toBe(false);
  });

  it('remove removes by fen', () => {
    const { result } = renderHook(() => useRepertoire());

    act(() => result.current.toggle(sicilian));
    act(() => result.current.toggle(french));
    expect(result.current.count).toBe(2);

    act(() => result.current.remove(sicilian.fen));
    expect(result.current.count).toBe(1);
    expect(result.current.isSaved(sicilian.fen)).toBe(false);
    expect(result.current.isSaved(french.fen)).toBe(true);
  });

  it('sorts by savedAt descending (newest first)', () => {
    const { result } = renderHook(() => useRepertoire());

    act(() => result.current.toggle(sicilian));
    act(() => result.current.toggle(french));

    expect(result.current.repertoire[0].name).toBe('French Defense');
    expect(result.current.repertoire[1].name).toBe('Sicilian Defense');
  });

  it('isSaved returns false for unsaved fen', () => {
    const { result } = renderHook(() => useRepertoire());
    expect(result.current.isSaved('some-random-fen')).toBe(false);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json');
    const { result } = renderHook(() => useRepertoire());
    expect(result.current.repertoire).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('syncs across tabs via storage event', () => {
    const { result } = renderHook(() => useRepertoire());

    const entries = [{ ...sicilian, savedAt: Date.now() }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify(entries),
        })
      );
    });

    expect(result.current.count).toBe(1);
    expect(result.current.isSaved(sicilian.fen)).toBe(true);
  });

  it('ignores storage events for other keys', () => {
    const { result } = renderHook(() => useRepertoire());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'some-other-key',
          newValue: 'whatever',
        })
      );
    });

    expect(result.current.count).toBe(0);
  });
});
