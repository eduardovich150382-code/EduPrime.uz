'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * ReferralHandler checks if a referral code is stored in localStorage
 * (set during login page visit with ?ref= param) and registers the
 * referral after the user is authenticated.
 */
export default function ReferralHandler() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;

    const userId = session.user.id;
    const referralCode = localStorage.getItem('referralCode');
    if (!referralCode) return;

    // Call the referral API to register this referral
    const registerReferral = async () => {
      try {
        const response = await fetch('/api/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referralCode,
            newUserId: userId,
          }),
        });

        // Clear regardless of result (success, already-referred, invalid code)
        // to avoid repeated calls
        localStorage.removeItem('referralCode');

        if (response.ok) {
          console.log('Referral registered successfully');
        }
      } catch (error) {
        // On network error, keep the code for retry on next page load
        console.error('Failed to register referral:', error);
      }
    };

    registerReferral();
  }, [session, status]);

  return null;
}
