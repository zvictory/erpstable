import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Types based on database schema
interface InvoiceData {
  id: number;
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  subtotal: number; // in Tiyin
  totalAmount: number; // in Tiyin
  status: string;
}

interface CustomerData {
  id: number;
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface InvoiceLineItem {
  id: number;
  itemId: number;
  description?: string | null;
  quantity: number;
  rate: number; // in Tiyin
  amount: number; // in Tiyin
  item?: {
    name: string;
    sku?: string;
  };
}

interface PdfLabels {
  // Company info (from database)
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  companyPhone: string;
  companyEmail: string;

  // Bank details (from database)
  bankName: string;
  bankAccount: string;
  bankMfo: string;

  // Signatories (from database)
  directorName: string;
  accountantName: string;

  // UI labels (from translations)
  invoice: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  billTo: string;
  taxId: string;
  phone: string;
  email: string;
  itemColumn: string;
  qtyColumn: string;
  priceColumn: string;
  amountColumn: string;
  subtotal: string;
  total: string;
  bankDetails: string;
  mfo: string;
  accountNumber: string;
  director: string;
  accountant: string;
  signature: string;
}

interface InvoicePdfProps {
  invoice: InvoiceData;
  customer: CustomerData;
  items: InvoiceLineItem[];
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: '2 solid #1e293b',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 4,
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: '#475569',
    marginBottom: 2,
  },
  invoiceDetail: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  companyInfo: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 500,
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customerInfo: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 3,
    lineHeight: 1.4,
  },
  customerName: {
    fontSize: 12,
    fontWeight: 500,
    color: '#0f172a',
    marginBottom: 4,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 8,
    fontWeight: 500,
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #e2e8f0',
  },
  tableRowStriped: {
    backgroundColor: '#f8fafc',
  },
  colItem: {
    width: '45%',
  },
  colQty: {
    width: '15%',
    textAlign: 'right',
  },
  colPrice: {
    width: '20%',
    textAlign: 'right',
  },
  colAmount: {
    width: '20%',
    textAlign: 'right',
  },
  totals: {
    marginTop: 15,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
    width: '50%',
  },
  totalLabel: {
    fontSize: 10,
    color: '#475569',
    width: '50%',
    textAlign: 'right',
    paddingRight: 15,
  },
  totalValue: {
    fontSize: 10,
    color: '#0f172a',
    width: '50%',
    textAlign: 'right',
    fontWeight: 500,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTop: '2 solid #1e293b',
    width: '50%',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
    width: '50%',
    textAlign: 'right',
    paddingRight: 15,
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
    width: '50%',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
  },
  bankDetails: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  bankTitle: {
    fontSize: 10,
    fontWeight: 500,
    color: '#334155',
    marginBottom: 4,
  },
  bankInfo: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBlock: {
    width: '40%',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 15,
  },
  signatureName: {
    fontSize: 9,
    fontWeight: 500,
    color: '#0f172a',
    marginBottom: 8,
  },
  signatureLine: {
    borderTop: '1 solid #cbd5e1',
    paddingTop: 4,
  },
  signatureRole: {
    fontSize: 8,
    color: '#94a3b8',
  },
});

// Helper function to format currency from Tiyin to сўм
function formatCurrency(tiyin: number): string {
  const uzs = tiyin / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(uzs);
}

// Helper function to format dates
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

export function InvoicePdf({ invoice, customer, items, labels }: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{labels.companyName}</Text>
            {labels.companyAddress && (
              <Text style={styles.companyInfo}>{labels.companyAddress}</Text>
            )}
            {labels.companyTaxId && (
              <Text style={styles.companyInfo}>
                {labels.taxId}: {labels.companyTaxId}
              </Text>
            )}
            {labels.companyPhone && (
              <Text style={styles.companyInfo}>{labels.companyPhone}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>{labels.invoice}</Text>
            <Text style={styles.invoiceDetail}>
              {labels.invoiceNumber}: {invoice.invoiceNumber}
            </Text>
            <Text style={styles.invoiceDetail}>
              {labels.date}: {formatDate(invoice.date)}
            </Text>
            <Text style={styles.invoiceDetail}>
              {labels.dueDate}: {formatDate(invoice.dueDate)}
            </Text>
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.billTo}</Text>
          <Text style={styles.customerName}>{customer.name}</Text>
          {customer.taxId && (
            <Text style={styles.customerInfo}>
              {labels.taxId}: {customer.taxId}
            </Text>
          )}
          {customer.address && (
            <Text style={styles.customerInfo}>{customer.address}</Text>
          )}
          {customer.phone && (
            <Text style={styles.customerInfo}>
              {labels.phone}: {customer.phone}
            </Text>
          )}
          {customer.email && (
            <Text style={styles.customerInfo}>
              {labels.email}: {customer.email}
            </Text>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colItem}>{labels.itemColumn}</Text>
            <Text style={styles.colQty}>{labels.qtyColumn}</Text>
            <Text style={styles.colPrice}>{labels.priceColumn}</Text>
            <Text style={styles.colAmount}>{labels.amountColumn}</Text>
          </View>

          {/* Table Rows */}
          {items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowStriped : {},
              ]}
            >
              <Text style={styles.colItem}>
                {item.item?.name || item.description || `Item #${item.itemId}`}
              </Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.rate)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{labels.subtotal}:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)} сўм</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>{labels.total}:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(invoice.totalAmount)} сўм
            </Text>
          </View>
        </View>

        {/* Footer with Bank Details and Signatures */}
        <View style={styles.footer}>
          <View style={styles.bankDetails}>
            <Text style={styles.bankTitle}>{labels.bankDetails}</Text>
            <Text style={styles.bankInfo}>
              {labels.bankName}: {labels.bankName}
            </Text>
            {labels.bankMfo && (
              <Text style={styles.bankInfo}>
                {labels.mfo}: {labels.bankMfo}
              </Text>
            )}
            <Text style={styles.bankInfo}>
              {labels.accountNumber}: {labels.bankAccount}
            </Text>
          </View>

          <View style={styles.signatures}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>{labels.director}:</Text>
              {labels.directorName && (
                <Text style={styles.signatureName}>{labels.directorName}</Text>
              )}
              <View style={styles.signatureLine}>
                <Text style={styles.signatureRole}>{labels.signature}</Text>
              </View>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>{labels.accountant}:</Text>
              {labels.accountantName && (
                <Text style={styles.signatureName}>{labels.accountantName}</Text>
              )}
              <View style={styles.signatureLine}>
                <Text style={styles.signatureRole}>{labels.signature}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
