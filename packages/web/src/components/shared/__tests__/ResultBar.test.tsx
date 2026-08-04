import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultBar } from '../ResultBar';

describe('ResultBar', () => {
  it('names each segment so the bar needs no legend', () => {
    render(<ResultBar stats={{ white: 31, draw: 39, black: 30 }} />);

    expect(screen.getByText('White 31%')).toBeInTheDocument();
    expect(screen.getByText('Draw 39%')).toBeInTheDocument();
    expect(screen.getByText('Black 30%')).toBeInTheDocument();
  });

  it('renders nothing when stats are absent rather than inventing numbers', () => {
    const { container } = render(<ResultBar stats={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('sizes each segment to its percentage', () => {
    const { container } = render(<ResultBar stats={{ white: 50, draw: 20, black: 30 }} />);
    const segments = container.querySelectorAll('[data-segment]');

    expect(segments).toHaveLength(3);
    expect(segments[0]).toHaveStyle({ width: '50%' });
    expect(segments[1]).toHaveStyle({ width: '20%' });
    expect(segments[2]).toHaveStyle({ width: '30%' });
  });

  it('can render the bar without labels', () => {
    render(<ResultBar stats={{ white: 31, draw: 39, black: 30 }} hideLabels />);

    expect(screen.queryByText('White 31%')).not.toBeInTheDocument();
  });
});
