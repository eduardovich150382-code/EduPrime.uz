'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  Bell,
  CheckCheck,
  Info,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'warning':
      return <AlertTriangle size={18} className="text-yellow-600" />;
    case 'success':
      return <Sparkles size={18} className="text-green-600" />;
    case 'reminder':
      return <Clock size={18} className="text-blue-600" />;
    default:
      return <Info size={18} className="text-primary-600" />;
  }
}

function getTypeBg(type: string) {
  switch (type) {
    case 'warning':
      return 'bg-yellow-50';
    case 'success':
      return 'bg-green-50';
    case 'reminder':
      return 'bg-blue-50';
    default:
      return 'bg-primary-50';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Hozirgina';
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  if (hours < 24) return `${hours} soat oldin`;
  if (days < 7) return `${days} kun oldin`;

  return date.toLocaleDateString('uz-UZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=50');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
    setLoading(false);
  }

  async function markAsRead(id: string) {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
              <Bell size={24} className="text-primary-600" />
              Bildirishnomalar
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-text-secondary">
                {unreadCount} ta o&apos;qilmagan xabar
              </p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <CheckCheck size={16} />
            <span className="hidden sm:inline">Barchasini o&apos;qilgan deb belgilash</span>
            <span className="sm:hidden">Barchasi</span>
          </button>
        )}
      </motion.div>

      {/* Notifications list */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 size={28} className="animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-text-secondary text-sm">Yuklanmoqda...</p>
        </div>
      ) : notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell size={36} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            Bildirishnomalar yo&apos;q
          </h3>
          <p className="text-text-secondary text-sm">
            Yangi xabarlar kelganda bu yerda ko&apos;rinadi
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`card p-4 ${!notification.isRead ? 'border-primary-200 bg-primary-50/30' : ''} transition-all`}
              onClick={() => {
                if (!notification.isRead) markAsRead(notification.id);
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getTypeBg(notification.type)}`}
                >
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-sm font-semibold ${
                        !notification.isRead
                          ? 'text-text-primary'
                          : 'text-text-secondary'
                      }`}
                    >
                      {notification.title}
                    </h3>
                    {!notification.isRead && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-text-secondary">
                      {formatDate(notification.createdAt)}
                    </span>
                    {notification.link && (
                      <Link
                        href={notification.link}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Batafsil
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
