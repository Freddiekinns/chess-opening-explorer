import React, { useState } from 'react';
import styles from './StudiesGallery.module.css';

// Types matching the API response from /api/courses/:fen (schema v2)
export interface Study {
  study_title: string;
  chapter_title: string;
  study_url: string;
  chapter_url: string;
  author: string;
  platform: string;
  likes: number;
  chapters_matched: number;
  curated: boolean;
  match: { score: number; depth: number; reason: 'covers-position' | 'line-context' };
  discovered_at: string;
}

export interface SearchLinks {
  lichess: string;
  chessable: string;
}

interface StudiesGalleryProps {
  studies: Study[];
  openingName: string;
}

const INITIAL_DISPLAY_COUNT = 5;

const MATCH_REASON_LABELS: Record<Study['match']['reason'], string> = {
  'covers-position': 'Covers this variation',
  'line-context': 'Explores deeper lines',
};

const StudyCard: React.FC<{ study: Study }> = ({ study }) => (
  <div className={styles.studyCard}>
    <div className={styles.studyInfo}>
      <h4 className={styles.studyTitle}>{study.study_title}</h4>
      <div className={styles.studyMeta}>
        <span className={styles.author}>by {study.author}</span>
        <span className={styles.metaSeparator}>·</span>
        <span>
          {study.chapters_matched} {study.chapters_matched === 1 ? 'chapter' : 'chapters'}
        </span>
        <span className={styles.metaSeparator}>·</span>
        <span className={styles.platformBadge}>{study.platform}</span>
      </div>
      {study.match && (
        <span
          className={`${styles.matchBadge} ${
            study.match.reason === 'covers-position' ? styles.matchBadgeVariation : ''
          }`}
        >
          {MATCH_REASON_LABELS[study.match.reason]}
        </span>
      )}
    </div>
    <a
      href={study.chapter_url || study.study_url}
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

const StudiesGallery: React.FC<StudiesGalleryProps> = ({ studies, openingName: _openingName }) => {
  const [showAll, setShowAll] = useState(false);

  if (!studies || studies.length === 0) {
    return null;
  }

  const hasMore = studies.length > INITIAL_DISPLAY_COUNT;
  const displayedStudies = showAll ? studies : studies.slice(0, INITIAL_DISPLAY_COUNT);
  const remainingCount = studies.length - INITIAL_DISPLAY_COUNT;

  return (
    <div className={styles.gallery}>
      <div className={styles.studyList}>
        {displayedStudies.map((study, index) => (
          <StudyCard key={`${study.study_url}-${index}`} study={study} />
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

export default StudiesGallery;
