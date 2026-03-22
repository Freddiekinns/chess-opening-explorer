import React, { useState } from 'react';
import { Video } from '../../../../shared/src/types/video.js';
import styles from './VideoGallery.module.css';

// Constants
const VIDEO_DISPLAY_LIMITS = {
  MILLION: 1000000,
  THOUSAND: 1000,
} as const;

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
} as const;

const INITIAL_DISPLAY_COUNT = 4;

// Types
interface VideoGalleryProps {
  videos: Video[];
  hideTitle?: boolean;
}

// Utility functions
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatViews = (views: number): string => {
  if (views >= VIDEO_DISPLAY_LIMITS.MILLION) {
    return `${(views / VIDEO_DISPLAY_LIMITS.MILLION).toFixed(1)}M views`;
  }
  if (views >= VIDEO_DISPLAY_LIMITS.THOUSAND) {
    return `${(views / VIDEO_DISPLAY_LIMITS.THOUSAND).toFixed(1)}K views`;
  }
  return `${views} views`;
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', DATE_FORMAT_OPTIONS);
  } catch {
    return '';
  }
};

const getHighQualityThumbnail = (thumbnailUrl: string): string => {
  // Upgrade YouTube thumbnail quality: default.jpg -> maxresdefault.jpg (with hqdefault.jpg fallback)
  if (thumbnailUrl.includes('default.jpg')) {
    return thumbnailUrl.replace('default.jpg', 'maxresdefault.jpg');
  }
  return thumbnailUrl;
};

const handleThumbnailError = (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
  const img = event.currentTarget;
  const currentSrc = img.src;

  // If maxresdefault.jpg fails, fallback to hqdefault.jpg
  if (currentSrc.includes('maxresdefault.jpg')) {
    img.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
  }
  // If hqdefault.jpg fails, fallback to default.jpg
  else if (currentSrc.includes('hqdefault.jpg')) {
    img.src = currentSrc.replace('hqdefault.jpg', 'default.jpg');
  }
};

// Components
interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => (
  <div className={styles.videoCard}>
    <a href={video.url} target="_blank" rel="noopener noreferrer" className={styles.videoLink}>
      <div className={styles.thumbnailContainer}>
        <img
          src={getHighQualityThumbnail(video.thumbnail)}
          alt={video.title}
          className={styles.thumbnail}
          loading="lazy"
          onError={handleThumbnailError}
        />
        <div className={styles.duration}>{formatDuration(video.duration)}</div>
      </div>

      <div className={styles.info}>
        <h4 className={styles.title} title={video.title}>
          {video.title}
        </h4>
        <p className={styles.channel}>{video.channel}</p>
        <VideoMetadata video={video} />
      </div>
    </a>
  </div>
);

interface VideoMetadataProps {
  video: Video;
}

const VideoMetadata: React.FC<VideoMetadataProps> = ({ video }) => {
  const formattedDate = formatDate(video.published);

  return (
    <div className={styles.meta}>
      <span>{formatViews(video.views)}</span>
      {formattedDate && (
        <>
          <span className={styles.metaSeparator}>•</span>
          <span>{formattedDate}</span>
        </>
      )}
    </div>
  );
};

// Main Component
const VideoGallery: React.FC<VideoGalleryProps> = ({ videos, hideTitle = false }) => {
  const [showAll, setShowAll] = useState(false);

  if (!videos || videos.length === 0) {
    return null;
  }

  const hasMore = videos.length > INITIAL_DISPLAY_COUNT;
  const displayedVideos = showAll ? videos : videos.slice(0, INITIAL_DISPLAY_COUNT);
  const remainingCount = videos.length - INITIAL_DISPLAY_COUNT;

  return (
    <div className={styles.gallery}>
      {!hideTitle && <h3>Video Lessons</h3>}

      <div className={styles.videoList}>
        {displayedVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {hasMore && !showAll && (
        <button className={styles.showMoreButton} onClick={() => setShowAll(true)}>
          Show {remainingCount} more ▾
        </button>
      )}
    </div>
  );
};

export default VideoGallery;
