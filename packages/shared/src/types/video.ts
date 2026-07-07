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
  /**
   * Why this video is on this page (present on sub-variation pages and
   * family-fallback shelves): 'variation' = the title names this variation,
   * 'family' = family-level background material.
   */
  matchReason?: 'variation' | 'family';
}

/**
 * Attribution for a resource shelf: exact-position matches or the
 * family-level fallback (video experience review V1).
 */
export interface ResourceContext {
  source: 'position' | 'family' | 'none';
  family: { id: string; name: string } | null;
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
