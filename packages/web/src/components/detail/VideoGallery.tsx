import React, { useState } from 'react';
import { Video } from '../../../../shared/src/types/video.js';
import { isVideoWatched, markVideoWatched } from '../../lib/watchedVideos';
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

const MATCH_REASON_LABELS: Record<NonNullable<Video['matchReason']>, string> = {
  variation: 'Covers this variation',
  family: 'Family overview',
};

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
  // An unparseable date doesn't throw — it yields "Invalid Date", which
  // would render literally, so check validity explicitly.
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', DATE_FORMAT_OPTIONS);
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

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 8.5l3.5 3.5L13 4.5" />
  </svg>
);

// Components
interface VideoCardProps {
  video: Video;
}

/**
 * Video card with an in-place player (review V3): clicking the thumbnail
 * swaps in a youtube-nocookie iframe so the learner keeps the board in view
 * — nothing is loaded from YouTube until playback starts. The title stays an
 * external link for anyone who prefers watching there. Watched state
 * persists in localStorage.
 */
const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const [playing, setPlaying] = useState(false);
  const [watched, setWatched] = useState(() => isVideoWatched(video.id));

  const handlePlay = () => {
    setPlaying(true);
    markVideoWatched(video.id);
    setWatched(true);
  };

  return (
    <div className={`${styles.videoCard} ${playing ? styles.videoCardPlaying : ''}`}>
      {playing ? (
        <div className={styles.playerContainer}>
          <iframe
            className={styles.player}
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          type="button"
          className={styles.thumbnailButton}
          onClick={handlePlay}
          aria-label={`Play video: ${video.title}`}
        >
          <span className={styles.thumbnailContainer}>
            <img
              src={getHighQualityThumbnail(video.thumbnail)}
              alt=""
              className={styles.thumbnail}
              loading="lazy"
              onError={handleThumbnailError}
            />
            <span className={styles.playOverlay}>
              <PlayIcon />
            </span>
            <span className={styles.duration}>{formatDuration(video.duration)}</span>
          </span>
        </button>
      )}

      <div className={styles.info}>
        <h4 className={styles.title}>
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.titleLink}
            title={`${video.title} — watch on YouTube`}
          >
            {video.title}
          </a>
        </h4>
        <p className={styles.channel}>{video.channel}</p>
        <VideoMetadata video={video} watched={watched} />
        {video.matchReason && (
          <span
            className={`${styles.matchBadge} ${
              video.matchReason === 'variation' ? styles.matchBadgeVariation : ''
            }`}
          >
            {MATCH_REASON_LABELS[video.matchReason]}
          </span>
        )}
      </div>
    </div>
  );
};

interface VideoMetadataProps {
  video: Video;
  watched: boolean;
}

const VideoMetadata: React.FC<VideoMetadataProps> = ({ video, watched }) => {
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
      {watched && (
        <span className={styles.watchedChip}>
          <CheckIcon />
          Watched
        </span>
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
      {!hideTitle && <h3>Video lessons</h3>}

      <div className={styles.videoList}>
        {displayedVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {hasMore && !showAll && (
        <button className={styles.showMoreButton} onClick={() => setShowAll(true)}>
          Show {remainingCount} more {remainingCount === 1 ? 'video' : 'videos'} ▾
        </button>
      )}
    </div>
  );
};

export default VideoGallery;
