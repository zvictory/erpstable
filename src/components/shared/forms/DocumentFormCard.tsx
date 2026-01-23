'use client';

import React from 'react';

interface DocumentFormCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function DocumentFormCard({
  title,
  children,
  className
}: DocumentFormCardProps) {
  const baseStyles = "bg-white rounded-xl border border-slate-200 p-6 shadow-sm";
  const finalClassName = className ? `${baseStyles} ${className}` : baseStyles;

  return (
    <div className={finalClassName}>
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
