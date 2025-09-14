import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './Button';

interface NavigationProps {
  showBackButton?: boolean;
  title?: string;
  onBack?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  showBackButton = false, 
  title,
  onBack
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (location.pathname === '/ai-game' || location.pathname === '/online-game') {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-telegram-secondary-bg">
      {showBackButton ? (
        <Button 
          onClick={handleBack} 
          variant="secondary" 
          size="sm"
          className="flex items-center gap-2"
        >
          ← Назад
        </Button>
      ) : (
        <div className="w-16"></div>
      )}
      
      {title && (
        <h1 className="text-lg font-bold text-telegram-text text-center flex-1">
          {title}
        </h1>
      )}
      
      <div className="w-16"></div>
    </div>
  );
};
