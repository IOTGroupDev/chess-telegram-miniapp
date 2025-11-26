/**
 * Purchase Stars Popup Component
 * Allows users to buy Telegram Stars packages
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegramPayment, StarsPackage } from '../hooks/useTelegramPayment';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../contexts/AuthContext';

interface PurchaseStarsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

export const PurchaseStarsPopup: React.FC<PurchaseStarsPopupProps> = ({
  isOpen,
  onClose,
  onPurchaseSuccess,
}) => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const { wallet, refreshWallet } = useWallet(user?.id || null);
  const { packages, fetchPackages, createInvoice, sendInvoice, loading } =
    useTelegramPayment(token);
  const [selectedPackage, setSelectedPackage] = useState<StarsPackage | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen, fetchPackages]);

  const handlePurchase = async (amount: number) => {
    if (!user || !token) return;

    const invoice = await createInvoice(
      amount,
      `Purchase ${amount} Telegram Stars`,
    );

    if (invoice) {
      const success = await sendInvoice(invoice);
      if (success) {
        // Refresh wallet after successful purchase
        await refreshWallet();
        onPurchaseSuccess?.();
      }
    }
  };

  const handlePackageSelect = (pkg: StarsPackage) => {
    setSelectedPackage(pkg);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setCustomAmount(value);
      setSelectedPackage(null);
    }
  };

  const handlePurchaseClick = () => {
    const amount = selectedPackage?.amount || parseInt(customAmount, 10);
    if (amount && amount > 0) {
      handlePurchase(amount);
    }
  };

  const getTotalAmount = (pkg: StarsPackage): number => {
    return pkg.amount + (pkg.bonus || 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">⭐ {t('payment.purchaseStars')}</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-white/60 text-sm">
            {t('payment.purchaseStarsDesc')}
          </p>
        </div>

        {/* Current Balance */}
        <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/10">
          <div className="text-center">
            <div className="text-white/60 text-sm mb-1">
              {t('betting.yourBalance')}
            </div>
            <div className="text-3xl font-bold">
              ⭐ {wallet?.balance_stars || 0} {t('payment.stars')}
            </div>
          </div>
        </div>

        {/* Packages */}
        <div className="p-6 space-y-3">
          <h3 className="text-lg font-semibold mb-3">
            {t('payment.selectPackage')}
          </h3>

          {packages.map((pkg) => (
            <button
              key={pkg.amount}
              onClick={() => handlePackageSelect(pkg)}
              className={`w-full p-4 rounded-xl border-2 transition-all ${
                selectedPackage?.amount === pkg.amount
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-semibold">{pkg.label}</div>
                  <div className="text-sm text-white/60">
                    ⭐ {pkg.amount} {t('payment.stars')}
                    {pkg.bonus && (
                      <span className="ml-2 text-green-400">
                        +{pkg.bonus} {t('payment.bonus')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {getTotalAmount(pkg)}
                  </div>
                  <div className="text-xs text-white/60">
                    {t('payment.total')}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {/* Custom Amount */}
          <div className="pt-3">
            <label className="block text-sm text-white/60 mb-2">
              {t('payment.customAmount')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={customAmount}
              onChange={handleCustomAmountChange}
              placeholder={t('payment.enterAmount')}
              className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl
                       focus:border-blue-500 focus:outline-none transition-colors"
            />
            {customAmount && parseInt(customAmount, 10) > 0 && (
              <div className="mt-2 text-sm text-white/60">
                {t('payment.youWillReceive')}: ⭐ {customAmount} {t('payment.stars')}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-white/10 space-y-3">
          <button
            onClick={handlePurchaseClick}
            disabled={
              loading ||
              (!selectedPackage && !customAmount) ||
              (customAmount && parseInt(customAmount, 10) < 1)
            }
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500
                     rounded-xl font-semibold disabled:opacity-50
                     disabled:cursor-not-allowed hover:shadow-lg
                     hover:shadow-blue-500/50 transition-all"
          >
            {loading
              ? t('common.loading')
              : `💳 ${t('payment.purchaseButton')}`}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 bg-white/5 hover:bg-white/10
                     rounded-xl font-semibold transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>

        {/* Info */}
        <div className="p-6 bg-blue-500/5 border-t border-white/10">
          <div className="text-xs text-white/60 space-y-1">
            <p>ℹ️ {t('payment.info1')}</p>
            <p>ℹ️ {t('payment.info2')}</p>
            <p>ℹ️ {t('payment.info3')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
