import React from 'react';
import { useSound } from '../hooks/useSound';
import { telegramService } from '../services/telegramService';

export const SoundSettings: React.FC = () => {
  const { enabled, volume, toggleEnabled, updateVolume, playSound } = useSound();

  const handleToggle = () => {
    toggleEnabled();
    telegramService.hapticFeedback('selection');
    if (!enabled) {
      // Play a test sound when enabling
      setTimeout(() => playSound('move'), 100);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    updateVolume(newVolume);
    // Play a test sound
    playSound('move');
  };

  const testSound = () => {
    playSound('move');
    telegramService.hapticFeedback('selection');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔊</span>
          <h3 className="text-white font-bold text-lg">Sound Effects</h3>
        </div>

        {/* Enable/Disable Toggle */}
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            enabled ? 'bg-green-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Volume Slider */}
      {enabled && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Volume</span>
              <span className="text-white font-bold">{Math.round(volume * 100)}%</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-lg">🔉</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:bg-white
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:shadow-lg"
              />
              <span className="text-slate-400 text-lg">🔊</span>
            </div>
          </div>

          {/* Test Sound Button */}
          <button
            onClick={testSound}
            className="w-full bg-blue-600/50 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl backdrop-blur-sm border border-blue-500/20 hover:border-blue-500/40 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
            <span>Test Sound</span>
          </button>
        </>
      )}

      {/* Info */}
      <div className="text-xs text-slate-400 bg-slate-700/30 rounded-lg p-3">
        <p>
          {enabled
            ? '🎵 Sounds will play for moves, captures, and game events'
            : '🔇 Sound effects are disabled'}
        </p>
      </div>
    </div>
  );
};
