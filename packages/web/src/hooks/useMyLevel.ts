import { useCallback, useEffect, useState } from 'react';
import type { BandId } from '../lib/lichessExplorer';
import { getMyLevel, setMyLevel, MY_LEVEL_CHANGE, STORAGE_KEY } from '../lib/myLevel';
import { trackEvent } from '../lib/analytics';

export type LevelSurface = 'landing' | 'search' | 'detail';

/**
 * The saved "my level", live: every mounted reader (Level Lens, Discover's
 * filter, the search dropdowns) follows the last write, in this tab or
 * another. The setter is the one place a level change is tracked.
 */
export function useMyLevel(): [BandId | null, (band: BandId, surface: LevelSurface) => void] {
  const [band, setBand] = useState<BandId | null>(getMyLevel);

  useEffect(() => {
    const sync = () => setBand(getMyLevel());
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) sync();
    };
    window.addEventListener(MY_LEVEL_CHANGE, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(MY_LEVEL_CHANGE, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const select = useCallback((next: BandId, surface: LevelSurface) => {
    setMyLevel(next);
    trackEvent('band_select', { band: next, surface });
  }, []);

  return [band, select];
}
