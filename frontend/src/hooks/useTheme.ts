import { useState, useEffect } from 'react';
import type { BoardTheme } from '../config/themes';
import { boardThemes, defaultTheme } from '../config/themes';

const THEME_STORAGE_KEY = 'chess_board_theme';

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<BoardTheme>(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedThemeId) {
      const theme = boardThemes.find(t => t.id === savedThemeId);
      if (theme) {
        setCurrentTheme(theme);
      }
    }
  }, []);

  // Save theme to localStorage when it changes
  const changeTheme = (themeId: string) => {
    const theme = boardThemes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }
  };

  return {
    currentTheme,
    changeTheme,
    availableThemes: boardThemes,
  };
};
