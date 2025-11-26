/**
 * Telegram Mini Apps Service
 * Official integration with Telegram WebApp API
 * Documentation: https://core.telegram.org/bots/webapps
 */

import { useAppStore } from '../store/useAppStore';
import type { TelegramUser } from '../store/useAppStore';
import i18n from '../i18n';

// // Extend Window interface for Telegram WebApp
// declare global {
//   interface Window {
//     Telegram?: {
//       WebApp: any;
//     };
//   }
// }

class TelegramService {
  private webApp: any = null;
  private store = useAppStore.getState();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Check if Telegram WebApp is available
      if (!window.Telegram?.WebApp) {
        console.warn('Telegram WebApp not available (running outside Telegram)');
        this.setupMockEnvironment();
        return;
      }

      this.webApp = window.Telegram.WebApp;

      console.log('[TelegramService] WebApp SDK available, version:', this.webApp.version);

      // Set header color to match theme
      this.webApp.setHeaderColor('secondary_bg_color');

      // Enable closing confirmation
      this.webApp.enableClosingConfirmation();



      // Get user data from initDataUnsafe
      const userData = this.webApp.initDataUnsafe?.user;

      if (userData) {
        const user: TelegramUser = {
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
          language_code: userData.language_code,
          is_premium: userData.is_premium,
          photo_url: userData.photo_url,
        };

        this.store.setUser(user);
        this.store.setAuthorized(true);

        // Set language from Telegram
        if (userData.language_code) {
          const language = this.mapTelegramLanguage(userData.language_code);
          i18n.changeLanguage(language);
          this.store.setLanguage(language);
          console.log('🌍 Language set from Telegram:', language);
        }

        console.log('✅ Telegram Mini App initialized:', {
          version: this.webApp.version,
          platform: this.webApp.platform,
          colorScheme: this.webApp.colorScheme,
          user: user.first_name,
          language: userData.language_code,
        });
      } else {
        console.log('⚠️ No user data available from Telegram');
        this.store.setAuthorized(false);
      }

      // Apply Telegram theme colors
      this.applyTelegramTheme();

      // Listen to theme changes
      this.webApp.onEvent('themeChanged', () => {
        this.applyTelegramTheme();
      });

    } catch (error) {
      console.error('❌ Failed to initialize Telegram WebApp:', error);
      this.store.setError('Failed to initialize Telegram WebApp');
      this.setupMockEnvironment();
    }
  }

  /**
   * Map Telegram language code to supported app languages
   */
  private mapTelegramLanguage(telegramLang: string): string {
    // Map Telegram language codes to app language codes
    const languageMap: { [key: string]: string } = {
      'ru': 'ru',
      'en': 'en',
      'es': 'es',
      'uk': 'ru', // Ukrainian -> Russian (fallback)
      'be': 'ru', // Belarusian -> Russian (fallback)
      'kk': 'ru', // Kazakh -> Russian (fallback)
    };

    return languageMap[telegramLang] || 'en'; // Default to English
  }

  /**
   * Apply Telegram theme colors to CSS variables
   */
  private applyTelegramTheme(): void {
    if (!this.webApp) return;

    const theme = this.webApp.themeParams;
    const root = document.documentElement;

    // Apply theme colors as CSS variables
    if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
    if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
    if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
    if (theme.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
    if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
    if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
    if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);

    console.log('🎨 Telegram theme applied:', this.webApp.colorScheme);
  }

  /**
   * Setup mock environment for development/testing
   */
  private setupMockEnvironment(): void {
    console.log('🔧 Running in mock mode (outside Telegram)');

    const mockUser: TelegramUser = {
      id: 12345678,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'ru',
      is_premium: false,
    };

    this.store.setUser(mockUser);
    this.store.setAuthorized(true);
    
  }

  // Getters
  public getUser(): TelegramUser | null {
    return this.store.user;
  }

  public isAuthorized(): boolean {
    return this.store.isAuthorized;
  }

  public getWebApp(): any {
    return this.webApp;
  }

  public getInitData(): string {
    return this.webApp?.initData || '';
  }

  public getInitDataUnsafe(): any {
    return this.webApp?.initDataUnsafe || {};
  }

  // UI Methods
  public showAlert(message: string): void {
    this.webApp?.showAlert(message);
  }

  public showConfirm(message: string, callback?: (confirmed: boolean) => void): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.webApp?.showConfirm) {
        this.webApp.showConfirm(message, (confirmed: boolean) => {
          if (callback) callback(confirmed);
          resolve(confirmed);
        });
      } else {
        // Mock mode - return true
        const confirmed = window.confirm(message);
        if (callback) callback(confirmed);
        resolve(confirmed);
      }
    });
  }

  public showPopup(params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void): void {
    this.webApp?.showPopup(params, callback);
  }

  /**
   * Haptic Feedback - vibration for user interactions
   * Makes the app feel more native
   */
  public hapticFeedback(type: 'impact' | 'notification' | 'selection', style?: string): void {
    if (!this.webApp?.HapticFeedback) return;

    switch (type) {
      case 'impact':
        // style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
        this.webApp.HapticFeedback.impactOccurred(style || 'medium');
        break;
      case 'notification':
        // style: 'error' | 'success' | 'warning'
        this.webApp.HapticFeedback.notificationOccurred(style || 'success');
        break;
      case 'selection':
        this.webApp.HapticFeedback.selectionChanged();
        break;
    }
  }

  // Convenience methods for haptic feedback
  public impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium'): void {
    this.hapticFeedback('impact', style);
  }

  public notificationOccurred(type: 'error' | 'success' | 'warning' = 'success'): void {
    this.hapticFeedback('notification', type);
  }

  public selectionChanged(): void {
    this.hapticFeedback('selection');
  }

  // Theme
  public getThemeParams(): any {
    return this.webApp?.themeParams || {};
  }

  public isDark(): boolean {
    return this.webApp?.colorScheme === 'dark';
  }

  // Main button
  public setMainButton(text: string, onClick: () => void): void {
    this.webApp?.MainButton?.setText(text);
    this.webApp?.MainButton?.onClick(onClick);
    this.webApp?.MainButton?.show();
  }

  public hideMainButton(): void {
    this.webApp?.MainButton?.hide();
  }

  // Back button
  public setBackButton(onClick: () => void): void {
    this.webApp?.BackButton?.onClick(onClick);
    this.webApp?.BackButton?.show();
  }

  public hideBackButton(): void {
    this.webApp?.BackButton?.hide();
  }

  // Closing
  public close(): void {
    this.webApp?.close();
  }

  public expand(): void {
    this.webApp?.expand();
  }

  // Data sharing
  public sendData(data: any): void {
    this.webApp?.sendData(JSON.stringify(data));
  }

  // Links
  public openLink(url: string, options?: { try_instant_view?: boolean }): void {
    this.webApp?.openLink(url, options);
  }

  public openTelegramLink(url: string): void {
    this.webApp?.openTelegramLink(url);
  }

  // Invoice
  public openInvoice(url: string, callback?: (status: string) => void): void {
    this.webApp?.openInvoice(url, callback);
  }

  // QR Scanner
  public showScanQrPopup(params: {
    text?: string;
  }, callback?: (text: string) => void): void {
    this.webApp?.showScanQrPopup(params, callback);
  }

  public closeScanQrPopup(): void {
    this.webApp?.closeScanQrPopup();
  }

  // Clipboard
  public readTextFromClipboard(callback?: (text: string) => void): void {
    this.webApp?.readTextFromClipboard(callback);
  }

  // Access
  public requestWriteAccess(callback?: (granted: boolean) => void): void {
    this.webApp?.requestWriteAccess(callback);
  }

  public requestContact(callback?: (granted: boolean) => void): void {
    this.webApp?.requestContact(callback);
  }

  // Language
  public changeLanguage(language: string): void {
    i18n.changeLanguage(language);
    this.store.setLanguage(language);
    console.log('🌍 Language changed to:', language);
  }

  public getCurrentLanguage(): string {
    return i18n.language;
  }
}

// Singleton instance
export const telegramService = new TelegramService();
