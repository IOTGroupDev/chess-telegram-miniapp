/**
 * Wake Lock Service
 * Prevents screen from sleeping during AI moves in Telegram Mini App
 * Critical for good UX - user shouldn't have screen turn off while waiting for AI
 */

class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private isSupported: boolean = false;

  constructor() {
    // Check if Wake Lock API is supported
    this.isSupported = 'wakeLock' in navigator;
    console.log('[WakeLock] Wake Lock API supported:', this.isSupported);
  }

  /**
   * Request wake lock to keep screen on
   * Call this when AI starts thinking
   */
  async acquire(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[WakeLock] Wake Lock API not supported in this browser');
      return false;
    }

    try {
      // Release existing lock if any
      if (this.wakeLock) {
        await this.release();
      }

      // Request new wake lock
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('[WakeLock] Wake lock acquired - screen will stay on');

      // Listen for release (e.g., if tab becomes hidden)
      this.wakeLock.addEventListener('release', () => {
        console.log('[WakeLock] Wake lock released');
      });

      return true;
    } catch (err) {
      console.error('[WakeLock] Failed to acquire wake lock:', err);
      return false;
    }
  }

  /**
   * Release wake lock
   * Call this when AI finishes move
   */
  async release(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('[WakeLock] Wake lock manually released');
      } catch (err) {
        console.error('[WakeLock] Failed to release wake lock:', err);
      }
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
