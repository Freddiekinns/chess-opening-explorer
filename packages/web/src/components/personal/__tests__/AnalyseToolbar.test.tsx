import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyseToolbar } from '../AnalyseToolbar';

describe('AnalyseToolbar', () => {
  test('renders VIEW label and Variation/Family options', () => {
    render(<AnalyseToolbar value="variation" onChange={() => {}} />);
    expect(screen.getByText('VIEW')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Variation' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Family' })).toBeInTheDocument();
  });

  test('aria-checked reflects current view', () => {
    render(<AnalyseToolbar value="family" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Family' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Variation' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  test('clicking a different option calls onChange', async () => {
    const onChange = vi.fn();
    render(<AnalyseToolbar value="variation" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Family' }));
    expect(onChange).toHaveBeenCalledWith('family');
  });
});
