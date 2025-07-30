import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import VideoGallery from '../../packages/web/src/components/detail/VideoGallery';
import { Video } from '../../packages/shared/src/types/video';

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
    score: 95
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
    score: 88
  }
];

describe('VideoGallery', () => {
  it('should render nothing when no videos provided', () => {
    const { container } = render(
      <VideoGallery videos={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render video gallery with videos', () => {
    render(
      <VideoGallery videos={mockVideos} />
    );

    expect(screen.getByText('Video Lessons')).toBeInTheDocument();
    expect(screen.queryByText('Learn')).not.toBeInTheDocument();
    expect(screen.getByText('Test Chess Opening Video')).toBeInTheDocument();
    expect(screen.getByText('Advanced Opening Strategies')).toBeInTheDocument();
  });

  it('should format duration correctly', () => {
    render(
      <VideoGallery videos={mockVideos} />
    );

    expect(screen.getByText('10:00')).toBeInTheDocument(); // 600 seconds
    expect(screen.getByText('20:00')).toBeInTheDocument(); // 1200 seconds
  });

  it('should format views correctly', () => {
    render(
      <VideoGallery videos={mockVideos} />
    );

    expect(screen.getByText('50.0K views')).toBeInTheDocument();
    expect(screen.getByText('2.5M views')).toBeInTheDocument();
  });

  it('should create links with correct attributes', () => {
    render(
      <VideoGallery videos={mockVideos} />
    );

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', 'https://youtube.com/watch?v=test1');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should display video metadata correctly', () => {
    render(
      <VideoGallery videos={mockVideos} />
    );

    expect(screen.getByText('Chess Master')).toBeInTheDocument();
    expect(screen.getByText('Pro Chess')).toBeInTheDocument();
    expect(screen.getByText('Jan 2023')).toBeInTheDocument();
    expect(screen.getByText('Jun 2023')).toBeInTheDocument();
  });

  it('should handle missing published date gracefully', () => {
    const videosWithoutDate = [{
      ...mockVideos[0],
      published: 'invalid-date'
    }];

    render(
      <VideoGallery videos={videosWithoutDate} />
    );

    // Should render without the date separator
    expect(screen.queryByText('•')).not.toBeInTheDocument();
  });
});
