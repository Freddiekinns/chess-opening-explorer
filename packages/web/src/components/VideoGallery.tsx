import React from 'react';

interface Video {
  id: string;
  title: string;
  channel: string;
  duration: number;
  views: number;
  published: string;
  thumbnail: string;
  url: string;
  score: number;
}

interface VideoGalleryProps {
  videos: Video[];
  openingName: string;
}

const VideoGallery: React.FC<VideoGalleryProps> = ({ videos, openingName }) => {
  if (!videos || videos.length === 0) {
    return null; // Don't render anything if no videos
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`;
    }
    return `${views} views`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="video-gallery">
      <h3 className="video-gallery-title">Video Lessons</h3>
      <p className="video-gallery-subtitle">
        Learn {openingName} from chess experts
      </p>
      
      <div className="video-carousel">
        {videos.map((video) => (
          <div key={video.id} className="video-card">
            <a 
              href={video.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="video-link"
            >
              <div className="video-thumbnail-container">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="video-thumbnail"
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
                <div className="video-meta">
                  <span className="video-views">{formatViews(video.views)}</span>
                  {formatDate(video.published) && (
                    <>
                      <span className="video-meta-separator">•</span>
                      <span className="video-date">{formatDate(video.published)}</span>
                    </>
                  )}
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoGallery;
