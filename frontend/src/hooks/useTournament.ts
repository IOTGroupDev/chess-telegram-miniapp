import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAppStore } from '../store/useAppStore';

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  type: 'arena' | 'swiss' | 'knockout';
  time_control: 'bullet' | 'blitz' | 'rapid' | 'classical';
  time_limit: number;
  time_increment: number;
  start_time: string;
  duration?: number;
  rounds?: number;
  current_round?: number;
  min_rating?: number;
  max_rating?: number;
  max_players?: number;
  status: 'upcoming' | 'active' | 'finished' | 'cancelled';
  created_by: string;
  created_at: string;
}

export interface TournamentStanding {
  user_id: string;
  username: string;
  rating: number;
  score: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  buchholz?: number;
  performance_rating?: number;
  rank: number;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  score: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  games_as_white: number;
  games_as_black: number;
  joined_at: string;
}

export const useTournament = (tournamentId?: string) => {
  const { user } = useAppStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch tournament details
   */
  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (fetchError) throw fetchError;

      setTournament(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch tournament:', err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  /**
   * Fetch tournament standings
   */
  const fetchStandings = useCallback(async () => {
    if (!tournamentId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('tournament_participants')
        .select(`
          user_id,
          score,
          games_played,
          wins,
          draws,
          losses,
          buchholz,
          performance_rating,
          users:user_id (
            username,
            blitz_rating
          )
        `)
        .eq('tournament_id', tournamentId)
        .order('score', { ascending: false })
        .order('buchholz', { ascending: false });

      if (fetchError) throw fetchError;

      const standingsWithRank: TournamentStanding[] = (data || []).map((p: any, index) => ({
        user_id: p.user_id,
        username: p.users?.username || 'Unknown',
        rating: p.users?.blitz_rating || 1500,
        score: p.score,
        games_played: p.games_played,
        wins: p.wins,
        draws: p.draws,
        losses: p.losses,
        buchholz: p.buchholz,
        performance_rating: p.performance_rating,
        rank: index + 1,
      }));

      setStandings(standingsWithRank);
    } catch (err: any) {
      console.error('Failed to fetch standings:', err);
    }
  }, [tournamentId]);

  /**
   * Fetch participants
   */
  const fetchParticipants = useCallback(async () => {
    if (!tournamentId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (fetchError) throw fetchError;

      setParticipants(data || []);

      // Check if current user is participant
      if (user) {
        const isUserParticipant = (data || []).some((p: any) => p.user_id === user.id);
        setIsParticipant(isUserParticipant);
      }
    } catch (err: any) {
      console.error('Failed to fetch participants:', err);
    }
  }, [tournamentId, user]);

  /**
   * Join tournament
   */
  const joinTournament = async () => {
    if (!tournamentId || !user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: joinError } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
        } as any);

      if (joinError) throw joinError;

      setIsParticipant(true);
      await fetchParticipants();
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to join tournament:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Leave tournament
   */
  const leaveTournament = async () => {
    if (!tournamentId || !user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: leaveError } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id);

      if (leaveError) throw leaveError;

      setIsParticipant(false);
      await fetchParticipants();
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to leave tournament:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Subscribe to real-time updates
   */
  useEffect(() => {
    if (!tournamentId) return;

    // Fetch initial data
    fetchTournament();
    fetchStandings();
    fetchParticipants();

    // Subscribe to tournament changes
    const tournamentChannel = supabase
      .channel(`tournament:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log('Tournament updated:', payload);
          fetchTournament();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log('Participants updated:', payload);
          fetchStandings();
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentChannel);
    };
  }, [tournamentId, fetchTournament, fetchStandings, fetchParticipants]);

  return {
    tournament,
    standings,
    participants,
    isParticipant,
    loading,
    error,
    joinTournament,
    leaveTournament,
    refetch: fetchTournament,
  };
};

/**
 * Hook to fetch list of tournaments
 */
export const useTournamentList = (filters?: {
  type?: string;
  status?: string;
  time_control?: string;
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('tournaments').select('*');

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.time_control) {
        query = query.eq('time_control', filters.time_control);
      }

      query = query.order('start_time', { ascending: true }).limit(50);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTournaments(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch tournaments:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return {
    tournaments,
    loading,
    error,
    refetch: fetchTournaments,
  };
};
