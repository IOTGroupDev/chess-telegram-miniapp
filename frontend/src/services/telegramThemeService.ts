/**
 * Telegram Theme Service
 * Customizes Telegram Mini App appearance to match our modern design
 */

class TelegramThemeService {
  private initialized = false;

  /**
   * Initialize Telegram theme customization
   * Should be called once when app starts
   */
  initialize() {
    if (this.initialized || !window.Telegram?.WebApp) {
      return;
    }

    const webApp = window.Telegram.WebApp;

    console.log('[TelegramTheme] Initializing theme customization...');
    console.log('[TelegramTheme] Current theme params:', webApp.themeParams);

    try {
      // Apply CSS variables from Telegram theme
      this.applyCSSVariables();

      // Expand app to full screen
      webApp.expand();

      // Set header color to match our design (modern clean header)
      if (webApp.setHeaderColor) {
        webApp.setHeaderColor('secondary_bg_color');
        console.log('[TelegramTheme] Header color set to secondary_bg_color');
      }

      // Set background color to match theme
      if (webApp.setBackgroundColor) {
        webApp.setBackgroundColor(webApp.themeParams.bg_color || '#ffffff');
        console.log('[TelegramTheme] Background color set to:', webApp.themeParams.bg_color);
      }

      // Set bottom bar color (for devices with bottom navigation)
      if (webApp.setBottomBarColor) {
        webApp.setBottomBarColor('secondary_bg_color');
        console.log('[TelegramTheme] Bottom bar color set to secondary_bg_color');
      }

      // Enable closing confirmation for games in progress
      webApp.enableClosingConfirmation();
      console.log('[TelegramTheme] Closing confirmation enabled');

      // Disable vertical swipes to prevent accidental closes
      if (webApp.disableVerticalSwipes) {
        webApp.disableVerticalSwipes();
        console.log('[TelegramTheme] Vertical swipes disabled');
      }

      this.initialized = true;
      console.log('[TelegramTheme] ✅ Theme initialized successfully');
    } catch (err) {
      console.error('[TelegramTheme] ❌ Failed to initialize theme:', err);
    }
  }

  /**
   * Show Telegram MainButton with custom styling
   */
  showMainButton(text: string, onClick: () => void, options?: {
    color?: string;
    textColor?: string;
    isActive?: boolean;
    isVisible?: boolean;
  }) {
    if (!window.Telegram?.WebApp?.MainButton) return;

    const mainButton = window.Telegram.WebApp.MainButton;

    // Set button properties
    mainButton.text = text;
    mainButton.color = options?.color || window.Telegram.WebApp.themeParams.button_color || '#3390ec';
    mainButton.textColor = options?.textColor || window.Telegram.WebApp.themeParams.button_text_color || '#ffffff';

    if (options?.isActive !== undefined) {
      if (options.isActive) {
        mainButton.enable();
      } else {
        mainButton.disable();
      }
    }

    // Set click handler
    mainButton.onClick(onClick);

    // Show button
    if (options?.isVisible !== false) {
      mainButton.show();
    }

    console.log('[TelegramTheme] MainButton configured:', { text, color: mainButton.color });
  }

  /**
   * Hide Telegram MainButton
   */
  hideMainButton() {
    if (!window.Telegram?.WebApp?.MainButton) return;
    window.Telegram.WebApp.MainButton.hide();
    console.log('[TelegramTheme] MainButton hidden');
  }

  /**
   * Update MainButton text
   */
  updateMainButtonText(text: string) {
    if (!window.Telegram?.WebApp?.MainButton) return;
    window.Telegram.WebApp.MainButton.text = text;
  }

  /**
   * Show loading state on MainButton
   */
  showMainButtonProgress() {
    if (!window.Telegram?.WebApp?.MainButton) return;
    window.Telegram.WebApp.MainButton.showProgress(true);
  }

  /**
   * Hide loading state on MainButton
   */
  hideMainButtonProgress() {
    if (!window.Telegram?.WebApp?.MainButton) return;
    window.Telegram.WebApp.MainButton.hideProgress();
  }

  /**
   * Get theme colors for consistent styling
   */
  getThemeColors() {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) {
      return {
        bgColor: '#ffffff',
        textColor: '#000000',
        hintColor: '#999999',
        linkColor: '#3390ec',
        buttonColor: '#3390ec',
        buttonTextColor: '#ffffff',
        secondaryBgColor: '#f4f4f5',
        headerBgColor: '#ffffff',
        accentTextColor: '#3390ec',
        sectionBgColor: '#ffffff',
        sectionHeaderTextColor: '#6d6d71',
        subtitleTextColor: '#999999',
        destructiveTextColor: '#ff3b30',
      };
    }

    return {
      bgColor: webApp.themeParams.bg_color || '#ffffff',
      textColor: webApp.themeParams.text_color || '#000000',
      hintColor: webApp.themeParams.hint_color || '#999999',
      linkColor: webApp.themeParams.link_color || '#3390ec',
      buttonColor: webApp.themeParams.button_color || '#3390ec',
      buttonTextColor: webApp.themeParams.button_text_color || '#ffffff',
      secondaryBgColor: webApp.themeParams.secondary_bg_color || '#f4f4f5',
      headerBgColor: webApp.themeParams.header_bg_color || '#ffffff',
      accentTextColor: webApp.themeParams.accent_text_color || '#3390ec',
      sectionBgColor: webApp.themeParams.section_bg_color || '#ffffff',
      sectionHeaderTextColor: webApp.themeParams.section_header_text_color || '#6d6d71',
      subtitleTextColor: webApp.themeParams.subtitle_text_color || '#999999',
      destructiveTextColor: webApp.themeParams.destructive_text_color || '#ff3b30',
    };
  }

  /**
   * Check if dark mode is enabled
   */
  isDarkMode(): boolean {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return false;

    return webApp.colorScheme === 'dark';
  }

  /**
   * Listen for theme changes
   */
  onThemeChanged(callback: () => void) {
    if (!window.Telegram?.WebApp) return;

    window.Telegram.WebApp.onEvent('themeChanged', () => {
      // Reapply CSS variables when theme changes
      this.applyCSSVariables();
      callback();
    });
    console.log('[TelegramTheme] Theme change listener registered');
  }

  /**
   * Apply Telegram theme as CSS variables
   * This ensures theme colors are available throughout the app
   */
  private applyCSSVariables() {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    const root = document.documentElement;
    const theme = webApp.themeParams;

    // Set CSS variables for Telegram colors
    root.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#ffffff');
    root.style.setProperty('--tg-theme-text-color', theme.text_color || '#000000');
    root.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#999999');
    root.style.setProperty('--tg-theme-link-color', theme.link_color || '#3390ec');
    root.style.setProperty('--tg-theme-button-color', theme.button_color || '#3390ec');
    root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
    root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#f4f4f5');
    root.style.setProperty('--tg-theme-header-bg-color', theme.header_bg_color || '#ffffff');
    root.style.setProperty('--tg-theme-accent-text-color', theme.accent_text_color || '#3390ec');
    root.style.setProperty('--tg-theme-section-bg-color', theme.section_bg_color || '#ffffff');
    root.style.setProperty('--tg-theme-section-header-text-color', theme.section_header_text_color || '#6d6d71');
    root.style.setProperty('--tg-theme-subtitle-text-color', theme.subtitle_text_color || '#999999');
    root.style.setProperty('--tg-theme-destructive-text-color', theme.destructive_text_color || '#ff3b30');

    console.log('[TelegramTheme] CSS variables applied:', {
      bgColor: theme.bg_color,
      textColor: theme.text_color,
      buttonColor: theme.button_color,
    });
  }
}

// Singleton instance
export const telegramThemeService = new TelegramThemeService();
