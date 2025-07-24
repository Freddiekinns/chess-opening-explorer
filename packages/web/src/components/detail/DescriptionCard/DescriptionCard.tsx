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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getDifficultyColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return '#28a745';
      case 'intermediate': return '#ffc107';
      case 'advanced': return '#fd7e14';
      case 'expert': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatTagsList = (tags: string[], type: string) => {
    return tags.map((tag, index) => (
      <span key={index} className={`tag ${type}-tag`}>
        {tag}
      </span>
    ));
  };

  if (loading) {
    return (
      <section className={`description-card content-panel ${className}`}>
        <h2>Opening Analysis</h2>
        <div className="loading-state">
          <span>Loading opening analysis...</span>
        </div>
      </section>
    );
  }

  return (
    <section className={`description-card content-panel ${className}`}>
      <h2>Opening Analysis</h2>
      
      {/* Main Description from ECO data */}
      <div className="description-section">
        <p className="description-text">
          {ecoAnalysis?.description || fallbackDescription || 'No description available for this opening.'}
        </p>
      </div>

      {/* Complexity Badge */}
      {ecoAnalysis?.complexity && (
        <div className="complexity-section">
          <span 
            className="complexity-badge"
            style={{ backgroundColor: getDifficultyColor(ecoAnalysis.complexity) }}
          >
            {ecoAnalysis.complexity}
          </span>
        </div>
      )}

      {/* Style Tags */}
      {ecoAnalysis?.style_tags && ecoAnalysis.style_tags.length > 0 && (
        <div className="section">
          <button
            className="section-toggle"
            onClick={() => toggleSection('style')}
            aria-expanded={expandedSection === 'style'}
          >
            <span className="section-title">Strategic Style</span>
            <span className={`toggle-icon ${expandedSection === 'style' ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
          
          {expandedSection === 'style' && (
            <div className="section-content">
              <div className="tags-container">
                {formatTagsList(ecoAnalysis.style_tags, 'style')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tactical Tags */}
      {ecoAnalysis?.tactical_tags && ecoAnalysis.tactical_tags.length > 0 && (
        <div className="section">
          <button
            className="section-toggle"
            onClick={() => toggleSection('tactical')}
            aria-expanded={expandedSection === 'tactical'}
          >
            <span className="section-title">Tactical Themes</span>
            <span className={`toggle-icon ${expandedSection === 'tactical' ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
          
          {expandedSection === 'tactical' && (
            <div className="section-content">
              <div className="tags-container">
                {formatTagsList(ecoAnalysis.tactical_tags, 'tactical')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Positional Tags */}
      {ecoAnalysis?.positional_tags && ecoAnalysis.positional_tags.length > 0 && (
        <div className="section">
          <button
            className="section-toggle"
            onClick={() => toggleSection('positional')}
            aria-expanded={expandedSection === 'positional'}
          >
            <span className="section-title">Positional Elements</span>
            <span className={`toggle-icon ${expandedSection === 'positional' ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
          
          {expandedSection === 'positional' && (
            <div className="section-content">
              <div className="tags-container">
                {formatTagsList(ecoAnalysis.positional_tags, 'positional')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Strategic Themes */}
      {ecoAnalysis?.strategic_themes && ecoAnalysis.strategic_themes.length > 0 && (
        <div className="section">
          <button
            className="section-toggle"
            onClick={() => toggleSection('strategic')}
            aria-expanded={expandedSection === 'strategic'}
          >
            <span className="section-title">Strategic Themes</span>
            <span className={`toggle-icon ${expandedSection === 'strategic' ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
          
          {expandedSection === 'strategic' && (
            <div className="section-content">
              <div className="tags-container">
                {formatTagsList(ecoAnalysis.strategic_themes, 'strategic')}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default DescriptionCard;
