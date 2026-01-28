'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';
import {
  getUnreadNotificationCount,
  getNotifications,
  markAllNotificationsAsRead,
} from '@/app/actions/notifications';
import type { Notification } from '../../../db/schema/notifications';

export function NotificationPanel() {
  const t = useTranslations('notifications');
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    const result = await getUnreadNotificationCount();
    if (result.success) {
      setUnreadCount(result.count);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    const result = await getNotifications(20, false); // Get last 20 notifications
    if (result.success) {
      setNotifications(result.notifications);
    }
    setLoading(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setUnreadCount(0);
    fetchNotifications(); // Refresh list
  };

  const handleNotificationRead = () => {
    fetchUnreadCount();
    fetchNotifications();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell size={20} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-xl bg-white shadow-lg border border-slate-100 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              {t('title')}
            </h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {t('mark_all_read')}
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-slate-500">{t('loading')}</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">{t('empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={handleNotificationRead}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-600 hover:text-slate-900"
                onClick={() => {
                  setIsOpen(false);
                  // Future: Navigate to full notifications page
                }}
              >
                {t('view_all')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
