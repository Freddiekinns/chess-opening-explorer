import React, { useState } from 'react';
import styles from './StudiesGallery.module.css';

// Types matching the API response from /api/courses/:fen
export interface Study {
  course_title: string;
  author: string;
  platform: string;
  source_url: string;
  anchor_fens: string[];
  curated: boolean;
  likes: number;
  discovered_at: string;
}

export interface SearchLinks {
  lichess: string;
  chessable: string;
}

interface StudiesGalleryProps {
  studies: Study[];
  searchLinks: SearchLinks | null;
  openingName: string;
}

const INITIAL_DISPLAY_COUNT = 5;

const StudyCard: React.FC<{ study: Study }> = ({ study }) => (
  <div className={styles.studyCard}>
    <div className={styles.studyInfo}>
      <h4 className={styles.studyTitle}>{study.course_title}</h4>
      <div className={styles.studyMeta}>
        <span className={styles.author}>by {study.author}</span>
        <span className={styles.metaSeparator}>·</span>
        <span className={styles.platformBadge}>{study.platform}</span>
      </div>
    </div>
    <a
      href={study.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.openButton}
    >
      Open
      <svg
        className={styles.externalIcon}
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="currentColor"
      >
        <path d="M3.75 2a.75.75 0 0 0 0 1.5h6.69L2.72 11.22a.75.75 0 1 0 1.06 1.06L11.5 4.56v6.69a.75.75 0 0 0 1.5 0V2.75a.75.75 0 0 0-.75-.75H3.75Z" />
      </svg>
    </a>
  </div>
);

const StudiesGallery: React.FC<StudiesGalleryProps> = ({
  studies,
  searchLinks,
  openingName: _openingName,
}) => {
  const [showAll, setShowAll] = useState(false);

  if ((!studies || studies.length === 0) && !searchLinks) {
    return null;
  }

  const hasMore = studies.length > INITIAL_DISPLAY_COUNT;
  const displayedStudies = showAll ? studies : studies.slice(0, INITIAL_DISPLAY_COUNT);
  const remainingCount = studies.length - INITIAL_DISPLAY_COUNT;

  return (
    <div className={styles.gallery}>
      {studies.length > 0 && (
        <>
          <div className={styles.studyList}>
            {displayedStudies.map((study, index) => (
              <StudyCard key={`${study.source_url}-${index}`} study={study} />
            ))}
          </div>

          {hasMore && !showAll && (
            <button className={styles.showMoreButton} onClick={() => setShowAll(true)}>
              Show {remainingCount} more ▾
            </button>
          )}
        </>
      )}

      {studies.length === 0 && (
        <p className={styles.emptyMessage}>No curated studies found for this opening yet.</p>
      )}

      {searchLinks && (
        <div className={styles.searchLinks}>
          <p className={styles.searchLinksLabel}>Find more resources</p>
          <div className={styles.searchButtons}>
            <a
              href={searchLinks.lichess}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.searchButton}
            >
              Search Lichess Studies
            </a>
            <a
              href={searchLinks.chessable}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.searchButton}
            >
              Search Chessable
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudiesGallery;
