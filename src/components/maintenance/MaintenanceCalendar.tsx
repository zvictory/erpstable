'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMaintenanceCalendar } from '@/app/actions/maintenance';
import { formatDate } from '@/lib/format';

interface CalendarEvent {
  id: number;
  workOrderNumber: string | null;
  taskName: string;
  scheduledStart: Date | null;
  status: string;
  assetName: string | undefined;
  technicianName: string | undefined;
  totalCost: number | null;
}

export function MaintenanceCalendar() {
  const t = useTranslations('maintenance.calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  async function loadCalendarData() {
    try {
      setLoading(true);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const { events: calendarEvents } = await getMaintenanceCalendar(
        startDate,
        endDate
      );

      setEvents(calendarEvents as CalendarEvent[]);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  }

  function previousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending_approval':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  // Get events for a specific date
  function getEventsForDate(date: Date): CalendarEvent[] {
    return events.filter(event => {
      if (!event.scheduledStart) return false;
      const eventDate = new Date(event.scheduledStart);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  }

  // Generate calendar grid
  function generateCalendarGrid() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const grid: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(new Date(year, month, day));
    }

    return grid;
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const grid = generateCalendarGrid();

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('title')}
        </h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold text-slate-900 min-w-[200px] text-center">
            {monthName}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>{t('status.planned')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span>{t('status.in_progress')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>{t('status.completed')}</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="p-4">
        {loading ? (
          <div className="h-[600px] flex items-center justify-center">
            <div className="text-slate-500">{t('loading')}</div>
          </div>
        ) : (
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-slate-600 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {grid.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-24 bg-slate-50 rounded"></div>;
                }

                const dayEvents = getEventsForDate(date);
                const isToday =
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={date.toISOString()}
                    className={`h-24 border rounded p-2 overflow-y-auto ${
                      isToday ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900 mb-1">
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded border ${getStatusColor(event.status)}`}
                          title={`${event.assetName} - ${event.taskName}`}
                        >
                          {event.taskName.slice(0, 20)}
                          {event.taskName.length > 20 ? '...' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
