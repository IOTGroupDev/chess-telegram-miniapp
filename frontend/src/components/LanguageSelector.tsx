/**
 * Language Selector Component
 * Allows users to manually switch between supported languages
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { telegramService } from '../services/telegramService';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const handleLanguageChange = (languageCode: string) => {
    telegramService.changeLanguage(languageCode);
    telegramService.hapticFeedback('impact', 'light');
  };

  return (
    <div className="glass rounded-2xl p-4 border border-white/20 shadow-xl">
      <h3 className="text-white font-bold text-base mb-3">🌍 Language</h3>
      <div className="space-y-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
              currentLanguage === lang.code
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="font-medium">{lang.name}</span>
            {currentLanguage === lang.code && (
              <span className="ml-auto text-sm">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
