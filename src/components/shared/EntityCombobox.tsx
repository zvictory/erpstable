'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface EntityComboboxProps {
  entities: { id: number; name: string }[];
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export default function EntityCombobox({
  entities,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
}: EntityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('common');

  const defaultPlaceholder = placeholder || t('select_placeholder');

  const selectedEntity = entities.find((e) => e.id === value);

  const filteredEntities = entities.filter((entity) =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (id: number) => {
    onChange(id);
    setOpen(false);
    setSearchQuery('');
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === 'Escape') {
        setOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg bg-white transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-slate-50 cursor-pointer'
        } ${error ? 'border-red-500' : 'border-slate-300'}`}
      >
        <span className={selectedEntity ? 'text-slate-900' : 'text-slate-400'}>
          {selectedEntity ? selectedEntity.name : defaultPlaceholder}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-300 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-200">
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredEntities.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                {t('no_results')}
              </div>
            ) : (
              filteredEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => handleSelect(entity.id)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-100 text-left transition-colors"
                >
                  <span className={value === entity.id ? 'font-semibold' : ''}>
                    {entity.name}
                  </span>
                  {value === entity.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
