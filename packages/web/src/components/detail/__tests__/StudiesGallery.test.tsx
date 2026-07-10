import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import StudiesGallery, { Study } from '../StudiesGallery';

const study = (over: Partial<Study> = {}): Study => ({
  study_title: 'The Complete Najdorf',
  chapter_title: 'Main line',
  study_url: 'https://lichess.org/study/abc',
  chapter_url: 'https://lichess.org/study/abc/def',
  author: 'gm_test',
  platform: 'Lichess',
  likes: 1234,
  chapters_matched: 7,
  curated: true,
  match: { score: 90, depth: 10, reason: 'covers-position' },
  discovered_at: '2026-07-10T00:00:00.000Z',
  ...over,
});

describe('StudiesGallery', () => {
  test('renders one card per study with clean title, author and chapter count', () => {
    render(<StudiesGallery studies={[study()]} openingName="Sicilian: Najdorf" />);
    expect(screen.getByText('The Complete Najdorf')).toBeInTheDocument();
    expect(screen.getByText(/gm_test/)).toBeInTheDocument();
    expect(screen.getByText(/7 chapters/)).toBeInTheDocument();
  });

  test('shows the match-reason badge', () => {
    render(<StudiesGallery studies={[study()]} openingName="x" />);
    expect(screen.getByText('Covers this variation')).toBeInTheDocument();
  });

  test('line-context studies get the deeper-lines badge', () => {
    render(
      <StudiesGallery
        studies={[study({ match: { score: 50, depth: 2, reason: 'line-context' } })]}
        openingName="x"
      />
    );
    expect(screen.getByText('Explores deeper lines')).toBeInTheDocument();
  });

  test('card links to the best-matching chapter', () => {
    render(<StudiesGallery studies={[study()]} openingName="x" />);
    const link = screen.getByRole('link', { name: /open/i });
    expect(link).toHaveAttribute('href', 'https://lichess.org/study/abc/def');
  });

  test('singular chapter label', () => {
    render(<StudiesGallery studies={[study({ chapters_matched: 1 })]} openingName="x" />);
    expect(screen.getByText(/1 chapter\b/)).toBeInTheDocument();
  });

  test('show more expands past 5 studies', () => {
    const studies = Array.from({ length: 7 }, (_, i) =>
      study({ study_url: `https://lichess.org/study/s${i}`, study_title: `Study ${i}` })
    );
    render(<StudiesGallery studies={studies} openingName="x" />);
    expect(screen.queryByText('Study 6')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/show 2 more/i));
    expect(screen.getByText('Study 6')).toBeInTheDocument();
  });
});
