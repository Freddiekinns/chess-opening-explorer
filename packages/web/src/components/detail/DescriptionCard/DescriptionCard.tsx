import React, { useState, useEffect } from 'react';
import './DescriptionCard.css';

interface DescriptionCardProps {
  ecoCode: string;
  fen?: string; // Add FEN for precise position lookup
  fallbackDescription?: string;
  className?: string;
}

interface ECOAnalysis {
  description: string;
  style_tags: string[];
  tactical_tags: string[];
  positional_tags: string[];
  strategic_themes?: string[];
  complexity: string;
  white_plans: string[];
  black_plans: string[];
  common_plans?: string[];
  name?: string;
  eco?: string;
}

export const DescriptionCard: React.FC<DescriptionCardProps> = ({
  ecoCode,
  fen,
  fallbackDescription,
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
          console.log('DescriptionCard: Attempting FEN-based lookup for:', fen);
          const response = await fetch('/api/openings/fen-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fen }),
          });
          const data = await response.json();
          
          console.log('DescriptionCard: FEN lookup response:', data);
          
          if (data.success) {
            console.log('DescriptionCard: Using FEN-based data for:', data.data.name);
            setEcoAnalysis(data.data);
            return;
          } else {
            console.log('DescriptionCard: FEN lookup failed, falling back to ECO');
          }
        }
        
        // Fallback to ECO code lookup
        console.log('DescriptionCard: Using ECO fallback for:', ecoCode);
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
  }, [ecoCode, fen]);

  if (loading) {
    return (
      <section className={`description-card content-panel ${className}`}>
        <div className="description-header">
          <h3>Opening Analysis</h3>
        </div>
        <div className="description-content">
          <div className="loading-state">
            <span>Loading opening analysis...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`description-card content-panel ${className}`}>
      <div className="description-header">
        <h3>Opening Analysis</h3>
      </div>
      
      {/* Main Description from ECO data - Only show description text */}
      <div className="description-content">
        <p className="description-text">
          {ecoAnalysis?.description || fallbackDescription || 'No description available for this opening.'}
        </p>
      </div>
    </section>
  );
};

export default DescriptionCard;
