import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionToolbar } from '../SectionToolbar';

describe('SectionToolbar', () => {
  test('renders ORDER label with three options', () => {
    render(<SectionToolbar value="frequency" onChange={() => {}} ariaLabel="Order white" />);
    expect(screen.getByText('ORDER')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Most played' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Highest win rate' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Lowest win rate' })).toBeInTheDocument();
  });

  test('default highlight is Most played', () => {
    render(<SectionToolbar value="frequency" onChange={() => {}} ariaLabel="Order white" />);
    expect(screen.getByRole('radio', { name: 'Most played' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test('selecting an option calls onChange with its mode', async () => {
    const onChange = vi.fn();
    render(<SectionToolbar value="frequency" onChange={onChange} ariaLabel="Order white" />);
    await userEvent.click(screen.getByRole('radio', { name: 'Highest win rate' }));
    expect(onChange).toHaveBeenCalledWith('best');
  });

  test('two SectionToolbars maintain independent state', async () => {
    const onWhite = vi.fn();
    const onBlack = vi.fn();
    render(
      <>
        <SectionToolbar value="frequency" onChange={onWhite} ariaLabel="Order white" />
        <SectionToolbar value="best" onChange={onBlack} ariaLabel="Order black" />
      </>
    );
    const whiteFreq = screen.getByRole('radiogroup', { name: 'Order white' });
    const blackBest = screen.getByRole('radiogroup', { name: 'Order black' });
    expect(whiteFreq.querySelector('[aria-checked="true"]')?.textContent).toBe('Most played');
    expect(blackBest.querySelector('[aria-checked="true"]')?.textContent).toBe('Highest win rate');
  });
});
