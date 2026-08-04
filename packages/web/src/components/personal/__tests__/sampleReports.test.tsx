import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PersonalOpeningStats } from '../PersonalOpeningStats';
import { formatSampleDate, loadSampleReport, SAMPLE_REPORTS } from '../sampleReports';
import type { OpeningForLookup } from '../../../../../shared/src';

const getOpeningsData = async (): Promise<OpeningForLookup[]> => [];

const renderComponent = () =>
  render(
    <MemoryRouter>
      <PersonalOpeningStats getOpeningsData={getOpeningsData} />
    </MemoryRouter>
  );

describe('sample reports', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('offers every registered sample by name', () => {
    renderComponent();

    expect(screen.getByText(/See a sample report/)).toBeInTheDocument();
    for (const sample of SAMPLE_REPORTS) {
      expect(screen.getByRole('button', { name: sample.label })).toBeInTheDocument();
    }
  });

  it('loads a real committed fixture, not a placeholder', async () => {
    const report = await loadSampleReport('magnus');

    expect(report.username).toBeTruthy();
    expect(report.dashboard.totalGames).toBeGreaterThan(0);
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('renders the dashboard and says whose games these are and when', async () => {
    const user = userEvent.setup();
    const report = await loadSampleReport('magnus');
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Magnus' }));

    await waitFor(() =>
      expect(screen.getAllByRole('heading', { name: report.username }).length).toBeGreaterThan(0)
    );
    expect(
      screen.getAllByText(new RegExp(`Sample report.*${formatSampleDate(report.generatedAt)}`))
        .length
    ).toBeGreaterThan(0);
  });

  it('never writes a sample into the session cache as if it were your analysis', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Magnus' }));
    await waitFor(() => expect(screen.getAllByText(/Sample report/).length).toBeGreaterThan(0));

    const keys = Object.keys(sessionStorage);
    expect(keys.filter((k) => k.startsWith('personal-openings:v4:'))).toHaveLength(0);
    expect(sessionStorage.getItem('personal-openings:last-analysis-snapshot')).toBeNull();
  });

  it('formats the date for a reader, not a machine', () => {
    expect(formatSampleDate('2026-07-28')).toBe('28 July 2026');
  });
});
