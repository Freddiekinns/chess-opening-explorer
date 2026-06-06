import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DistributionBar } from '../DistributionBar';

describe('DistributionBar', () => {
  test('renders nothing when there are no games', () => {
    const { container } = render(<DistributionBar win={0} draw={0} loss={0} games={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders win/draw/loss percentages rounded to whole numbers', () => {
    render(<DistributionBar win={7} draw={1} loss={6} games={14} />);
    expect(screen.getByText('50%')).toBeInTheDocument(); // 7/14
    expect(screen.getByText('7%')).toBeInTheDocument(); // 1/14 ≈ 7.14
    expect(screen.getByText('43%')).toBeInTheDocument(); // 6/14 ≈ 42.86
  });

  test('shows raw counts inside segments that are wide enough', () => {
    render(<DistributionBar win={7} draw={1} loss={6} games={14} />);
    // win 50% and loss 43% clear the 14% threshold → counts shown
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    // draw 7% is below the threshold → its count is suppressed
    expect(screen.queryByText('1')).toBeNull();
  });

  test('omits all counts when showCounts is false but keeps percentages', () => {
    render(<DistributionBar win={7} draw={1} loss={6} games={14} showCounts={false} />);
    expect(screen.queryByText('7')).toBeNull();
    expect(screen.queryByText('6')).toBeNull();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('omits a segment entirely when its value is zero', () => {
    const { container } = render(<DistributionBar win={4} draw={0} loss={0} games={4} />);
    const segments = container.querySelectorAll('[style*="width"]');
    expect(segments).toHaveLength(1);
    expect((segments[0] as HTMLElement).style.width).toBe('100%');
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getAllByText('0%')).toHaveLength(2);
  });

  test('sets segment widths proportional to results', () => {
    const { container } = render(<DistributionBar win={5} draw={3} loss={2} games={10} />);
    const widths = [...container.querySelectorAll('[style*="width"]')].map(
      (el) => (el as HTMLElement).style.width
    );
    expect(widths).toEqual(['50%', '30%', '20%']);
  });

  test('applies the compact modifier class when compact is set', () => {
    const { container } = render(<DistributionBar win={5} draw={3} loss={2} games={10} compact />);
    expect(container.querySelector('[class*="compact"]')).not.toBeNull();
  });
});
