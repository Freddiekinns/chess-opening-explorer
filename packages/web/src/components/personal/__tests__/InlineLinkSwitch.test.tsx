import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineLinkSwitch } from '../InlineLinkSwitch';

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
] as const;

describe('InlineLinkSwitch', () => {
  test('renders label and all options', () => {
    render(
      <InlineLinkSwitch
        label="VIEW"
        options={options}
        value="a"
        onChange={() => {}}
        ariaLabel="Test"
      />
    );
    expect(screen.getByText('VIEW')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Option A' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Option B' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Option C' })).toBeInTheDocument();
  });

  test('uses radiogroup role on the container', () => {
    render(
      <InlineLinkSwitch
        label="VIEW"
        options={options}
        value="a"
        onChange={() => {}}
        ariaLabel="Test group"
      />
    );
    expect(screen.getByRole('radiogroup', { name: 'Test group' })).toBeInTheDocument();
  });

  test('aria-checked reflects the value prop', () => {
    render(
      <InlineLinkSwitch
        label="VIEW"
        options={options}
        value="b"
        onChange={() => {}}
        ariaLabel="Test"
      />
    );
    expect(screen.getByRole('radio', { name: 'Option A' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByRole('radio', { name: 'Option B' })).toHaveAttribute('aria-checked', 'true');
  });

  test('clicking an option calls onChange with its value', async () => {
    const onChange = vi.fn();
    render(
      <InlineLinkSwitch
        label="VIEW"
        options={options}
        value="a"
        onChange={onChange}
        ariaLabel="Test"
      />
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Option C' }));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  test('clicking the active option does not call onChange', async () => {
    const onChange = vi.fn();
    render(
      <InlineLinkSwitch
        label="VIEW"
        options={options}
        value="a"
        onChange={onChange}
        ariaLabel="Test"
      />
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Option A' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('arrow right moves focus and selection to next option', async () => {
    const onChange = vi.fn();
    render(
      <InlineLinkSwitch
        label="VIEW"
        options={options}
        value="a"
        onChange={onChange}
        ariaLabel="Test"
      />
    );
    const first = screen.getByRole('radio', { name: 'Option A' });
    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  test('arrow left from first wraps to last', async () => {
    const onChange = vi.fn();
    render(
      <InlineLinkSwitch
        label="VIEW"
        options={options}
        value="a"
        onChange={onChange}
        ariaLabel="Test"
      />
    );
    screen.getByRole('radio', { name: 'Option A' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith('c');
  });

  test('home jumps to first, end jumps to last', async () => {
    const onChange = vi.fn();
    render(
      <InlineLinkSwitch
        label="VIEW"
        options={options}
        value="b"
        onChange={onChange}
        ariaLabel="Test"
      />
    );
    screen.getByRole('radio', { name: 'Option B' }).focus();
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('c');
    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('a');
  });
});
