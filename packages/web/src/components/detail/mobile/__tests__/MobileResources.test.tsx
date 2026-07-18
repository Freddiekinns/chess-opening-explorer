import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MobileResources from '../MobileResources';
import type { Video } from '../../../../../../shared/src';
import type { Study } from '../../StudiesGallery';

function makeVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'vid-1',
    title: 'Exchange Variation of the Alekhine Defense',
    channel: 'Hanging Pawns',
    duration: 1904,
    views: 21000,
    published: '2019-03-01T00:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/vid-1/default.jpg',
    url: 'https://www.youtube.com/watch?v=vid-1',
    matchReason: 'variation',
    ...overrides,
  } as Video;
}

function makeStudy(overrides: Partial<Study> = {}): Study {
  return {
    study_title: 'Alekhine Defense Deep Dive',
    chapter_title: 'Exchange Variation',
    study_url: 'https://lichess.org/study/abc',
    chapter_url: 'https://lichess.org/study/abc/ch1',
    author: 'coach',
    platform: 'lichess',
    likes: 700,
    chapters_matched: 2,
    curated: true,
    match: { score: 90, depth: 8, reason: 'covers-position' },
    discovered_at: '2026-07-01',
    ...overrides,
  };
}

const SEARCH_LINKS = {
  lichess: 'https://lichess.org/study/search?q=alekhine',
  chessable: 'https://www.chessable.com/courses/?search=alekhine',
};

describe('MobileResources', () => {
  test('renders collapsed rows with counts and match-specificity subtitles', () => {
    render(
      <MobileResources
        videos={[makeVideo(), makeVideo({ id: 'vid-2', matchReason: 'family' })]}
        videoContext={{ source: 'position', family: null }}
        studies={[makeStudy()]}
        studyContext={{ source: 'position', family: null }}
        searchLinks={SEARCH_LINKS}
        openingName="Alekhine Defense"
      />
    );

    expect(screen.getByText('Videos (2)')).toBeInTheDocument();
    expect(screen.getAllByText('1 covers this exact variation')).toHaveLength(2);
    expect(screen.getByText('Studies (1)')).toBeInTheDocument();
    // Galleries stay collapsed until tapped
    expect(screen.queryByText('Hanging Pawns')).not.toBeInTheDocument();
    expect(screen.queryByText('Alekhine Defense Deep Dive')).not.toBeInTheDocument();
  });

  test('labels family-fallback shelves honestly', () => {
    render(
      <MobileResources
        videos={[makeVideo({ matchReason: undefined })]}
        videoContext={{ source: 'family', family: { id: 'alekhine', name: "Alekhine's Defense" } }}
        studies={[]}
        studyContext={null}
        searchLinks={null}
        openingName="Alekhine Defense"
      />
    );
    expect(screen.getByText("From the wider Alekhine's Defense family")).toBeInTheDocument();
  });

  test('expanding a row reveals its gallery', async () => {
    const user = userEvent.setup();
    render(
      <MobileResources
        videos={[makeVideo()]}
        videoContext={null}
        studies={[makeStudy()]}
        studyContext={null}
        searchLinks={null}
        openingName="Alekhine Defense"
      />
    );

    await user.click(screen.getByRole('button', { name: /Videos \(1\)/ }));
    expect(screen.getByText('Hanging Pawns')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Studies \(1\)/ }));
    expect(screen.getByText('Alekhine Defense Deep Dive')).toBeInTheDocument();
  });

  test('renders the external search pills row', () => {
    render(
      <MobileResources
        videos={[]}
        videoContext={null}
        studies={[]}
        studyContext={null}
        searchLinks={SEARCH_LINKS}
        openingName="Alekhine Defense"
      />
    );
    expect(screen.getByRole('link', { name: /Search YouTube/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Search Lichess Studies/ })).toHaveAttribute(
      'href',
      SEARCH_LINKS.lichess
    );
    expect(screen.getByRole('link', { name: /Search Chessable/ })).toHaveAttribute(
      'href',
      SEARCH_LINKS.chessable
    );
  });

  test('renders nothing with no resources at all', () => {
    const { container } = render(
      <MobileResources
        videos={[]}
        videoContext={null}
        studies={[]}
        studyContext={null}
        searchLinks={null}
        openingName="Alekhine Defense"
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
