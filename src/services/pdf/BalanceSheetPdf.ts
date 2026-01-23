
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { db } from '../../../db';
import { glAccounts, journalEntryLines, journalEntries } from '../../../db/schema';
import { eq, and, lte, sum, sql, desc } from 'drizzle-orm';

export class BalanceSheetPdf {
    /**
     * Generates a PDF buffer for the Balance Sheet as of `asOfDate`.
     */
    async generate(asOfDate: Date): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            // 1. Fetch Data
            // Sum balances per account up to asOfDate
            // We need Account Name, Type, and Sum(Dr - Cr) or (Cr - Dr) depending on type.

            const balances = await db.select({
                code: glAccounts.code,
                name: glAccounts.name,
                type: glAccounts.type,
                balance: sql<number>`sum(${journalEntryLines.debit}) - sum(${journalEntryLines.credit})`
            })
                .from(journalEntryLines)
                .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
                .innerJoin(glAccounts, eq(journalEntryLines.accountCode, glAccounts.code))
                .where(and(
                    lte(journalEntries.date, asOfDate),
                    eq(journalEntries.isPosted, true)
                ))
                .groupBy(glAccounts.code, glAccounts.name, glAccounts.type);

            // Separate into Assets and Liab/Equity
            const assets = balances.filter(b => b.type === 'Asset').map(b => ({ ...b, value: b.balance }));
            const liabilities = balances.filter(b => b.type === 'Liability').map(b => ({ ...b, value: -b.balance })); // Credit normal
            const equity = balances.filter(b => b.type === 'Equity').map(b => ({ ...b, value: -b.balance })); // Credit normal

            const totalAssets = assets.reduce((s, i) => s + i.value, 0);
            const totalLiab = liabilities.reduce((s, i) => s + i.value, 0);
            const totalEquity = equity.reduce((s, i) => s + i.value, 0);

            // 2. Initialize PDF
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers: Buffer[] = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // 3. Font Setup for Cyrillic
            // Assuming font exists in public/fonts. 
            // If not present, this will fail in runtime (fs.readFileSync), so we wrap or point to a system font if specific path fails.
            const fontPath = path.resolve(process.cwd(), 'public/fonts/Roboto-Regular.ttf');
            if (fs.existsSync(fontPath)) {
                doc.font(fontPath);
            } else {
                // Fallback or warning - standard fonts don't support Cyrillic well.
                console.warn("Custom font not found at " + fontPath + ". Cyrillic may not render.");
                doc.font('Helvetica'); // Will likely corrupt Russian text
            }

            // 4. Header
            doc.fontSize(20).text('LAZA LLC', { align: 'center' });
            doc.fontSize(16).text('Бухгалтерский баланс (Balance Sheet)', { align: 'center' });
            doc.fontSize(12).text(`As of: ${asOfDate.toISOString().split('T')[0]}`, { align: 'center' });
            doc.moveDown(2);

            // 5. Draw Table (2 Columns)
            // Left: Assets. Right: Liabilities + Equity.
            const startY = doc.y;
            const midX = doc.page.width / 2;
            const leftColX = 50;
            const rightColX = midX + 25;
            const colWidth = (midX - 75);

            // -- Left Column (Assets) --
            doc.fontSize(14).text('АКТИВЫ (Assets)', leftColX, startY, { width: colWidth, underline: true });
            doc.moveDown(0.5);

            let currentY = doc.y;
            doc.fontSize(10);

            assets.forEach(acc => {
                doc.text(acc.code + ' ' + acc.name, leftColX, currentY, { width: colWidth * 0.7 });
                doc.text(this.formatMoney(acc.value), leftColX + (colWidth * 0.7), currentY, { width: colWidth * 0.3, align: 'right' });
                currentY += 15;
            });

            // Total Assets
            currentY += 10;
            doc.fontSize(12).font(fontPath ? fontPath : 'Helvetica-Bold').text('Итого Активы:', leftColX, currentY);
            doc.text(this.formatMoney(totalAssets), leftColX + (colWidth * 0.7), currentY, { width: colWidth * 0.3, align: 'right' });


            // -- Right Column (Liabilities & Equity) --
            // Reset Y
            let rightY = startY;

            // Liabilities
            doc.fontSize(14).text('ОБЯЗАТЕЛЬСТВА (Liabilities)', rightColX, rightY, { width: colWidth, underline: true });
            rightY += 25; // MoveDown equivalent
            doc.fontSize(10);

            liabilities.forEach(acc => {
                doc.text(acc.code + ' ' + acc.name, rightColX, rightY, { width: colWidth * 0.7 });
                doc.text(this.formatMoney(acc.value), rightColX + (colWidth * 0.7), rightY, { width: colWidth * 0.3, align: 'right' });
                rightY += 15;
            });

            // Equity
            rightY += 20;
            doc.fontSize(14).text('СОБСТВЕННЫЙ КАПИТАЛ (Equity)', rightColX, rightY, { width: colWidth, underline: true });
            rightY += 25;
            doc.fontSize(10);

            equity.forEach(acc => {
                doc.text(acc.code + ' ' + acc.name, rightColX, rightY, { width: colWidth * 0.7 });
                doc.text(this.formatMoney(acc.value), rightColX + (colWidth * 0.7), rightY, { width: colWidth * 0.3, align: 'right' });
                rightY += 15;
            });

            // Total Liab + Eq
            rightY += 10;
            doc.fontSize(12).font(fontPath ? fontPath : 'Helvetica-Bold').text('Итого Пассивы:', rightColX, rightY);
            doc.text(this.formatMoney(totalLiab + totalEquity), rightColX + (colWidth * 0.7), rightY, { width: colWidth * 0.3, align: 'right' });

            // 6. Footer
            const bottomY = doc.page.height - 100;
            doc.fontSize(10).text(`Generated on ${new Date().toISOString()}`, 50, bottomY);
            doc.text('Signature: __________________________', 300, bottomY, { align: 'right' });

            doc.end();
        });
    }

    private formatMoney(tiyin: number): string {
        // 1 250 000.00 UZS
        const val = tiyin / 100; // Assuming storage in lowest unit
        return val.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' UZS';
    }
}
