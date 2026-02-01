'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare, Phone, Mail, Calendar, CheckSquare,
  User, Clock, Trash2
} from 'lucide-react';
import { completeActivity, deleteActivity } from '@/app/actions/crm';
import { useRouter } from 'next/navigation';

interface Activity {
  id: number;
  type: string;
  subject: string | null;
  description: string;
  performed_at: Date;
  performedByUser: {
    name: string;
  };
  due_date?: Date | null;
  completed_at?: Date | null;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const t = useTranslations('crm.activities');
  const router = useRouter();
  const [completing, setCompleting] = useState<number | null>(null);

  const getIcon = (type: string) => {
    const icons = {
      NOTE: <MessageSquare size={16} className="text-blue-600" />,
      CALL: <Phone size={16} className="text-green-600" />,
      EMAIL: <Mail size={16} className="text-purple-600" />,
      MEETING: <Calendar size={16} className="text-orange-600" />,
      TASK: <CheckSquare size={16} className="text-slate-600" />,
    };
    return icons[type as keyof typeof icons] || icons.NOTE;
  };

  const getColor = (type: string) => {
    const colors = {
      NOTE: 'border-l-blue-500',
      CALL: 'border-l-green-500',
      EMAIL: 'border-l-purple-500',
      MEETING: 'border-l-orange-500',
      TASK: 'border-l-slate-500',
    };
    return colors[type as keyof typeof colors] || 'border-l-slate-300';
  };

  const handleComplete = async (id: number) => {
    setCompleting(id);
    await completeActivity(id);
    router.refresh();
    setCompleting(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirm_delete'))) return;
    await deleteActivity(id);
    router.refresh();
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <MessageSquare size={48} className="mx-auto mb-2 text-slate-300" />
        <p>{t('empty_state')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={`bg-white border-l-4 ${getColor(activity.type)} rounded-r-lg p-4 shadow-sm`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {getIcon(activity.type)}
              <span className="font-semibold text-slate-900">
                {activity.subject || t(`type.${activity.type.toLowerCase()}`)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock size={12} />
                {formatDistanceToNow(new Date(activity.performed_at), { addSuffix: true })}
              </div>
              <button
                onClick={() => handleDelete(activity.id)}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <p className="text-slate-700 text-sm mb-2 whitespace-pre-wrap">
            {activity.description}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <User size={12} />
              {activity.performedByUser.name}
            </div>

            {activity.type === 'TASK' && activity.due_date && !activity.completed_at && (
              <button
                onClick={() => handleComplete(activity.id)}
                disabled={completing === activity.id}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {completing === activity.id ? t('completing') : t('actions.complete')}
              </button>
            )}

            {activity.completed_at && (
              <span className="text-xs text-green-600">
                ✓ {t('completed')}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
