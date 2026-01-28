'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { PayslipPdf } from '@/components/pdf/PayslipPdf';
import { toast } from 'sonner';

interface PayslipData {
  id: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  period: {
    periodName: string;
    startDate: Date;
    endDate: Date;
    payDate: Date;
  };
  employee: {
    name: string;
    email: string;
  };
  items: Array<{
    itemType: 'EARNING' | 'DEDUCTION' | 'TAX';
    description: string;
    amount: number;
  }>;
}

interface DownloadPayslipButtonProps {
  payslip: PayslipData;
  businessSettings?: {
    companyName: string;
    companyAddress: string;
    companyTaxId: string;
    companyPhone: string;
    directorName: string;
    accountantName: string;
  };
}

export function DownloadPayslipButton({ payslip, businessSettings }: DownloadPayslipButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const labels = {
        // Company info (from business settings or defaults)
        companyName: businessSettings?.companyName || 'ООО "Компания"',
        companyAddress: businessSettings?.companyAddress || 'г. Ташкент',
        companyTaxId: businessSettings?.companyTaxId || '123456789',
        companyPhone: businessSettings?.companyPhone || '+998 90 123 45 67',

        // UI labels (Russian)
        payslip: 'Расчетный листок',
        employee: 'Сотрудник',
        period: 'Расчетный период',
        payDate: 'Дата выплаты',
        email: 'Email',
        earnings: 'НАЧИСЛЕНИЯ',
        deductions: 'УДЕРЖАНИЯ',
        description: 'Описание',
        amount: 'Сумма',
        totalEarnings: 'ИТОГО НАЧИСЛЕНО',
        totalDeductions: 'ИТОГО УДЕРЖАНО',
        netPay: 'К ВЫПЛАТЕ',
        signature: 'Подпись',
        director: 'Директор',
        accountant: 'Главный бухгалтер',
        directorName: businessSettings?.directorName || '_____________',
        accountantName: businessSettings?.accountantName || '_____________',
      };

      // Generate PDF
      const blob = await pdf(<PayslipPdf payslip={payslip} labels={labels} />).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${payslip.employee.name.replace(/\s+/g, '_')}_${payslip.period.periodName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF загружен');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Ошибка создания PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={loading} variant="outline">
      <Download className="h-4 w-4 mr-2" />
      {loading ? 'Создание...' : 'Скачать PDF'}
    </Button>
  );
}
