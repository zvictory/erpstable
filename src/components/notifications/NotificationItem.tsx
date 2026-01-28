'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { markNotificationAsRead, deleteNotification } from '@/app/actions/notifications';
import { format } from 'date-fns';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  FileText,
  Package,
  Clock,
  X,
} from 'lucide-react';
import type { Notification } from '../../../db/schema/notifications';

interface Props {
  notification: Notification;
  onRead: () => void;
}

export function NotificationItem({ notification, onRead }: Props) {
  const t = useTranslations('notifications');
  const router = useRouter();

  const handleClick = async () => {
    // Mark as read
    await markNotificationAsRead(notification.id);

    // Navigate if action URL exists
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }

    onRead();
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notification.id);
    onRead();
  };

  // Icon mapping
  const getIcon = () => {
    switch (notification.type) {
      case 'BILL_PENDING_APPROVAL':
      case 'BILL_APPROVED':
      case 'BILL_REJECTED':
        return <FileText className="h-5 w-5" />;
      case 'INVENTORY_LOW_STOCK':
      case 'INVENTORY_OUT_OF_STOCK':
        return <Package className="h-5 w-5" />;
      case 'QC_INSPECTION_REQUIRED':
      case 'QC_BATCH_REJECTED':
        return <AlertTriangle className="h-5 w-5" />;
      case 'PAYMENT_DUE_SOON':
      case 'PAYMENT_OVERDUE':
        return <Clock className="h-5 w-5" />;
      case 'PRODUCTION_RUN_COMPLETED':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  // Color mapping
  const getColorClass = () => {
    switch (notification.type) {
      case 'BILL_APPROVED':
      case 'PRODUCTION_RUN_COMPLETED':
        return 'bg-green-50 text-green-600';
      case 'BILL_REJECTED':
      case 'QC_BATCH_REJECTED':
      case 'INVENTORY_OUT_OF_STOCK':
        return 'bg-red-50 text-red-600';
      case 'INVENTORY_LOW_STOCK':
      case 'QC_INSPECTION_REQUIRED':
        return 'bg-yellow-50 text-yellow-600';
      case 'PAYMENT_DUE_SOON':
      case 'PAYMENT_OVERDUE':
        return 'bg-orange-50 text-orange-600';
      default:
        return 'bg-blue-50 text-blue-600';
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors relative
        ${!notification.isRead ? 'bg-blue-50/30' : ''}
      `}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
      )}

      <div className="flex items-start gap-3 ml-4">
        {/* Icon */}
        <div className={`p-2 rounded-lg ${getColorClass()}`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-slate-900">
              {notification.title}
            </h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <time className="text-xs text-slate-400">
              {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
            </time>
            {notification.actionLabel && (
              <span className="text-xs font-medium text-blue-600">
                {notification.actionLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
