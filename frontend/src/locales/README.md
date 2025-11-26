# 🌍 Multilingual Support

This directory contains translation files for the Chess Telegram Mini App.

## Structure

```
locales/
├── en/
│   └── translation.json  # English translations
├── ru/
│   └── translation.json  # Russian translations
└── README.md
```

## Supported Languages

- **English** (en) - Default language
- **Russian** (ru) - Русский язык

## How to Add a New Language

1. Create a new directory with the language code (e.g., `es` for Spanish)
2. Copy `en/translation.json` to the new directory
3. Translate all values (keep keys unchanged)
4. Add the language to `i18n.ts`:

```typescript
import esTranslation from './locales/es/translation.json';

// In resources:
resources: {
  en: { translation: enTranslation },
  ru: { translation: ruTranslation },
  es: { translation: esTranslation }, // Add new language
}
```

5. Add language mapping in `telegramService.ts`:

```typescript
private mapTelegramLanguage(telegramLang: string): string {
  const languageMap: { [key: string]: string } = {
    'ru': 'ru',
    'en': 'en',
    'es': 'es', // Add mapping
  };
  return languageMap[telegramLang] || 'en';
}
```

6. Add language option to `LanguageSelector.tsx`:

```typescript
const languages: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }, // Add option
];
```

## How to Use Translations in Components

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p>{t('menu.playOnline')}</p>
    </div>
  );
}
```

## Features

- ✅ **Automatic language detection** from Telegram user settings
- ✅ **Persistent language selection** via localStorage
- ✅ **Type-safe translations** with TypeScript
- ✅ **Manual language switching** via LanguageSelector component
- ✅ **Fallback to English** if translation is missing

## Translation Keys Structure

```json
{
  "app": {
    "title": "App title",
    "subtitle": "App subtitle"
  },
  "menu": {
    "playOnline": "Menu item",
    ...
  },
  "game": {
    "findingOpponent": "Status message",
    ...
  },
  "errors": {
    "authRequired": "Error message",
    ...
  }
}
```

## Best Practices

1. **Keep keys descriptive**: Use `menu.playOnline` instead of `m1`
2. **Group related keys**: Use namespaces like `game.*`, `errors.*`
3. **Avoid hardcoded text**: Always use `t('key')` instead of plain strings
4. **Test all languages**: Ensure UI doesn't break with longer translations
5. **Use interpolation** for dynamic content: `t('welcome', { name: 'User' })`

## Telegram Integration

The app automatically detects user's language from Telegram:

```typescript
window.Telegram.WebApp.initDataUnsafe.user.language_code
```

Supported Telegram language codes:
- `ru` → Russian
- `en` → English
- `uk` → Russian (fallback)
- `be` → Russian (fallback)
- Others → English (default)
