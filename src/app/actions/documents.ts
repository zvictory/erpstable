'use server';

import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { db } from '../../../db';
import { invoices, customers, invoiceLines } from '../../../db/schema/sales';
import { items } from '../../../db/schema/inventory';
import { businessSettings } from '../../../db/schema/business';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { InvoicePdf } from '@/components/pdf/InvoicePdf';
import { registerPdfFonts } from '@/components/pdf/PdfFontConfig';
import { auth } from '@/auth';
import { UserRole } from '@/auth.config';

interface GeneratePdfResult {
  success: boolean;
  error?: string;
  pdfBase64?: string;
  filename?: string;
}

/**
 * Generate a PDF for an invoice
 * @param invoiceId - The ID of the invoice to generate PDF for
 * @param locale - The locale for translations (e.g., 'ru', 'en')
 * @returns Base64-encoded PDF data with filename
 */
export async function generateInvoicePdf(
  invoiceId: number,
  locale: string = 'ru'
): Promise<GeneratePdfResult> {
  try {
    // AUTHORIZATION CHECK
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized - Authentication required',
      };
    }

    const userRole = (session.user as any)?.role as UserRole;
    const allowedRoles = [UserRole.ADMIN, UserRole.ACCOUNTANT];

    if (!allowedRoles.includes(userRole)) {
      return {
        success: false,
        error: 'Insufficient permissions to generate invoice PDFs',
      };
    }

    // 1. Load invoice
    const invoiceResults = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    const invoice = invoiceResults[0];

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    // 2. Load customer
    const customerResults = await db
      .select()
      .from(customers)
      .where(eq(customers.id, invoice.customerId))
      .limit(1);

    const customer = customerResults[0];

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found for invoice',
      };
    }

    // 3. Load invoice lines with items
    const lines = await db
      .select({
        id: invoiceLines.id,
        invoiceId: invoiceLines.invoiceId,
        itemId: invoiceLines.itemId,
        description: invoiceLines.description,
        quantity: invoiceLines.quantity,
        rate: invoiceLines.rate,
        amount: invoiceLines.amount,
        item: {
          id: items.id,
          name: items.name,
          sku: items.sku,
        },
      })
      .from(invoiceLines)
      .leftJoin(items, eq(invoiceLines.itemId, items.id))
      .where(eq(invoiceLines.invoiceId, invoiceId));

    // 4. Load business settings for company information
    const businessConfig = await db
      .select()
      .from(businessSettings)
      .limit(1);

    const companyInfo = businessConfig[0];

    if (!companyInfo) {
      return {
        success: false,
        error: 'Business settings not configured',
      };
    }

    // 5. Get translations for PDF labels
    const t = await getTranslations({ locale, namespace: 'sales.pdf' });

    // 6. Prepare PDF labels with company data from database
    const labels = {
      // Company info from database (prefer local/Russian version)
      companyName: companyInfo.companyNameLocal || companyInfo.companyName || t('companyName'),
      companyAddress: companyInfo.addressLocal || companyInfo.address || '',
      companyTaxId: companyInfo.taxId || '',
      companyPhone: companyInfo.phone || '',
      companyEmail: companyInfo.email || '',

      // Bank details from database
      bankName: companyInfo.bankName || t('bankName'),
      bankAccount: companyInfo.bankAccount || '00000000000000000000',
      bankMfo: companyInfo.bankMfo || '00000',

      // Signatories from database
      directorName: companyInfo.directorName || '',
      accountantName: companyInfo.accountantName || '',

      // UI labels from translations
      invoice: t('invoice'),
      invoiceNumber: t('invoiceNumber'),
      date: t('date'),
      dueDate: t('dueDate'),
      billTo: t('billTo'),
      taxId: t('taxId'),
      phone: t('phone'),
      email: t('email'),
      itemColumn: t('itemColumn'),
      qtyColumn: t('qtyColumn'),
      priceColumn: t('priceColumn'),
      amountColumn: t('amountColumn'),
      subtotal: t('subtotal'),
      total: t('total'),
      bankDetails: t('bankDetails'),
      mfo: t('mfo'),
      accountNumber: t('accountNumber'),
      director: t('director'),
      accountant: t('accountant'),
      signature: t('signature'),
    };

    // 7. Register fonts for Cyrillic support (idempotent operation)
    registerPdfFonts();

    // 8. Transform lines to match expected type (convert null to undefined)
    const transformedLines = lines.map(line => ({
      ...line,
      item: line.item ? {
        name: line.item.name,
        sku: line.item.sku ?? undefined,
      } : undefined,
    }));

    // 9. Render PDF to stream
    const pdfElement = React.createElement(InvoicePdf, {
      invoice,
      customer,
      items: transformedLines,
      labels,
    });

    const stream = await renderToStream(pdfElement as any);

    // 10. Convert stream to Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    // 11. Convert to base64 for transmission
    const pdfBase64 = pdfBuffer.toString('base64');

    // Generate filename
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;

    return {
      success: true,
      pdfBase64,
      filename,
    };
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
