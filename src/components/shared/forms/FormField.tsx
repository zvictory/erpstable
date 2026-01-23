'use client';

import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export default function FormField({
  label,
  error,
  required,
  children
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[10px] text-red-500 font-bold">{error}</p>
      )}
    </div>
  );
}
