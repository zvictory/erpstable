'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import * as Icons from 'lucide-react';
import QuickCreateCategoryModal from '@/components/settings/QuickCreateCategoryModal';

interface Category {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
}

interface CategoryComboboxProps {
  categories: Category[];
  value: number | null;
  onChange: (categoryId: number) => void;
  onCategoryCreated?: (newCategory: Category) => void;
  error?: string;
}

export default function CategoryCombobox({
  categories,
  value,
  onChange,
  onCategoryCreated,
  error
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const t = useTranslations('inventory.category_combobox');

  const selectedCategory = categories.find((c) => c.id === value);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (categoryId: number) => {
    onChange(categoryId);
    setOpen(false);
    setSearchQuery('');
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg bg-white hover:bg-slate-50 ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
      >
        <span className="flex items-center gap-2">
          {selectedCategory ? (
            <>
              {getIcon(selectedCategory.icon)}
              <span>{selectedCategory.name}</span>
            </>
          ) : (
            <span className="text-slate-400">{t('select_category')}</span>
          )}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-300 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-200">
            <input
              type="text"
              placeholder={t('search_categories')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-slate-500">{t('no_categories')}</div>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelect(category.id)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    {getIcon(category.icon)}
                    {category.name}
                  </span>
                  {value === category.id && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setShowQuickCreate(true);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              {t('create_new_category')}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      <QuickCreateCategoryModal
        isOpen={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
        initialName={searchQuery}
        onSuccess={(newCategory) => {
          onChange(newCategory.id);
          setSearchQuery('');
          onCategoryCreated?.(newCategory);
        }}
      />
    </div>
  );
}
