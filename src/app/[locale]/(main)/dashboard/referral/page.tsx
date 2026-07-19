'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Gift,
  Copy,
  CheckCircle,
  Users,
  Crown,
  Share2,
  Loader2,
} from 'lucide-react';
import BackButton from '@/components/ui/BackButton';

interface ReferralData {
  referralCode: string;
  referralCount: number;
  hasReward: boolean;
  rewardGranted: boolean;
  remainingToReward: number;
  friendsRequired: number;
  rewardDays: number;
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReferralData() {
      try {
        const res = await fetch('/api/referral');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          console.error('Referral API returned:', res.status);
        }
      } catch (err) {
        console.error('Failed to fetch referral data:', err);
      }
      setLoading(false);
    }
    fetchReferralData();
  }, []);

  const referralLink = data
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${data.referralCode}`
    : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(
      `EduPrime.uz - testlar orqali bilimingizni sinang va oshiring! Men ham shu platformada o'qiyapman. Siz ham qo'shiling!\n\n${referralLink}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      '_blank'
    );
  };

  const shareToInstagram = () => {
    copyLink();
    window.open('https://www.instagram.com/', '_blank');
  };

  const claimReward = async () => {
    setClaimingReward(true);
    try {
      const res = await fetch('/api/referral/check-reward', { method: 'POST' });
      const json = await res.json();
      setRewardMessage(json.message);
      if (json.eligible && !json.alreadyGranted) {
        // Refresh data
        const refreshRes = await fetch('/api/referral');
        const refreshData = await refreshRes.json();
        if (refreshRes.ok) setData(refreshData);
      }
    } catch {
      setRewardMessage("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    }
    setClaimingReward(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Gift size={48} className="text-text-secondary mb-4 opacity-50" />
        <p className="text-text-secondary text-lg mb-2">Ma&apos;lumotlarni yuklashda xatolik</p>
        <p className="text-text-secondary text-sm mb-4">Sahifani yangilang yoki qaytadan urinib ko&apos;ring</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Qayta yuklash
        </button>
      </div>
    );
  }

  // Dynamic values from admin settings
  const friendsRequired = data.friendsRequired || 3;
  const rewardDays = data.rewardDays || 5;
  const progress = Math.min((data.referralCount / friendsRequired) * 100, 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackButton className="mb-2" />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <Gift size={28} className="text-primary-600" />
          Referral dasturi
        </h1>
        <p className="text-text-secondary mt-1">
          Do&apos;stlaringizni taklif qiling va bepul Premium oling!
        </p>
      </motion.div>

      {/* Referral Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="card-elevated p-6"
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Share2 size={20} className="text-primary-600" />
          Sizning referral havolangiz
        </h2>

        {/* Link display */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-50 border border-primary-200">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 bg-transparent text-sm text-text-primary font-mono outline-none truncate"
          />
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors flex-shrink-0"
          >
            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
            {copied ? 'Nusxalandi!' : 'Nusxalash'}
          </button>
        </div>

        {/* Social Share Buttons */}
        <div className="mt-4">
          <p className="text-sm text-text-secondary mb-3">Ijtimoiy tarmoqlarda ulashing:</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={shareToTelegram}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0088cc] text-white text-sm font-medium hover:bg-[#0077b5] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Telegram
            </button>
            <button
              onClick={shareToInstagram}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
              Instagram
            </button>
            <button
              onClick={shareToFacebook}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1877f2] text-white text-sm font-medium hover:bg-[#166fe5] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>
        </div>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="card-elevated p-6"
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Users size={20} className="text-primary-600" />
          Taklif qilingan do&apos;stlar
        </h2>

        {/* Count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl font-bold text-primary-600">{data.referralCount}</span>
          <span className="text-text-secondary text-sm">/ {friendsRequired} do&apos;st</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status text */}
        {data.hasReward ? (
          <div className="p-4 rounded-xl bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={20} className="text-green-600" />
              <span className="font-semibold text-green-700">Tabriklaymiz!</span>
            </div>
            <p className="text-sm text-green-600">
              {data.rewardGranted
                ? `Siz ${rewardDays} kunlik Premium tarifni oldingiz!`
                : `${friendsRequired} ta do'st taklif qildingiz! Mukofotingizni oling.`}
            </p>
            {!data.rewardGranted && (
              <button
                onClick={claimReward}
                disabled={claimingReward}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {claimingReward ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Gift size={16} />
                )}
                Mukofotni olish
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-primary-50 border border-primary-200">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={20} className="text-primary-600" />
              <span className="font-semibold text-primary-700">Mukofot</span>
            </div>
            <p className="text-sm text-text-secondary">
              {friendsRequired} ta do&apos;stingizni taklif qiling va <strong>{rewardDays} kunlik Premium tarif bepul</strong> oling!
              Sizga yana <strong>{data.remainingToReward}</strong> ta do&apos;st taklif qilish kerak.
            </p>
          </div>
        )}

        {rewardMessage && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">{rewardMessage}</p>
          </div>
        )}
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="card p-6"
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">Qanday ishlaydi?</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary-600">1</span>
            </div>
            <div>
              <p className="font-medium text-text-primary">Havolani ulashing</p>
              <p className="text-sm text-text-secondary">Referral havolangizni do&apos;stlaringizga yuboring</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary-600">2</span>
            </div>
            <div>
              <p className="font-medium text-text-primary">Do&apos;stingiz ro&apos;yxatdan o&apos;tadi</p>
              <p className="text-sm text-text-secondary">Havola orqali kirgan do&apos;stingiz avtomatik hisoblanadi</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary-600">3</span>
            </div>
            <div>
              <p className="font-medium text-text-primary">Mukofot oling</p>
              <p className="text-sm text-text-secondary">{friendsRequired} ta do&apos;st = {rewardDays} kunlik bepul Premium tarif</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
