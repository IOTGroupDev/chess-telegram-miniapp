import { initTelegramWebApp } from '@tma.js/sdk';
import { useAppStore } from '../store/useAppStore';
import type { TelegramUser } from '../store/useAppStore';

class TelegramService {
  private webApp: any = null;
  private store = useAppStore.getState();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      this.webApp = initTelegramWebApp();
      await this.webApp.ready();
      
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
        
        console.log('Telegram user authorized:', user);
      } else {
        console.log('No user data available');
        this.store.setAuthorized(false);
      }
    } catch (error) {
      console.error('Failed to initialize Telegram WebApp:', error);
      this.store.setError('Failed to initialize Telegram WebApp');
    }
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

  public showConfirm(message: string, callback?: (confirmed: boolean) => void): void {
    this.webApp?.showConfirm(message, callback);
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

  // Haptic feedback
  public impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium'): void {
    this.webApp?.HapticFeedback?.impactOccurred(style);
  }

  public notificationOccurred(type: 'error' | 'success' | 'warning' = 'success'): void {
    this.webApp?.HapticFeedback?.notificationOccurred(type);
  }

  public selectionChanged(): void {
    this.webApp?.HapticFeedback?.selectionChanged();
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
}

// Singleton instance
export const telegramService = new TelegramService();
