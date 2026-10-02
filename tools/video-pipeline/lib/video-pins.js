/**
 * Video pins — hand-verified videos for pages the scorer leaves empty.
 *
 * `config/video_pins.json` lists, per named opening, videos that both Jev and
 * an independent judge agreed are about it (docs/proposals/
 * 2026-10-02-jev-video-experiment.md, stratum E). They go first on every page
 * of that named opening, after the Jev filter, so nothing downstream removes
 * them. The scorer never sees them; fixing its aliases is the better route
 * when it can be made to find a video itself.
 *
 * A pin carries only the video id. The served entry is built from the
 * enrichment corpus, and a pin whose video has left the corpus is skipped.
 */

const { baseName } = require('./jev-filter');

function durationSeconds(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if (!m) return null;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

/** The entry static-file-generator.js would write for this video. */
function toIndexVideo(video) {
  return {
    id: video.id,
    title: video.title,
    channel: video.channelTitle,
    duration: durationSeconds(video.duration),
    views: video.viewCount || 0,
    published: video.publishedAt,
    thumbnail: `https://i.ytimg.com/vi/${video.id}/default.jpg`,
    url: `https://youtube.com/watch?v=${video.id}`,
    // No matcher score. 0 keeps pins from outranking scored videos on the
    // family shelves, which rank by score.
    score: 0,
  };
}

/**
 * Puts each named opening's pinned videos first on its pages. Mutates `index`.
 *
 * @param {Object} index - video index ({positions, metadata})
 * @param {Object} pins - {"<named opening>": [{id}]}
 * @param {Object} corpus - enrichment cache, id-keyed
 * @returns {{pagesFilled: number, added: number, missing: string[]}}
 */
function applyVideoPins(index, pins, corpus) {
  const stats = { pagesFilled: 0, added: 0, missing: [] };
  const pinned = new Map();
  for (const [opening, list] of Object.entries(pins)) {
    const videos = [];
    for (const { id } of list) {
      if (corpus[id]) videos.push(toIndexVideo(corpus[id]));
      else stats.missing.push(id);
    }
    pinned.set(opening, videos);
  }

  let total = 0;
  for (const pos of Object.values(index.positions)) {
    const videos = pinned.get(baseName(pos.opening.name));
    if (videos && videos.length) {
      const before = pos.videos || [];
      const ids = new Set(videos.map((v) => v.id));
      if (before.length === 0) stats.pagesFilled++;
      stats.added += videos.filter((v) => !before.some((b) => b.id === v.id)).length;
      pos.videos = [...videos, ...before.filter((v) => !ids.has(v.id))];
      if (pos.metadata) pos.metadata.total_videos = pos.videos.length;
    }
    total += (pos.videos || []).length;
  }

  index.metadata = {
    ...index.metadata,
    totalVideos: total,
    videoPins: { pagesFilled: stats.pagesFilled, added: stats.added },
  };
  return stats;
}

module.exports = { applyVideoPins };
