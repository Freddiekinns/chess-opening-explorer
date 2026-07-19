import React, { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { ResourceContext, Video } from '../../../../../shared/src';
import VideoGallery from '../VideoGallery';
import StudiesGallery, { type SearchLinks, type Study } from '../StudiesGallery';
import { VideoErrorBoundary } from '../../shared/VideoErrorBoundary';
import styles from './MobileResources.module.css';

/**
 * Learning resources as a collapsed accordion (design 2a): one card with a
 * Videos row and a Studies row, each showing its count and how specific the
 * matches are before the learner commits to opening it. Expanding a row
 * reveals the existing gallery. External search pills render as a
 * swipeable row below the card.
 */

interface MobileResourcesProps {
  videos: Video[];
  videoContext: ResourceContext | null;
  studies: Study[];
  studyContext: ResourceContext | null;
  searchLinks: SearchLinks | null;
  openingName: string;
}

function videoSubtitle(videos: Video[], context: ResourceContext | null): string {
  if (context?.source === 'family' && context.family) {
    return `From the wider ${context.family.name} family`;
  }
  const exact = videos.filter((video) => video.matchReason === 'variation').length;
  if (exact === 1) return '1 covers this exact variation';
  if (exact > 1) return `${exact} cover this exact variation`;
  return 'Matched to this opening';
}

function studySubtitle(studies: Study[], context: ResourceContext | null): string {
  if (context?.source === 'family' && context.family) {
    return `From the wider ${context.family.name} family`;
  }
  const exact = studies.filter((study) => study.match?.reason === 'covers-position').length;
  if (exact === 1) return '1 covers this exact variation';
  if (exact > 1) return `${exact} cover this exact variation`;
  return 'Curated Lichess studies';
}

interface AccordionRowProps {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionRow: React.FC<AccordionRowProps> = ({
  title,
  subtitle,
  open,
  onToggle,
  children,
}) => (
  <div className={styles.row}>
    <button type="button" className={styles.rowHeader} aria-expanded={open} onClick={onToggle}>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowSubtitle}>{subtitle}</span>
      </span>
      <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
    </button>
    {open && <div className={styles.rowBody}>{children}</div>}
  </div>
);

export const MobileResources: React.FC<MobileResourcesProps> = ({
  videos,
  videoContext,
  studies,
  studyContext,
  searchLinks,
  openingName,
}) => {
  const [videosOpen, setVideosOpen] = useState(false);
  const [studiesOpen, setStudiesOpen] = useState(false);

  const hasVideos = videos.length > 0;
  const hasStudies = studies.length > 0;
  if (!hasVideos && !hasStudies && !searchLinks) return null;

  return (
    <div className={styles.resources}>
      {(hasVideos || hasStudies) && (
        <div className={styles.card}>
          {hasVideos && (
            <AccordionRow
              title={`Videos (${videos.length})`}
              subtitle={videoSubtitle(videos, videoContext)}
              open={videosOpen}
              onToggle={() => setVideosOpen(!videosOpen)}
            >
              <VideoErrorBoundary>
                <VideoGallery videos={videos} hideTitle />
              </VideoErrorBoundary>
            </AccordionRow>
          )}
          {hasStudies && (
            <AccordionRow
              title={`Studies (${studies.length})`}
              subtitle={studySubtitle(studies, studyContext)}
              open={studiesOpen}
              onToggle={() => setStudiesOpen(!studiesOpen)}
            >
              <StudiesGallery studies={studies} openingName={openingName} />
            </AccordionRow>
          )}
        </div>
      )}

      {searchLinks && (
        <div className={styles.searchPills}>
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${openingName} chess opening`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.searchPill}
          >
            Search YouTube
            <ExternalLink size={10} className={styles.pillIcon} />
          </a>
          <a
            href={searchLinks.lichess}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.searchPill}
          >
            Search Lichess Studies
            <ExternalLink size={10} className={styles.pillIcon} />
          </a>
          <a
            href={searchLinks.chessable}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.searchPill}
          >
            Search Chessable
            <ExternalLink size={10} className={styles.pillIcon} />
          </a>
        </div>
      )}
    </div>
  );
};

export default MobileResources;
