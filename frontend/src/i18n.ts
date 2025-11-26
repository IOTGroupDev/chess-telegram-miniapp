/**
 * i18next Configuration for Telegram Mini App
 * Supports automatic language detection from Telegram WebApp API
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en/translation.json';
import ruTranslation from './locales/ru/translation.json';

// Custom language detector for Telegram Mini App
const telegramLanguageDetector = {
  name: 'telegramDetector',
  lookup(): string | undefined {
    // Try to get language from Telegram WebApp API
    if (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code) {
      const telegramLang = window.Telegram.WebApp.initDataUnsafe.user.language_code;
      console.log('[i18n] Detected language from Telegram:', telegramLang);
      return telegramLang;
    }
    return undefined;
  },
  cacheUserLanguage(lng: string): void {
    // Save to localStorage for persistence
    localStorage.setItem('i18nextLng', lng);
  },
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      ru: {
        translation: ruTranslation,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru'],
    debug: false, // Set to true for debugging

    // Language detection order
    detection: {
      order: [
        'telegramDetector', // Custom Telegram detector (highest priority)
        'localStorage',     // User's saved preference
        'navigator',        // Browser language
      ],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false, // Disable suspense to avoid loading issues
    },
  });

// Add custom Telegram language detector
const languageDetector = i18n.services.languageDetector;
if (languageDetector) {
  languageDetector.addDetector(telegramLanguageDetector);
}

// Log current language
console.log('[i18n] Initialized with language:', i18n.language);

export default i18n;
