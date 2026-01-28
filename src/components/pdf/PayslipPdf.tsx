import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Types
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

interface PdfLabels {
  // Company info
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  companyPhone: string;

  // UI labels
  payslip: string;
  employee: string;
  period: string;
  payDate: string;
  email: string;
  earnings: string;
  deductions: string;
  description: string;
  amount: string;
  totalEarnings: string;
  totalDeductions: string;
  netPay: string;
  signature: string;
  director: string;
  accountant: string;
  directorName: string;
  accountantName: string;
}

interface PayslipPdfProps {
  payslip: PayslipData;
  labels: PdfLabels;
}

// Styles with Roboto font for Cyrillic support
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 10,
    paddingTop: 30,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '2 solid #1e293b',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 15,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1 solid #e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    width: '30%',
    color: '#64748b',
    fontSize: 9,
  },
  infoValue: {
    width: '70%',
    color: '#1e293b',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderBottom: '1 solid #cbd5e1',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #e2e8f0',
  },
  tableColDesc: {
    width: '70%',
    color: '#475569',
  },
  tableColAmount: {
    width: '30%',
    textAlign: 'right',
    color: '#1e293b',
    fontWeight: 'bold',
  },
  tableTotalRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderTop: '2 solid #cbd5e1',
  },
  tableTotalLabel: {
    width: '70%',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  tableTotalAmount: {
    width: '30%',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  netPaySection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  netPayLabel: {
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  netPayAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1 solid #e2e8f0',
  },
  signatureBlock: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 20,
  },
  signatureLine: {
    borderTop: '1 solid #1e293b',
    paddingTop: 4,
  },
  signatureName: {
    fontSize: 9,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    borderTop: '1 solid #e2e8f0',
    paddingTop: 10,
  },
});

// Helper function to format currency
const formatCurrency = (amount: string | number): string => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' UZS';
};

// Helper function to format date
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const PayslipPdf: React.FC<PayslipPdfProps> = ({ payslip, labels }) => {
  const earnings = payslip.items.filter((item) => item.itemType === 'EARNING');
  const deductions = payslip.items.filter(
    (item) => item.itemType === 'DEDUCTION' || item.itemType === 'TAX'
  );

  const totalEarnings = earnings.reduce((sum, item) => sum + item.amount, 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Company Info */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{labels.companyName}</Text>
          <Text style={styles.companyInfo}>{labels.companyAddress}</Text>
          <Text style={styles.companyInfo}>
            ИНН: {labels.companyTaxId} • Тел: {labels.companyPhone}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{labels.payslip}</Text>

        {/* Employee & Period Info */}
        <View style={styles.sectionTitle}>
          <Text>Информация о сотруднике</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{labels.employee}:</Text>
          <Text style={styles.infoValue}>{payslip.employee.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{labels.email}:</Text>
          <Text style={styles.infoValue}>{payslip.employee.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{labels.period}:</Text>
          <Text style={styles.infoValue}>{payslip.period.periodName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Даты периода:</Text>
          <Text style={styles.infoValue}>
            {formatDate(payslip.period.startDate)} - {formatDate(payslip.period.endDate)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{labels.payDate}:</Text>
          <Text style={styles.infoValue}>{formatDate(payslip.period.payDate)}</Text>
        </View>

        {/* Earnings Table */}
        <Text style={styles.sectionTitle}>{labels.earnings}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColDesc}>{labels.description}</Text>
            <Text style={styles.tableColAmount}>{labels.amount}</Text>
          </View>
          {earnings.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableColDesc}>{item.description}</Text>
              <Text style={styles.tableColAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          <View style={styles.tableTotalRow}>
            <Text style={styles.tableTotalLabel}>{labels.totalEarnings}</Text>
            <Text style={styles.tableTotalAmount}>{formatCurrency(totalEarnings)}</Text>
          </View>
        </View>

        {/* Deductions Table */}
        <Text style={styles.sectionTitle}>{labels.deductions}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColDesc}>{labels.description}</Text>
            <Text style={styles.tableColAmount}>{labels.amount}</Text>
          </View>
          {deductions.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableColDesc}>{item.description}</Text>
              <Text style={styles.tableColAmount}>-{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          <View style={styles.tableTotalRow}>
            <Text style={styles.tableTotalLabel}>{labels.totalDeductions}</Text>
            <Text style={styles.tableTotalAmount}>-{formatCurrency(totalDeductions)}</Text>
          </View>
        </View>

        {/* Net Pay */}
        <View style={styles.netPaySection}>
          <Text style={styles.netPayLabel}>{labels.netPay}</Text>
          <Text style={styles.netPayAmount}>{formatCurrency(payslip.netPay)}</Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>{labels.director}:</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>{labels.directorName}</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>{labels.accountant}:</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>{labels.accountantName}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Этот документ создан автоматически и является официальным расчетным листком.</Text>
        </View>
      </Page>
    </Document>
  );
};
