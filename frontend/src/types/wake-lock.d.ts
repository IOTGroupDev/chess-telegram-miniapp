/**
 * TypeScript declarations for Wake Lock API
 * https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
 */

interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  readonly type: 'screen';
  release(): Promise<void>;
  addEventListener(
    type: 'release',
    listener: (this: WakeLockSentinel, ev: Event) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
}

interface Navigator {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
}
