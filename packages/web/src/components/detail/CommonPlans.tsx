import React, { useState, useEffect } from 'react';

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
      <div className={`content-panel-improved ${className}`}>
        <h3 className="title-subsection">Common Plans</h3>
        <div className="loading-state">Loading common plans...</div>
      </div>
    );
  }

  // Get only common plans from the ECO data
  const getCommonPlans = (): string[] => {
    return ecoAnalysis?.common_plans || [];
  };

  const commonPlans = getCommonPlans();

  if (commonPlans.length === 0) {
    return (
      <div className={`content-panel-improved ${className}`}>
        <h3 className="title-subsection">Common Plans</h3>
        <p>No common plans available for this opening.</p>
      </div>
    );
  }

  return (
    <div className={`content-panel-improved ${className}`}>
      <h3 className="title-subsection">Common Plans</h3>
      <div className="plans-list">
        {commonPlans.map((plan, index) => (
          <div key={index} className="plan-item">
            <p>{plan}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommonPlans;
