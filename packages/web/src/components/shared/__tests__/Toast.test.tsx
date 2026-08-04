import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from '../Toast';

describe('Toast', () => {
  it('announces itself to assistive technology without stealing focus', () => {
    render(<Toast message="Added to your repertoire" />);

    expect(screen.getByRole('status')).toHaveTextContent('Added to your repertoire');
  });

  it('offers Undo when an undo handler is given', async () => {
    const onUndo = vi.fn();
    render(<Toast message="Added to your repertoire" onUndo={onUndo} />);

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('has no Undo button when no handler is given', () => {
    render(<Toast message="Removed from your repertoire" />);

    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });
});
