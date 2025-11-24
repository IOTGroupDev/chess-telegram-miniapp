/**
 * Hook for managing Telegram WebApp BackButton
 * https://core.telegram.org/bots/webapps#backbutton
 */

import { useEffect } from 'react';
import { telegramService } from '../services/telegramService';

export function useTelegramBackButton(onBack?: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) {
      telegramService.hideBackButton();
      return;
    }

    const webApp = telegramService.getWebApp();
    if (!webApp || !webApp.BackButton) return;

    // Show back button
    webApp.BackButton.show();

    // Set callback
    const handleBack = () => {
      if (onBack) {
        onBack();
      } else {
        window.history.back();
      }
    };

    webApp.BackButton.onClick(handleBack);

    // Cleanup
    return () => {
      webApp.BackButton.offClick(handleBack);
      webApp.BackButton.hide();
    };
  }, [onBack, enabled]);
}
