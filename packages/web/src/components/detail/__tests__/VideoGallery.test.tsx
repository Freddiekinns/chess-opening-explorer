import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import VideoGallery from '../VideoGallery';
import { Video } from '../../../../../shared/src/types/video';

const mockVideos: Video[] = [
  {
    id: 'test-video-1',
    title: 'Test Chess Opening Video',
    channel: 'Chess Master',
    duration: 600,
    views: 50000,
    published: '2023-01-01T00:00:00Z',
    thumbnail: 'https://example.com/thumb1.jpg',
    url: 'https://youtube.com/watch?v=test1',
    score: 95,
  },
  {
    id: 'test-video-2',
    title: 'Advanced Opening Strategies',
    channel: 'Pro Chess',
    duration: 1200,
    views: 2500000,
    published: '2023-06-15T12:00:00Z',
    thumbnail: 'https://example.com/thumb2.jpg',
    url: 'https://youtube.com/watch?v=test2',
    score: 88,
  },
];

describe('VideoGallery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render nothing when no videos provided', () => {
    const { container } = render(<VideoGallery videos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render video gallery with videos', () => {
    render(<VideoGallery videos={mockVideos} />);

    expect(screen.getByText('Video lessons')).toBeInTheDocument();
    expect(screen.queryByText('Learn')).not.toBeInTheDocument();
    expect(screen.getByText('Test Chess Opening Video')).toBeInTheDocument();
    expect(screen.getByText('Advanced Opening Strategies')).toBeInTheDocument();
  });

  it('should format duration correctly', () => {
    render(<VideoGallery videos={mockVideos} />);

    expect(screen.getByText('10:00')).toBeInTheDocument(); // 600 seconds
    expect(screen.getByText('20:00')).toBeInTheDocument(); // 1200 seconds
  });

  it('should format views correctly', () => {
    render(<VideoGallery videos={mockVideos} />);

    expect(screen.getByText('50.0K views')).toBeInTheDocument();
    expect(screen.getByText('2.5M views')).toBeInTheDocument();
  });

  it('should keep the title as an external YouTube link', () => {
    render(<VideoGallery videos={mockVideos} />);

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', 'https://youtube.com/watch?v=test1');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should display video metadata correctly', () => {
    render(<VideoGallery videos={mockVideos} />);

    expect(screen.getByText('Chess Master')).toBeInTheDocument();
    expect(screen.getByText('Pro Chess')).toBeInTheDocument();
    expect(screen.getByText('Jan 2023')).toBeInTheDocument();
    expect(screen.getByText('Jun 2023')).toBeInTheDocument();
  });

  it('should handle missing published date gracefully', () => {
    const videosWithoutDate = [
      {
        ...mockVideos[0],
        published: 'invalid-date',
      },
    ];

    render(<VideoGallery videos={videosWithoutDate} />);

    // Should render without the date separator
    expect(screen.queryByText('•')).not.toBeInTheDocument();
  });

  describe('match-reason badge (review V2)', () => {
    it('renders "Covers this variation" and "Family overview" badges', () => {
      const annotated: Video[] = [
        { ...mockVideos[0], matchReason: 'variation' },
        { ...mockVideos[1], matchReason: 'family' },
      ];
      render(<VideoGallery videos={annotated} />);

      expect(screen.getByText('Covers this variation')).toBeInTheDocument();
      expect(screen.getByText('Family overview')).toBeInTheDocument();
    });

    it('renders no badge when matchReason is absent', () => {
      render(<VideoGallery videos={mockVideos} />);
      expect(screen.queryByText('Covers this variation')).not.toBeInTheDocument();
      expect(screen.queryByText('Family overview')).not.toBeInTheDocument();
    });
  });

  describe('in-place player + watched state (review V3)', () => {
    it('swaps the thumbnail for a youtube-nocookie iframe on play', () => {
      render(<VideoGallery videos={mockVideos} />);

      fireEvent.click(screen.getByRole('button', { name: 'Play video: Test Chess Opening Video' }));

      const iframe = screen.getByTitle('Test Chess Opening Video');
      expect(iframe.tagName).toBe('IFRAME');
      expect(iframe).toHaveAttribute(
        'src',
        'https://www.youtube-nocookie.com/embed/test-video-1?autoplay=1&rel=0'
      );
      // The other card keeps its thumbnail button
      expect(
        screen.getByRole('button', { name: 'Play video: Advanced Opening Strategies' })
      ).toBeInTheDocument();
    });

    it('marks the video watched in localStorage and shows the chip', () => {
      render(<VideoGallery videos={mockVideos} />);
      expect(screen.queryByText('Watched')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Play video: Test Chess Opening Video' }));
      expect(screen.getByText('Watched')).toBeInTheDocument();

      const stored = JSON.parse(localStorage.getItem('openingbook:watched-videos') || '{}');
      expect(Object.keys(stored)).toContain('test-video-1');
    });

    it('shows the watched chip on mount for previously watched videos', () => {
      localStorage.setItem(
        'openingbook:watched-videos',
        JSON.stringify({ 'test-video-2': Date.now() })
      );
      render(<VideoGallery videos={mockVideos} />);
      expect(screen.getByText('Watched')).toBeInTheDocument();
    });
  });
});
