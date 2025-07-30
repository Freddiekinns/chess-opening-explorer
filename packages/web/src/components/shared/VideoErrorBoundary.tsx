import React from 'react';

interface VideoErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface VideoErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class VideoErrorBoundary extends React.Component<VideoErrorBoundaryProps, VideoErrorBoundaryState> {
  constructor(props: VideoErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): VideoErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Video component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="video-error-fallback">
          <p>Unable to load video content. Please try refreshing the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default VideoErrorBoundary;
