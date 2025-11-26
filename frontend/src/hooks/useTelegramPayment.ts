/**
 * Telegram Payment Hook
 * Handles Telegram Stars purchases
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface StarsPackage {
  amount: number;
  label: string;
  bonus?: number;
}

export interface TelegramInvoice {
  title: string;
  description: string;
  payload: string;
  provider_token: string;
  currency: string;
  prices: Array<{ label: string; amount: number }>;
}

export interface UseTelegramPaymentReturn {
  loading: boolean;
  error: string | null;
  packages: StarsPackage[];
  createInvoice: (amount: number, description?: string) => Promise<TelegramInvoice | null>;
  sendInvoice: (invoice: TelegramInvoice) => Promise<boolean>;
  processSuccessfulPayment: (payment: any) => Promise<boolean>;
  fetchPackages: () => Promise<void>;
}

export function useTelegramPayment(token: string | null): UseTelegramPaymentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<StarsPackage[]>([]);

  /**
   * Fetch available Stars packages
   */
  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/payment/packages`);
      setPackages(response.data.packages || []);
    } catch (err: any) {
      console.error('Failed to fetch packages:', err);
      setError(err.response?.data?.message || 'Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a Telegram Stars invoice
   */
  const createInvoice = useCallback(
    async (amount: number, description?: string): Promise<TelegramInvoice | null> => {
      if (!token) {
        setError('Authentication required');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await axios.post(
          `${API_URL}/payment/create-invoice`,
          { amount, description },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        return response.data.invoice;
      } catch (err: any) {
        console.error('Failed to create invoice:', err);
        setError(err.response?.data?.message || 'Failed to create invoice');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  /**
   * Send invoice to Telegram user
   */
  const sendInvoice = useCallback(
    async (invoice: TelegramInvoice): Promise<boolean> => {
      if (!window.Telegram?.WebApp) {
        setError('Telegram WebApp not available');
        return false;
      }

      try {
        setLoading(true);
        setError(null);

        // Use Telegram WebApp API to send invoice
        // This requires Telegram Bot API integration on the backend
        const tg = window.Telegram.WebApp;

        // Show invoice using Telegram WebApp
        // Note: This is a placeholder - actual implementation requires
        // sending invoice through Telegram Bot API from backend
        tg.showAlert(
          'Payment processing will be implemented when Telegram Bot is configured.\n\n' +
          `Amount: ${invoice.prices[0].amount} Stars\n` +
          `Description: ${invoice.description}`,
        );

        return true;
      } catch (err: any) {
        console.error('Failed to send invoice:', err);
        setError('Failed to send invoice');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Process successful payment notification from Telegram
   */
  const processSuccessfulPayment = useCallback(
    async (payment: any): Promise<boolean> => {
      if (!token) {
        setError('Authentication required');
        return false;
      }

      try {
        setLoading(true);
        setError(null);

        await axios.post(
          `${API_URL}/payment/successful-payment`,
          payment,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        return true;
      } catch (err: any) {
        console.error('Failed to process payment:', err);
        setError(err.response?.data?.message || 'Failed to process payment');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return {
    loading,
    error,
    packages,
    createInvoice,
    sendInvoice,
    processSuccessfulPayment,
    fetchPackages,
  };
}
