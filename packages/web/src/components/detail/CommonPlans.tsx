import React, { useMemo, useState } from 'react';
import styles from './CommonPlans.module.css';

interface CommonPlansProps {
  /** The opening's own common_plans, from the /fen/:fen payload. Plans must
   *  belong to the exact position being viewed — never fall back to ECO-bucket
   *  data, which mixes in sibling openings' plans (see
   *  docs/proposals/2026-06-12-common-plans-provenance.md). */
  plans: string[];
  className?: string;
  /** 'stacked' (default) renders White/Black/General vertically.
   *  'sideBySide' puts White and Black in a 2-column grid with General below.
   *  'cards' renders each side as a full-width card with left-border accent.
   *  'structured' renders shared plans full-width, White/Black side-by-side below.
   *  'mobileGroups' (design 2a) stacks White/Black/Both accent cards with
   *  bullet rows, three visible per group and a Show-more toggle. */
  layout?: 'stacked' | 'sideBySide' | 'cards' | 'structured' | 'mobileGroups';
  /** When true, hides the built-in "Common Plans" heading (parent provides its own). */
  hideTitle?: boolean;
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

const MOBILE_GROUP_LABELS: Record<PlanSide, string> = {
  white: 'White',
  black: 'Black',
  general: 'Both sides',
};

const MOBILE_GROUP_COLLAPSED = 3;

/** One accent card per side (mobile design 2a): bullets, 3 shown, toggle. */
const MobilePlanGroup: React.FC<{ side: PlanSide; plans: ClassifiedPlan[] }> = ({
  side,
  plans,
}) => {
  const [expanded, setExpanded] = useState(false);
  if (plans.length === 0) return null;

  const hasMore = plans.length > MOBILE_GROUP_COLLAPSED;
  const shown = expanded ? plans : plans.slice(0, MOBILE_GROUP_COLLAPSED);

  return (
    <div className={`${styles.mobileGroup} ${SIDE_CONFIG[side].className}`}>
      <div className={styles.mobileGroupLabel}>{MOBILE_GROUP_LABELS[side]}</div>
      <div className={styles.mobileGroupPlans}>
        {shown.map((plan, i) => (
          <div key={i} className={styles.mobilePlanRow}>
            <span className={styles.mobilePlanDot} aria-hidden="true" />
            <p className={styles.mobilePlanText}>{plan.text}</p>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className={styles.mobileGroupToggle}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `Show ${plans.length - MOBILE_GROUP_COLLAPSED} more`}
        </button>
      )}
    </div>
  );
};

export const CommonPlans: React.FC<CommonPlansProps> = ({
  plans,
  className = '',
  layout = 'stacked',
  hideTitle = false,
}) => {
  const grouped = useMemo(() => {
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
  }, [plans]);

  const totalPlans = grouped.white.length + grouped.black.length + grouped.general.length;

  if (totalPlans === 0) {
    return null;
  }

  const renderSection = (side: PlanSide, sidePlans: ClassifiedPlan[]) => {
    if (sidePlans.length === 0) return null;
    const config = SIDE_CONFIG[side];

    return (
      <div className={styles.section}>
        <div className={`${styles.sectionLabel} ${config.className}`}>{config.label}</div>
        <div className={styles.sectionPlans}>
          {sidePlans.map((plan, i) => (
            <div key={i} className={`plan-item ${styles.planItem} ${config.className}`}>
              <p>{plan.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCard = (side: PlanSide, sidePlans: ClassifiedPlan[], index: number) => {
    if (sidePlans.length === 0) return null;
    const config = SIDE_CONFIG[side];

    return (
      <div
        className={`${styles.card} ${config.className}`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className={styles.cardLabel}>{config.cardLabel}</div>
        <div className={styles.cardPlans}>
          {sidePlans.map((plan, i) => (
            <p key={i} className={styles.cardPlanText}>
              {plan.text}
            </p>
          ))}
        </div>
      </div>
    );
  };

  if (layout === 'mobileGroups') {
    return (
      <div className={`${styles.mobileGroupsLayout} ${className}`}>
        {!hideTitle && <h3 className="title-subsection">Common plans</h3>}
        <MobilePlanGroup side="white" plans={grouped.white} />
        <MobilePlanGroup side="black" plans={grouped.black} />
        <MobilePlanGroup side="general" plans={grouped.general} />
      </div>
    );
  }

  if (layout === 'structured') {
    return (
      <div className={`${styles.structuredLayout} ${className}`}>
        {!hideTitle && <h3 className="title-subsection">Common plans</h3>}

        {/* Shared/general plans — full width */}
        {grouped.general.length > 0 && (
          <div className={styles.structuredColumn}>
            <div className={styles.structuredColumnLabel}>Shared</div>
            {grouped.general.map((plan, i) => (
              <div key={i} className={`${styles.structuredPlanCard} ${styles.general}`}>
                <p className={styles.cardPlanText}>{plan.text}</p>
              </div>
            ))}
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
        {!hideTitle && <h3 className="title-subsection">Common plans</h3>}
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
      {!hideTitle && <h3 className="title-subsection">Common plans</h3>}
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
