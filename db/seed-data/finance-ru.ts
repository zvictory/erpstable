import { db } from '../index';
import { glAccounts } from '../schema/finance';
import { eq } from 'drizzle-orm';

/**
 * Seed GL accounts with Russian translations
 * Standard chart of accounts for Uzbekistan market
 * Includes WIP account (1330) for manufacturing cost tracking
 */
export async function seedGlAccountsRu() {
    const chartOfAccounts = [
        // Asset Accounts (1000-1399)
        {
            code: '1010',
            name: 'Касса',
            type: 'Asset',
            description: 'Наличные деньги в кассе',
        },
        {
            code: '1110',
            name: 'Банковский счет',
            type: 'Asset',
            description: 'Расчетный счет компании для платежей и поступлений',
        },
        {
            code: '1200',
            name: 'Счета к получению',
            type: 'Asset',
            description: 'Счета клиентов, еще не оплаченные',
        },
        {
            code: '1310',
            name: 'Сырье и материалы',
            type: 'Asset',
            description: 'Сырье, ожидающее использования в производстве',
        },
        {
            code: '1330',
            name: 'Незавершенное производство',
            type: 'Asset',
            description: 'НЗП - накопление затрат через этапы маршрутизации',
        },
        {
            code: '1340',
            name: 'Готовая продукция',
            type: 'Asset',
            description: 'Готовая продукция для продажи',
        },

        // Liability Accounts (2000-2399)
        {
            code: '2100',
            name: 'Счета к оплате',
            type: 'Liability',
            description: 'Счета поставщиков, еще не оплаченные',
        },
        {
            code: '2110',
            name: 'Начисленные обязательства (ТМЦ в пути)',
            type: 'Liability',
            description: 'Товары получены, но счет не выставлен',
        },
        {
            code: '2200',
            name: 'Начисленные расходы',
            type: 'Liability',
            description: 'Расходы понесены, но еще не оплачены',
        },

        // Equity Accounts (3000-3399)
        {
            code: '3100',
            name: 'Уставный капитал',
            type: 'Equity',
            description: 'Вклад владельцев в бизнес',
        },
        {
            code: '3200',
            name: 'Нераспределенная прибыль',
            type: 'Equity',
            description: 'Накопленная прибыль/убытки за прошлые периоды',
        },

        // Revenue Accounts (4000-4399)
        {
            code: '4000',
            name: 'Выручка от реализации',
            type: 'Revenue',
            description: 'Доход от продаж',
        },

        // Expense Accounts (5000-5999)
        {
            code: '5000',
            name: 'Производственные накладные расходы',
            type: 'Expense',
            description: 'Накладные расходы производства',
        },
        {
            code: '5100',
            name: 'Себестоимость продаж',
            type: 'Expense',
            description: 'Себестоимость проданных товаров',
        },
        {
            code: '5200',
            name: 'Коммерческие расходы',
            type: 'Expense',
            description: 'Расходы на продажи и маркетинг',
        },
        {
            code: '5300',
            name: 'Общехозяйственные расходы',
            type: 'Expense',
            description: 'Административные расходы',
        },
    ];

    for (const account of chartOfAccounts) {
        // Check if account already exists
        const existing = await db.select().from(glAccounts)
            .where(eq(glAccounts.code, account.code))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(glAccounts).values({
                ...account,
                balance: 0,
                isActive: true,
            });
            console.log(`✓ Создан счет: ${account.code} - ${account.name}`);
        } else {
            console.log(`⊘ Счет уже существует: ${account.code}`);
        }
    }
}
