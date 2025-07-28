import React, { useState, useEffect } from 'react';
import '../../styles/index.css';

interface CommonPlansProps {
  ecoCode: string;
  className?: string;
}

interface ECOAnalysis {
  white_plans: string[];
  black_plans: string[];
  common_plans?: string[];
}

export const CommonPlans: React.FC<CommonPlansProps> = ({
  ecoCode,
  className = ''
}) => {
  const [ecoAnalysis, setEcoAnalysis] = useState<ECOAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  // Simplified ECO analysis fetch
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
        console.error('Failed to fetch ECO analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    if (ecoCode) {
      fetchECOAnalysis();
    }
  }, [ecoCode]);

  if (loading) {
    return (
      <section className={`common-plans content-panel ${className}`}>
        <h3>Common Plans</h3>
        <div className="loading-state">Loading common plans...</div>
      </section>
    );
  }

  // Get only common plans from the ECO data
  const getCommonPlans = (): string[] => {
    return ecoAnalysis?.common_plans || [];
  };

  const commonPlans = getCommonPlans();

  if (commonPlans.length === 0) {
    return (
      <section className={`common-plans content-panel ${className}`}>
        <h3>Common Plans</h3>
        <div className="empty-state">No common plans available for this opening.</div>
      </section>
    );
  }

  return (
    <section className={`common-plans content-panel ${className}`}>
      <h3>Common Plans</h3>
      <div className="plans-list">
        {commonPlans.map((plan, index) => (
          <div key={index} className="plan-item">
            {plan}
          </div>
        ))}
      </div>
    </section>
  );
};

export default CommonPlans;
