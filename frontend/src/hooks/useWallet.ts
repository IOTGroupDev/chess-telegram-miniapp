import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { UserWallet, WalletTransaction, CurrencyType } from '../types/supabase';

interface UseWalletReturn {
  wallet: UserWallet | null;
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  hasBalance: (amount: number, currency: CurrencyType) => boolean;
}

/**
 * Hook for managing user wallet
 * Provides wallet balance, transaction history, and real-time updates
 */
export function useWallet(userId: string | null): UseWalletReturn {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch wallet data
   */
  const refreshWallet = useCallback(async () => {
    if (!userId) {
      setWallet(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (walletError) throw walletError;

      setWallet(data);
    } catch (err) {
      console.error('Error fetching wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Fetch transaction history
   */
  const refreshTransactions = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      return;
    }

    try {
      const { data, error: transactionsError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) throw transactionsError;

      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, [userId]);

  /**
   * Check if user has sufficient balance
   */
  const hasBalance = useCallback(
    (amount: number, currency: CurrencyType): boolean => {
      if (!wallet) return false;

      if (currency === 'coins') {
        return wallet.balance_coins >= amount;
      } else if (currency === 'stars') {
        return wallet.balance_stars >= amount;
      }

      return false;
    },
    [wallet]
  );

  /**
   * Initial load
   */
  useEffect(() => {
    if (userId) {
      refreshWallet();
      refreshTransactions();
    }
  }, [userId, refreshWallet, refreshTransactions]);

  /**
   * Subscribe to wallet updates
   */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`wallet:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_wallets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Wallet updated:', payload);
          setWallet(payload.new as UserWallet);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New transaction:', payload);
          setTransactions((prev) => [payload.new as WalletTransaction, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    wallet,
    transactions,
    loading,
    error,
    refreshWallet,
    refreshTransactions,
    hasBalance,
  };
}
