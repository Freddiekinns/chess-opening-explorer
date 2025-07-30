/**
 * Shared types for video data across frontend and backend
 */

export interface Video {
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

export interface VideoResponse {
  success: boolean;
  data: Video[];
  count: number;
  fen: string;
}

export interface VideoData {
  fen: string;
  name: string;
  eco: string;
  extracted_at: string;
  video_count: number;
  videos: Video[];
}

export interface VideoServiceConfig {
  maxCacheSize: number;
  videoDirectory: string;
}
