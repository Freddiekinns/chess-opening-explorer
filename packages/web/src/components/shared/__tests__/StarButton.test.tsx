import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StarButton } from '../StarButton';

describe('StarButton', () => {
  it('exposes its saved state to assistive technology', () => {
    const { rerender } = render(<StarButton filled={false} onClick={() => {}} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');

    rerender(<StarButton filled onClick={() => {}} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('has an accessible name that reflects the action', () => {
    render(<StarButton filled={false} onClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Save to repertoire' })).toBeInTheDocument();
  });

  it('does not navigate the card it sits inside', () => {
    const onClick = vi.fn();
    render(
      <a href="/somewhere">
        <StarButton filled={false} onClick={onClick} />
      </a>
    );

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    screen.getByRole('button').dispatchEvent(event);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
