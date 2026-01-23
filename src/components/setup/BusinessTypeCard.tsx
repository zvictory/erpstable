'use client';

import React from 'react';
import { BusinessType, BUSINESS_TYPES } from '@/config/modules';
import { Check } from 'lucide-react';

interface BusinessTypeCardProps {
  businessType: BusinessType;
  selected: boolean;
  onClick: (type: BusinessType) => void;
}

export function BusinessTypeCard({
  businessType,
  selected,
  onClick,
}: BusinessTypeCardProps) {
  const config = BUSINESS_TYPES[businessType];

  return (
    <button
      onClick={() => onClick(businessType)}
      className={`relative p-6 rounded-lg border-2 transition-all text-left ${
        selected
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'border-muted hover:border-primary/50 bg-card hover:bg-accent'
      }`}
    >
      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
          <Check size={20} />
        </div>
      )}

      {/* Emoji Icon */}
      <div className="text-4xl mb-3">{config.emoji}</div>

      {/* Title */}
      <h3 className="font-semibold text-lg mb-2">{config.label}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4">{config.description}</p>

      {/* Features Preview */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Key Features:
        </p>
        <ul className="text-xs text-muted-foreground space-y-1">
          {Object.entries(config.features)
            .filter(([, enabled]) => enabled)
            .slice(0, 3)
            .map(([feature]) => (
              <li key={feature} className="flex items-center">
                <span className="mr-2">•</span>
                <span className="capitalize">
                  {feature.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </button>
  );
}
