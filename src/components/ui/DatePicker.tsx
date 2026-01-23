'use client';

import React, { useEffect, useRef } from 'react';
import Flatpickr from 'react-flatpickr';
import { Russian } from 'flatpickr/dist/l10n/ru.js';
import { cn } from '@/lib/utils';
import type { Options } from 'flatpickr/dist/types/options';

interface DatePickerProps {
  value?: Date | string | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date | string;
  maxDate?: Date | string;
  error?: boolean;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ value, onChange, placeholder = 'дд/мм/гггг', disabled, className, minDate, maxDate, error }, ref) => {
    const flatpickrRef = useRef<any>(null);

    // Normalize value to Date or undefined
    const getDateValue = (): Date | undefined => {
      if (!value) return undefined;
      if (value instanceof Date) return value;
      if (typeof value === 'string') return new Date(value);
      return undefined;
    };

    // Flatpickr configuration
    const options: Options = {
      dateFormat: 'd/m/Y',           // Display format: 25/01/2026
      allowInput: true,              // Enable manual typing
      locale: Russian,               // Russian month names
      minDate: minDate,
      maxDate: maxDate,
      onChange: (dates) => {
        const date = dates[0] || null;
        onChange(date);
      },
      onReady: (_, __, fp) => {
        flatpickrRef.current = fp;
      },
    };

    // Sync external value changes
    useEffect(() => {
      if (flatpickrRef.current) {
        flatpickrRef.current.setDate(getDateValue(), false);
      }
    }, [value]);

    return (
      <Flatpickr
        ref={ref}
        value={getDateValue()}
        options={options}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          // Shadcn Input base classes
          'flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
          'placeholder:text-slate-400',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Error state
          error && 'border-red-500 focus-visible:ring-red-500',
          className
        )}
      />
    );
  }
);

DatePicker.displayName = 'DatePicker';
