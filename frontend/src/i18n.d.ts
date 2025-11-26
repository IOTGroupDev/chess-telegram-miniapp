/**
 * TypeScript definitions for i18next
 * Provides type safety for translation keys
 */

import 'react-i18next';
import type enTranslation from './locales/en/translation.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof enTranslation;
    };
  }
}
