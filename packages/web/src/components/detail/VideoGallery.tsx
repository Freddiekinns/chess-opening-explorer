import React from 'react';
import { Video } from '../../../../shared/src/types/video.js';

// Constants
const VIDEO_DISPLAY_LIMITS = {
  MILLION: 1000000,
  THOUSAND: 1000
} as const;

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short'
} as const;

// Types
interface VideoGalleryProps {
  videos: Video[];
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
  <div className="video-card">
    <a 
      href={video.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="video-link"
    >
      <div className="video-thumbnail-container">
        <img 
          src={getHighQualityThumbnail(video.thumbnail)} 
          alt={video.title}
          className="video-thumbnail"
          loading="lazy"
          onError={handleThumbnailError}
        />
        <div className="video-duration">
          {formatDuration(video.duration)}
        </div>
      </div>
      
      <div className="video-info">
        <h4 className="video-title" title={video.title}>
          {video.title}
        </h4>
        <p className="video-channel">{video.channel}</p>
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
    <div className="video-meta">
      <span className="video-views">{formatViews(video.views)}</span>
      {formattedDate && (
        <>
          <span className="video-meta-separator">•</span>
          <span className="video-date">{formattedDate}</span>
        </>
      )}
    </div>
  );
};

// Main Component
const VideoGallery: React.FC<VideoGalleryProps> = ({ videos }) => {
  if (!videos || videos.length === 0) {
    return null; // Don't render anything if no videos
  }

  return (
    <div className="video-gallery">
      <h3 className="video-gallery-title">Video Lessons</h3>
      
      <div className="video-carousel">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
};

export default VideoGallery;
