/**
 * AchievementNotification Component
 * Animated popup when achievement is unlocked
 */

import React, { useEffect, useState } from 'react';
import type { Achievement } from '../config/achievements';
import { rarityColors } from '../config/achievements';
import { telegramService } from '../services/telegram.service';

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (achievement) {
      // Haptic feedback
      telegramService.hapticFeedback('success');

      // Animate in
      setTimeout(() => setIsVisible(true), 100);

      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 300);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 pointer-events-none">
      <div
        className={`relative pointer-events-auto transform transition-all duration-300 ${
          isVisible && !isLeaving
            ? 'translate-y-0 opacity-100 scale-100'
            : '-translate-y-4 opacity-0 scale-95'
        }`}
      >
        {/* Notification Card */}
        <div
          className={`relative bg-gradient-to-br ${rarityColors[achievement.rarity]} rounded-2xl p-6 shadow-2xl max-w-sm w-full`}
        >
          {/* Glow effect */}
          <div
            className={`absolute -inset-1 bg-gradient-to-r ${rarityColors[achievement.rarity]} rounded-2xl blur-xl opacity-50`}
          />

          {/* Content */}
          <div className="relative">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl">
                {achievement.emoji}
              </div>
              <div className="flex-1">
                <p className="text-white/80 text-sm font-medium mb-1">
                  🎉 Достижение разблокировано!
                </p>
                <h3 className="text-white text-lg font-bold">
                  {achievement.name}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-white/90 text-sm mb-4">
              {achievement.description}
            </p>

            {/* Reward */}
            {achievement.rewardXP && (
              <div className="flex items-center justify-between pt-3 border-t border-white/20">
                <span className="text-white/80 text-sm font-medium">
                  Награда
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white text-lg font-bold">
                    +{achievement.rewardXP}
                  </span>
                  <span className="text-white/80 text-sm">XP</span>
                </div>
              </div>
            )}

            {/* Sparkles animation */}
            <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
              ✨
            </div>
            <div className="absolute -top-3 -left-1 text-xl animate-bounce delay-100">
              ⭐
            </div>
            <div className="absolute -bottom-2 right-4 text-lg animate-bounce delay-200">
              💫
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              setIsLeaving(true);
              setTimeout(() => {
                setIsVisible(false);
                onClose();
              }, 300);
            }}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            ✕
          </button>
        </div>

        {/* Confetti effect (simple version with emojis) */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: '2s',
              }}
            >
              {['🎊', '🎉', '✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 6)]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
