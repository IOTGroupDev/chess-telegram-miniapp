// /**
//  * Wake Lock Service
//  * Prevents screen from sleeping during AI moves in Telegram Mini App
//  * Critical for good UX - user shouldn't have screen turn off while waiting for AI
//  *
//  * Features:
//  * - Automatically re-acquires wake lock when page becomes visible
//  * - Handles Telegram Mini App lifecycle (minimize/restore)
//  * - Full compatibility with iOS Safari, Android Chrome, and Telegram WebView
//  */
//
// class WakeLockService {
//   private wakeLock: WakeLockSentinel | null = null;
//   private isSupported: boolean = false;
//   private shouldBeActive: boolean = false; // Track if we want wake lock active
//
//   constructor() {
//     // Check if Wake Lock API is supported
//     this.isSupported = 'wakeLock' in navigator;
//     console.log('[WakeLock] Wake Lock API supported:', this.isSupported);
//     console.log('[WakeLock] Browser:', navigator.userAgent);
//     console.log('[WakeLock] Is HTTPS:', window.location.protocol === 'https:');
//     console.log('[WakeLock] Telegram WebApp:', window.Telegram?.WebApp ? 'Yes' : 'No');
//
//     // Handle visibility changes (critical for Telegram Mini Apps)
//     // When user returns to app, wake lock is auto-released and must be re-acquired
//     document.addEventListener('visibilitychange', async () => {
//       console.log('[WakeLock] Visibility changed:', document.visibilityState);
//
//       if (document.visibilityState === 'visible' && this.shouldBeActive) {
//         console.log('[WakeLock] Page visible again, re-acquiring wake lock...');
//         await this.acquire();
//       }
//     });
//   }
//
//   /**
//    * Request wake lock to keep screen on
//    * Call this when AI starts thinking
//    */
//   async acquire(): Promise<boolean> {
//     if (!this.isSupported) {
//       console.warn('[WakeLock] Wake Lock API not supported in this browser');
//       console.warn('[WakeLock] Browser info:', {
//         userAgent: navigator.userAgent,
//         platform: navigator.platform,
//         vendor: navigator.vendor
//       });
//       return false;
//     }
//
//     try {
//       // Mark that we want wake lock active
//       this.shouldBeActive = true;
//
//       // Release existing lock if any
//       if (this.wakeLock && !this.wakeLock.released) {
//         await this.wakeLock.release();
//       }
//
//       // Request new wake lock
//       this.wakeLock = await navigator.wakeLock.request('screen');
//       console.log('[WakeLock] ✅ Wake lock acquired - screen will stay on');
//       console.log('[WakeLock] Wake lock type:', this.wakeLock.type);
//       console.log('[WakeLock] Released:', this.wakeLock.released);
//
//       // Listen for release (e.g., if tab becomes hidden or user switches apps)
//       this.wakeLock.addEventListener('release', () => {
//         console.log('[WakeLock] ⚠️ Wake lock auto-released (user switched apps or minimized)');
//       });
//
//       return true;
//     } catch (err) {
//       console.error('[WakeLock] ❌ Failed to acquire wake lock:', err);
//       if (err instanceof Error) {
//         console.error('[WakeLock] Error name:', err.name);
//         console.error('[WakeLock] Error message:', err.message);
//
//         // Specific error handling
//         if (err.name === 'NotAllowedError') {
//           console.error('[WakeLock] NotAllowedError - Wake lock requires user interaction first (tap/click)');
//           console.error('[WakeLock] This is normal on iOS - wake lock triggered after user move should work');
//         }
//       }
//       return false;
//     }
//   }
//
//   /**
//    * Release wake lock
//    * Call this when AI finishes move
//    */
//   async release(): Promise<void> {
//     // Mark that we no longer want wake lock active
//     this.shouldBeActive = false;
//
//     if (this.wakeLock && !this.wakeLock.released) {
//       try {
//         await this.wakeLock.release();
//         this.wakeLock = null;
//         console.log('[WakeLock] ✅ Wake lock manually released - screen can sleep now');
//       } catch (err) {
//         console.error('[WakeLock] ❌ Failed to release wake lock:', err);
//       }
//     } else {
//       console.log('[WakeLock] No active wake lock to release');
//     }
//   }
//
//   /**
//    * Get current wake lock status
//    */
//   isActive(): boolean {
//     return this.wakeLock !== null && !this.wakeLock.released;
//   }
//
//   /**
//    * Check if Wake Lock API is supported
//    */
//   isWakeLockSupported(): boolean {
//     return this.isSupported;
//   }
// }
//
// // Singleton instance
// export const wakeLockService = new WakeLockService();


/**
 * Wake Lock Service
 * Вариант для Telegram Mini App:
 * 1) Если есть navigator.wakeLock — используем его.
 * 2) Если нет — включаем fallback через невидимое looping video.
 */

// src/services/wakeLockService.ts

class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private isSupported = false;
  private shouldBeActive = false;

  private fallbackVideo: HTMLVideoElement | null = null;
  private envReady = false;

  constructor() {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof navigator === 'undefined') {
      console.log('[WakeLock] No window/document/navigator - likely SSR, disabling');
      this.isSupported = false;
      this.envReady = false;
      return;
    }

    this.envReady = true;
    this.isSupported = 'wakeLock' in navigator;

    console.log('[WakeLock] Wake Lock API supported:', this.isSupported);
    console.log('[WakeLock] Browser:', navigator.userAgent);
    console.log('[WakeLock] Is HTTPS:', window.location.protocol === 'https:');
    console.log('[WakeLock] Telegram WebApp:', (window).Telegram?.WebApp ? 'Yes' : 'No');

    document.addEventListener('visibilitychange', () => {
      console.log('[WakeLock] Visibility changed:', document.visibilityState);

      if (document.visibilityState === 'visible' && this.shouldBeActive) {
        console.log('[WakeLock] Page visible again, re-acquiring wake lock or fallback...');
        void this.acquire();
      }
    });
  }

  // ---------- Fallback video ----------

  private startFallbackVideo() {
    if (!this.envReady) return;
    if (this.fallbackVideo) return;

    console.log('[WakeLock] Starting fallback video hack');

    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.muted = true;
    video.loop = true;
    video.style.position = 'fixed';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.bottom = '0';
    video.style.left = '0';

    video.src = '../assets/keepalive.mp4';

    document.body.appendChild(video);
    this.fallbackVideo = video;

    void video.play().catch((err) => {
      console.warn('[WakeLock] Fallback video play error:', err);
    });
  }

  private stopFallbackVideo() {
    const video = this.fallbackVideo;
    if (!video) return;

    console.log('[WakeLock] Stopping fallback video hack');

    try {
      video.pause();
    } catch {
      // ignore
    }

    video.remove();
    this.fallbackVideo = null;
  }

  // ---------- Main API ----------

  async acquire(): Promise<boolean> {
    if (!this.envReady) {
      console.warn('[WakeLock] Environment not ready (no window/document)');
      return false;
    }

    this.shouldBeActive = true;

    if (this.isSupported && (navigator).wakeLock) {
      try {
        // используем локальную переменную, чтобы TS понял, что не null
        const existing = this.wakeLock;
        if (existing && !existing.released) {
          await existing.release();
        }

        const wakeLock = await (navigator).wakeLock.request('screen');
        this.wakeLock = wakeLock;

        console.log('[WakeLock] ✅ Wake lock acquired - screen will stay on');
        console.log('[WakeLock] Wake lock type:', wakeLock.type);
        console.log('[WakeLock] Released:', wakeLock.released);

        wakeLock.addEventListener('release', () => {
          console.log('[WakeLock] ⚠️ Wake lock auto-released (user switched apps or minimized)');
        });

        this.stopFallbackVideo();

        return true;
      } catch (err) {
        console.error('[WakeLock] ❌ Failed to acquire wake lock:', err);
        if (err instanceof Error) {
          console.error('[WakeLock] Error name:', err.name);
          console.error('[WakeLock] Error message:', err.message);
        }
        // пойдём в fallback
      }
    } else {
      console.warn('[WakeLock] Wake Lock API not supported in this browser, using fallback');
      console.warn('[WakeLock] Browser info:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
      });
    }

    this.startFallbackVideo();
    return false;
  }

  async release(): Promise<void> {
    this.shouldBeActive = false;

    const current = this.wakeLock;
    if (current && !current.released) {
      try {
        await current.release();
        console.log('[WakeLock] 🔓 Wake lock released explicitly');
      } catch (err) {
        console.error('[WakeLock] Error releasing wake lock:', err);
      }
    }

    this.wakeLock = null;
    this.stopFallbackVideo();
  }

  isActive(): boolean {
    const wl = this.wakeLock;
    if (wl && !wl.released) return true;
    return !!this.fallbackVideo;
  }

  isWakeLockSupported(): boolean {
    return this.isSupported;
  }
}

export const wakeLockService = new WakeLockService();
