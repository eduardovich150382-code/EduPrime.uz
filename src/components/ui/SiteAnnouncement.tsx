'use client';

import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';

/**
 * Sayt e'loni — admin sozlamalardan kiritilgan e'lonni barcha foydalanuvchilarga ko'rsatadi.
 * Yopilganda shu sessiya uchun yashirinadi.
 */
export default function SiteAnnouncement() {
  const [announcement, setAnnouncement] = useState('');
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('site_announcement_dismissed');
    if (wasDismissed === 'true') return;

    const fetchAnnouncement = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings?.site_announcement && data.settings.site_announcement.trim()) {
          setAnnouncement(data.settings.site_announcement.trim());
          setDismissed(false);
        }
      } catch (error) {
        // Silently fail
      }
    };
    fetchAnnouncement();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('site_announcement_dismissed', 'true');
  };

  if (dismissed || !announcement) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Megaphone size={16} className="flex-shrink-0" />
          <p className="text-sm font-medium truncate">{announcement}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
          aria-label="Yopish"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
