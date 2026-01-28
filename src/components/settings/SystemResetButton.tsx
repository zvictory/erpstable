'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import SystemResetModal from './SystemResetModal';

export default function SystemResetButton() {
  const t = useTranslations('settings.system_reset_button');
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition shadow-sm"
      >
        <AlertTriangle size={18} />
        {t('label')}
      </button>

      <SystemResetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
