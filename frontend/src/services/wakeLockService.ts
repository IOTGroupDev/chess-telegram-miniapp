/**
 * Wake Lock Service
 * Prevents screen from sleeping during AI moves in Telegram Mini App
 * Critical for good UX - user shouldn't have screen turn off while waiting for AI
 *
 * Features:
 * - Automatically re-acquires wake lock when page becomes visible
 * - Handles Telegram Mini App lifecycle (minimize/restore)
 * - Full compatibility with iOS Safari, Android Chrome, and Telegram WebView
 */

class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private isSupported: boolean = false;
  private shouldBeActive: boolean = false; // Track if we want wake lock active

  constructor() {
    // Check if Wake Lock API is supported
    this.isSupported = 'wakeLock' in navigator;
    console.log('[WakeLock] Wake Lock API supported:', this.isSupported);
    console.log('[WakeLock] Browser:', navigator.userAgent);
    console.log('[WakeLock] Is HTTPS:', window.location.protocol === 'https:');
    console.log('[WakeLock] Telegram WebApp:', window.Telegram?.WebApp ? 'Yes' : 'No');

    // Handle visibility changes (critical for Telegram Mini Apps)
    // When user returns to app, wake lock is auto-released and must be re-acquired
    document.addEventListener('visibilitychange', async () => {
      console.log('[WakeLock] Visibility changed:', document.visibilityState);

      if (document.visibilityState === 'visible' && this.shouldBeActive) {
        console.log('[WakeLock] Page visible again, re-acquiring wake lock...');
        await this.acquire();
      }
    });
  }

  /**
   * Request wake lock to keep screen on
   * Call this when AI starts thinking
   */
  async acquire(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[WakeLock] Wake Lock API not supported in this browser');
      console.warn('[WakeLock] Browser info:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor
      });
      return false;
    }

    try {
      // Mark that we want wake lock active
      this.shouldBeActive = true;

      // Release existing lock if any
      if (this.wakeLock && !this.wakeLock.released) {
        await this.wakeLock.release();
      }

      // Request new wake lock
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('[WakeLock] ✅ Wake lock acquired - screen will stay on');
      console.log('[WakeLock] Wake lock type:', this.wakeLock.type);
      console.log('[WakeLock] Released:', this.wakeLock.released);

      // Listen for release (e.g., if tab becomes hidden or user switches apps)
      this.wakeLock.addEventListener('release', () => {
        console.log('[WakeLock] ⚠️ Wake lock auto-released (user switched apps or minimized)');
      });

      return true;
    } catch (err) {
      console.error('[WakeLock] ❌ Failed to acquire wake lock:', err);
      if (err instanceof Error) {
        console.error('[WakeLock] Error name:', err.name);
        console.error('[WakeLock] Error message:', err.message);

        // Specific error handling
        if (err.name === 'NotAllowedError') {
          console.error('[WakeLock] NotAllowedError - Wake lock requires user interaction first (tap/click)');
          console.error('[WakeLock] This is normal on iOS - wake lock triggered after user move should work');
        }
      }
      return false;
    }
  }

  /**
   * Release wake lock
   * Call this when AI finishes move
   */
  async release(): Promise<void> {
    // Mark that we no longer want wake lock active
    this.shouldBeActive = false;

    if (this.wakeLock && !this.wakeLock.released) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('[WakeLock] ✅ Wake lock manually released - screen can sleep now');
      } catch (err) {
        console.error('[WakeLock] ❌ Failed to release wake lock:', err);
      }
    } else {
      console.log('[WakeLock] No active wake lock to release');
    }
  }

  /**
   * Get current wake lock status
   */
  isActive(): boolean {
    return this.wakeLock !== null && !this.wakeLock.released;
  }

  /**
   * Check if Wake Lock API is supported
   */
  isWakeLockSupported(): boolean {
    return this.isSupported;
  }
}

// Singleton instance
export const wakeLockService = new WakeLockService();
