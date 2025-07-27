import React, { useState, useEffect } from 'react';
import './CommonPlans.css';

interface CommonPlansProps {
  ecoCode: string;
  fen?: string; // Add FEN for precise position lookup
  className?: string;
}

interface ECOAnalysis {
  white_plans: string[];
  black_plans: string[];
  common_plans?: string[];
  strategic_themes?: string[];
  name?: string;
  eco?: string;
}

export const CommonPlans: React.FC<CommonPlansProps> = ({
  ecoCode,
  fen,
  className = ''
}) => {
  const [ecoAnalysis, setEcoAnalysis] = useState<ECOAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch ECO analysis data - prefer FEN-based lookup for accuracy
  useEffect(() => {
    const fetchECOAnalysis = async () => {
      try {
        setLoading(true);
        
        // If we have FEN, use the more precise FEN-based lookup
        if (fen) {
          console.log('CommonPlans: Attempting FEN-based lookup for:', fen);
          const response = await fetch('/api/openings/fen-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fen }),
          });
          const data = await response.json();
          
          console.log('CommonPlans: FEN lookup response:', data);
          
          if (data.success) {
            console.log('CommonPlans: Using FEN-based plans for:', data.data.name);
            setEcoAnalysis(data.data);
            return;
          } else {
            console.log('CommonPlans: FEN lookup failed, falling back to ECO');
          }
        }
        
        // Fallback to ECO code lookup
        console.log('CommonPlans: Using ECO fallback for:', ecoCode);
        const response = await fetch(`/api/openings/eco-analysis/${ecoCode}`);
        const data = await response.json();
        
        if (data.success) {
          setEcoAnalysis(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch ECO analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    if (ecoCode || fen) {
      fetchECOAnalysis();
    }
  }, [ecoCode]);

  const renderPlansSection = (plans: string[], title: string, colorClass: string) => {
    if (!plans || plans.length === 0) {
      return (
        <div className={`plans-section ${colorClass}`}>
          {title && <h3>{title}</h3>}
          <ul className="plans-list">
            <li className="empty-plan">No specific plans documented yet.</li>
          </ul>
        </div>
      );
    }

    return (
      <div className={`plans-section ${colorClass}`}>
        {title && <h3>{title}</h3>}
        <ul className="plans-list">
          {plans.map((plan, index) => (
            <li key={index} className="plan-item">
              {plan}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (loading) {
    return (
      <section className={`common-plans content-panel ${className}`}>
        <div className="plans-header">
          <h2>Common Plans</h2>
        </div>
        <div className="plans-content">
          <div className="loading-state">
            <span>Loading common plans...</span>
          </div>
        </div>
      </section>
    );
  }

  const hasWhitePlans = ecoAnalysis?.white_plans && ecoAnalysis.white_plans.length > 0;
  const hasBlackPlans = ecoAnalysis?.black_plans && ecoAnalysis.black_plans.length > 0;

  if (!hasWhitePlans && !hasBlackPlans) {
    return (
      <section className={`common-plans content-panel ${className}`}>
        <div className="plans-header">
          <h2>Common Plans</h2>
        </div>
        <div className="plans-content">
          <div className="empty-state">
            <p>No common plans available for this opening.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`common-plans content-panel ${className}`}>
      <div className="plans-header">
        <h2>Common Plans</h2>
      </div>
      
      {/* Both sections displayed simultaneously */}
      <div className="plans-content">
        {hasWhitePlans && renderPlansSection(ecoAnalysis.white_plans, '', 'white-plans')}
        {hasBlackPlans && renderPlansSection(ecoAnalysis.black_plans, '', 'black-plans')}
      </div>
    </section>
  );
};

export default CommonPlans;
