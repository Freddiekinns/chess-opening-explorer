import React from 'react';
import { useNavigate } from 'react-router-dom';

interface FloatingBackButtonProps {
  className?: string;
}

export const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({ 
  className = '' 
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Go back if there's history, otherwise go to home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <button 
      className={`floating-back-btn ${className}`}
      onClick={handleBack}
      aria-label="Go back"
      title="Go back"
    >
      ←
    </button>
  );
};

export default FloatingBackButton;
