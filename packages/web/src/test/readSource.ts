import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read a source file by its path relative to `packages/web`.
 *
 * Some rules can only be checked by reading the stylesheet: Vitest proxies
 * CSS module class names and stubs `?raw`, so nothing rendered in a test can
 * observe a colour, a source order or a text-transform. Those guards resolve
 * their own path, and `process.cwd()` alone is not enough — it is
 * `packages/web` under `npm run test:frontend` but the repo root when vitest
 * is invoked from there, and the guard would then fail for the wrong reason.
 */
export function readWebSource(relativePath: string): string {
  const candidates = [
    join(process.cwd(), relativePath),
    join(process.cwd(), 'packages/web', relativePath),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`readWebSource: ${relativePath} not found from ${process.cwd()}`);
  }

  return readFileSync(found, 'utf8');
}
