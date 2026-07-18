import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CommonPlans } from '../CommonPlans';

describe('CommonPlans', () => {
  test('renders plans from props grouped by side', () => {
    render(
      <CommonPlans
        plans={[
          'White: control the center and develop quickly',
          'Black: counterattack on the queenside',
          'Castle early to secure the king',
        ]}
      />
    );

    expect(screen.getByText('Control the center and develop quickly')).toBeInTheDocument();
    expect(screen.getByText('Counterattack on the queenside')).toBeInTheDocument();
    expect(screen.getByText('Castle early to secure the king')).toBeInTheDocument();

    // Side labels for white, black, and shared plans
    expect(screen.getByText('White')).toBeInTheDocument();
    expect(screen.getByText('Black')).toBeInTheDocument();
    expect(screen.getByText('Both')).toBeInTheDocument();
  });

  test('mobileGroups layout groups by side and collapses beyond three plans', async () => {
    const user = userEvent.setup();
    render(
      <CommonPlans
        layout="mobileGroups"
        hideTitle
        plans={[
          'White: develop with tempo',
          'White: build a broad centre',
          'White: press the e-file',
          'White: keep queens on the board',
          'Black: reposition the queen safely',
          'Both sides fight for the open files',
        ]}
      />
    );

    expect(screen.getByText('White')).toBeInTheDocument();
    expect(screen.getByText('Black')).toBeInTheDocument();
    expect(screen.getByText('Both sides')).toBeInTheDocument();

    // Only three White plans visible until expanded
    expect(screen.getByText('Develop with tempo')).toBeInTheDocument();
    expect(screen.queryByText('Keep queens on the board')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show 1 more' }));
    expect(screen.getByText('Keep queens on the board')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText('Keep queens on the board')).not.toBeInTheDocument();
  });

  test('renders nothing when there are no plans', () => {
    const { container } = render(<CommonPlans plans={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('does not fetch — plans come exclusively from the page payload', () => {
    // Guards the provenance fix: the component must never request
    // /api/openings/eco-analysis/:code, which served sibling openings' plans.
    const calls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL) => {
      calls.push(String(input));
      return Promise.resolve(new Response('{}'));
    }) as typeof fetch;

    try {
      render(<CommonPlans plans={['White: push the d-pawn']} />);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toEqual([]);
  });
});
