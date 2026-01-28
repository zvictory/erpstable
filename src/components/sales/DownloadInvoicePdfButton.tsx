'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { Download, Loader2 } from 'lucide-react';
import { generateInvoicePdf } from '@/app/actions/documents';

interface DownloadInvoicePdfButtonProps {
  invoiceId: number;
  className?: string;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md';
}

export function DownloadInvoicePdfButton({
  invoiceId,
  className = '',
  variant = 'icon',
  size = 'sm',
}: DownloadInvoicePdfButtonProps) {
  const locale = useLocale();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click events

    try {
      setIsDownloading(true);

      // Call Server Action to generate PDF
      const result = await generateInvoicePdf(invoiceId, locale);

      if (!result.success || !result.pdfBase64) {
        throw new Error(result.error || 'Failed to generate PDF');
      }

      // Create blob from base64
      const binaryString = atob(result.pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename || `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert(error instanceof Error ? error.message : 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`p-1 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title="Download PDF"
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
        ) : (
          <Download className="h-4 w-4 text-blue-500" />
        )}
      </button>
    );
  }

  // Button variant
  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm';

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`flex items-center gap-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download PDF
        </>
      )}
    </button>
  );
}
