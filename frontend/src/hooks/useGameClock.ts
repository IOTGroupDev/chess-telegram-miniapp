/**
 * useGameClock Hook
 * Manages game clocks with Supabase Broadcast API
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import supabase from '../lib/supabaseClient';
import type { Game } from '../types/supabase';

interface ClockState {
  whiteTime: number; // milliseconds
  blackTime: number; // milliseconds
  activePlayer: 'white' | 'black' | null;
  isRunning: boolean;
}

interface ClockActions {
  startClock: (player: 'white' | 'black') => void;
  stopClock: () => void;
  switchClock: () => void;
}

export function useGameClock(
  gameId: string,
  game: Game | null,
  isMaster: boolean = false // Only one client should broadcast
): ClockState & ClockActions {
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [activePlayer, setActivePlayer] = useState<'white' | 'black' | null>(
    null
  );
  const [isRunning, setIsRunning] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Initialize clock from game
  useEffect(() => {
    if (game) {
      setWhiteTime(game.white_time_remaining || game.time_limit * 1000);
      setBlackTime(game.black_time_remaining || game.time_limit * 1000);

      // Determine active player
      if (game.status === 'active') {
        setActivePlayer(game.move_number % 2 === 0 ? 'white' : 'black');
      }
    }
  }, [game]);

  // Setup broadcast channel
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase.channel(`game-clock:${gameId}`);

    // Listen to clock ticks from other clients
    if (!isMaster) {
      channel.on('broadcast', { event: 'clock-tick' }, ({ payload }) => {
        setWhiteTime(payload.whiteTime);
        setBlackTime(payload.blackTime);
        setActivePlayer(payload.activePlayer);
      });
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [gameId, isMaster]);

  // Broadcast clock tick (only master)
  const broadcastTick = useCallback(
    (white: number, black: number, active: 'white' | 'black' | null) => {
      if (!isMaster || !channelRef.current) return;

      channelRef.current.send({
        type: 'broadcast',
        event: 'clock-tick',
        payload: {
          whiteTime: white,
          blackTime: black,
          activePlayer: active,
        },
      });
    },
    [isMaster]
  );

  // Start clock
  const startClock = useCallback(
    (player: 'white' | 'black') => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      setActivePlayer(player);
      setIsRunning(true);
      lastTickRef.current = Date.now();

      // Tick every 100ms for smooth UI
      intervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastTickRef.current;
        lastTickRef.current = now;

        if (player === 'white') {
          setWhiteTime((prev) => {
            const newTime = Math.max(0, prev - elapsed);
            broadcastTick(newTime, blackTime, player);

            // Check timeout
            if (newTime === 0) {
              stopClock();
              // TODO: Handle timeout
            }

            return newTime;
          });
        } else {
          setBlackTime((prev) => {
            const newTime = Math.max(0, prev - elapsed);
            broadcastTick(whiteTime, newTime, player);

            // Check timeout
            if (newTime === 0) {
              stopClock();
              // TODO: Handle timeout
            }

            return newTime;
          });
        }
      }, 100);
    },
    [broadcastTick, whiteTime, blackTime]
  );

  // Stop clock
  const stopClock = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setActivePlayer(null);
  }, []);

  // Switch clock (after move)
  const switchClock = useCallback(() => {
    if (!game || !activePlayer) return;

    // Add increment
    if (game.time_increment > 0) {
      if (activePlayer === 'white') {
        setWhiteTime((prev) => prev + game.time_increment * 1000);
      } else {
        setBlackTime((prev) => prev + game.time_increment * 1000);
      }
    }

    // Switch to other player
    const nextPlayer = activePlayer === 'white' ? 'black' : 'white';
    stopClock();
    startClock(nextPlayer);
  }, [game, activePlayer, startClock, stopClock]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    whiteTime,
    blackTime,
    activePlayer,
    isRunning,
    startClock,
    stopClock,
    switchClock,
  };
}

// Helper to format time
export function formatClockTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
