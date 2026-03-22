import React, { useState, useEffect, useMemo } from 'react';
import styles from './CommonPlans.module.css';

interface CommonPlansProps {
  ecoCode: string;
  className?: string;
  /** 'stacked' (default) renders White/Black/General vertically.
   *  'sideBySide' puts White and Black in a 2-column grid with General below.
   *  'cards' renders each side as a full-width card with left-border accent.
   *  'structured' renders shared plans full-width, White/Black side-by-side below. */
  layout?: 'stacked' | 'sideBySide' | 'cards' | 'structured';
  /** When true, hides the built-in "Common Plans" heading (parent provides its own). */
  hideTitle?: boolean;
}

interface ECOAnalysis {
  white_plans: string[];
  black_plans: string[];
  common_plans?: string[];
}

type PlanSide = 'white' | 'black' | 'general';

interface ClassifiedPlan {
  side: PlanSide;
  text: string;
}

const WHITE_PREFIX =
  /^(?:(?:for\s+)?white[\s:,]|white's\s+(?:plan|primary|main|goal|key|long)|as\s+white[\s:,]|white\s+(?:aims|seeks|focuses|should|tries|typically|can|will|plays|often|may|must|needs?|plans|solidifies|completes|accepts|looks|develops|prepares))/i;

const BLACK_PREFIX =
  /^(?:(?:for\s+)?black[\s:,]|black's\s+(?:plan|primary|main|goal|key|long)|as\s+black[\s:,]|black\s+(?:aims|seeks|focuses|should|tries|typically|can|will|plays|often|may|must|needs?|plans|works|challenges|develops|looks|frequently|sacrifices))/i;

// Matches the label portion to strip from the display text
const STRIP_PREFIX =
  /^(?:(?:for\s+)?(?:white|black)[\s:,]+(?:the\s+plan\s+is\s+to\s+)?|(?:white|black)'s\s+plan(?:\s+is)?\s*[:.]?\s*|as\s+(?:white|black)[\s:,]+)/i;

function classifyPlan(plan: string): ClassifiedPlan {
  const trimmed = plan.trim();

  if (WHITE_PREFIX.test(trimmed)) {
    return { side: 'white', text: trimmed.replace(STRIP_PREFIX, '').replace(/^[,:\s]+/, '') };
  }
  if (BLACK_PREFIX.test(trimmed)) {
    return { side: 'black', text: trimmed.replace(STRIP_PREFIX, '').replace(/^[,:\s]+/, '') };
  }
  return { side: 'general', text: trimmed };
}

// Capitalise the first letter after prefix stripping
function capitaliseFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SIDE_CONFIG: Record<PlanSide, { label: string; cardLabel: string; className: string }> = {
  white: { label: 'White', cardLabel: 'White perspective', className: styles.white },
  black: { label: 'Black', cardLabel: 'Black perspective', className: styles.black },
  general: { label: 'Both', cardLabel: 'Shared objectives', className: styles.general },
};

export const CommonPlans: React.FC<CommonPlansProps> = ({
  ecoCode,
  className = '',
  layout = 'stacked',
  hideTitle = false,
}) => {
  const [ecoAnalysis, setEcoAnalysis] = useState<ECOAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchECOAnalysis = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/openings/eco-analysis/${ecoCode}`);
        const data = await response.json();

        if (data.success) {
          setEcoAnalysis(data.data);
        }
      } catch (error) {
        // silently fail - empty state handles this
      } finally {
        setLoading(false);
      }
    };

    if (ecoCode) {
      fetchECOAnalysis();
    }
  }, [ecoCode]);

  const grouped = useMemo(() => {
    const plans = ecoAnalysis?.common_plans || [];
    const white: ClassifiedPlan[] = [];
    const black: ClassifiedPlan[] = [];
    const general: ClassifiedPlan[] = [];

    for (const raw of plans) {
      const classified = classifyPlan(raw);
      classified.text = capitaliseFirst(classified.text);

      if (classified.side === 'white') white.push(classified);
      else if (classified.side === 'black') black.push(classified);
      else general.push(classified);
    }

    return { white, black, general };
  }, [ecoAnalysis]);

  if (loading) {
    return (
      <div className={`content-panel-improved ${className}`}>
        <h3 className="title-subsection">Common Plans</h3>
        <div className="loading-state">Loading common plans...</div>
      </div>
    );
  }

  const totalPlans = grouped.white.length + grouped.black.length + grouped.general.length;

  if (totalPlans === 0) {
    return null;
  }

  const renderSection = (side: PlanSide, plans: ClassifiedPlan[]) => {
    if (plans.length === 0) return null;
    const config = SIDE_CONFIG[side];

    return (
      <div className={styles.section}>
        <div className={`${styles.sectionLabel} ${config.className}`}>{config.label}</div>
        <div className={styles.sectionPlans}>
          {plans.map((plan, i) => (
            <div key={i} className={`plan-item ${styles.planItem} ${config.className}`}>
              <p>{plan.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCard = (side: PlanSide, plans: ClassifiedPlan[], index: number) => {
    if (plans.length === 0) return null;
    const config = SIDE_CONFIG[side];

    return (
      <div
        className={`${styles.card} ${config.className}`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className={styles.cardLabel}>{config.cardLabel}</div>
        <div className={styles.cardPlans}>
          {plans.map((plan, i) => (
            <p key={i} className={styles.cardPlanText}>
              {plan.text}
            </p>
          ))}
        </div>
      </div>
    );
  };

  if (layout === 'structured') {
    return (
      <div className={className}>
        {!hideTitle && <h3 className="title-subsection">Common Plans</h3>}

        {/* Shared/general plans — full width */}
        {grouped.general.length > 0 && (
          <div className={styles.sharedCard}>
            <div className={styles.sharedHeader}>
              <span className={styles.sharedTitle}>Shared plans</span>
              <span className={styles.sharedBadge}>Shared</span>
            </div>
            <div className={styles.cardPlans}>
              {grouped.general.map((plan, i) => (
                <p key={i} className={styles.cardPlanText}>
                  {plan.text}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* White + Black side by side */}
        {(grouped.white.length > 0 || grouped.black.length > 0) && (
          <div className={styles.structuredGrid}>
            {grouped.white.length > 0 && (
              <div className={styles.structuredColumn}>
                <div className={styles.structuredColumnLabel}>White</div>
                {grouped.white.map((plan, i) => (
                  <div key={i} className={`${styles.structuredPlanCard} ${styles.white}`}>
                    <p className={styles.cardPlanText}>{plan.text}</p>
                  </div>
                ))}
              </div>
            )}
            {grouped.black.length > 0 && (
              <div className={styles.structuredColumn}>
                <div className={styles.structuredColumnLabel}>Black</div>
                {grouped.black.map((plan, i) => (
                  <div key={i} className={`${styles.structuredPlanCard} ${styles.black}`}>
                    <p className={styles.cardPlanText}>{plan.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (layout === 'cards') {
    return (
      <div className={className}>
        {!hideTitle && <h3 className="title-subsection">Common Plans</h3>}
        <div className={styles.cardsGrid}>
          {renderCard('white', grouped.white, 0)}
          {renderCard('black', grouped.black, 1)}
          {renderCard('general', grouped.general, 2)}
        </div>
      </div>
    );
  }

  const isSideBySide = layout === 'sideBySide';

  return (
    <div className={`content-panel-improved ${className}`}>
      {!hideTitle && <h3 className="title-subsection">Common Plans</h3>}
      {isSideBySide ? (
        <>
          <div className={styles.plansGrid}>
            {renderSection('white', grouped.white)}
            {renderSection('black', grouped.black)}
          </div>
          {grouped.general.length > 0 && (
            <div className={styles.groupedPlans}>{renderSection('general', grouped.general)}</div>
          )}
        </>
      ) : (
        <div className={styles.groupedPlans}>
          {renderSection('white', grouped.white)}
          {renderSection('black', grouped.black)}
          {renderSection('general', grouped.general)}
        </div>
      )}
    </div>
  );
};

export default CommonPlans;
