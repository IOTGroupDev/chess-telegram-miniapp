import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { telegramService } from '../services/telegramService';

export const ThemeSelector: React.FC = () => {
  const { currentTheme, changeTheme, availableThemes } = useTheme();

  const handleThemeChange = (themeId: string) => {
    changeTheme(themeId);
    telegramService.hapticFeedback('selection');
  };

  return (
    <div className="space-y-3">
      <h3 className="text-white font-bold text-lg flex items-center gap-2">
        <span className="text-xl">🎨</span>
        <span>Board Theme</span>
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {availableThemes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className={`relative p-4 rounded-xl transition-all active:scale-95 ${
              currentTheme.id === theme.id
                ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-2 border-white/30 shadow-lg'
                : 'bg-slate-800/50 border-2 border-white/10 hover:border-white/20'
            }`}
          >
            {/* Selected indicator */}
            {currentTheme.id === theme.id && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Theme emoji */}
            <div className="text-3xl mb-2">{theme.emoji}</div>

            {/* Theme name */}
            <div className="text-white font-bold text-sm mb-1">{theme.name}</div>

            {/* Theme preview - mini board */}
            <div className="grid grid-cols-4 gap-0.5 w-full aspect-square rounded overflow-hidden">
              {[...Array(16)].map((_, i) => {
                const isLightSquare = (Math.floor(i / 4) + (i % 4)) % 2 === 0;
                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: isLightSquare ? theme.lightSquare : theme.darkSquare,
                    }}
                  />
                );
              })}
            </div>

            {/* Theme description */}
            <div className="text-xs text-slate-300 mt-2">{theme.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
