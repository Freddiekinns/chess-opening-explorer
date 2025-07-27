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

  if (loading) {
    return (
      <section className={`common-plans content-panel ${className}`}>
        <div className="plans-header">
          <h3>Common Plans</h3>
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
  const hasCommonPlans = ecoAnalysis?.common_plans && ecoAnalysis.common_plans.length > 0;

  // Combine all plans into one unified list, prioritizing common_plans if available
  const getAllPlans = (): string[] => {
    if (hasCommonPlans) {
      return ecoAnalysis.common_plans || [];
    }
    
    // If no common_plans, combine white and black plans
    const allPlans: string[] = [];
    if (hasWhitePlans) {
      allPlans.push(...ecoAnalysis.white_plans);
    }
    if (hasBlackPlans) {
      allPlans.push(...ecoAnalysis.black_plans);
    }
    return allPlans;
  };

  const allPlans = getAllPlans();

  if (allPlans.length === 0) {
    return (
      <section className={`common-plans content-panel ${className}`}>
        <div className="plans-header">
          <h3>Common Plans</h3>
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
        <h3>Common Plans</h3>
      </div>
      
      {/* Single unified plans list */}
      <div className="plans-content">
        <ul className="plans-list">
          {allPlans.map((plan, index) => (
            <li key={index} className="plan-item">
              {plan}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default CommonPlans;
