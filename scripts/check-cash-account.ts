import { db } from '../db';
import { sql } from 'drizzle-orm';

async function checkCashAccount() {
    console.log('💰 Checking Cash Account Status...\n');

    try {
        // 1. Find all accounts with "cash" in the name
        console.log('1️⃣  Finding accounts with "cash" or "денежные" in name:');
        const cashAccounts = await db.all(sql`
            SELECT code, name, type, balance
            FROM gl_accounts
            WHERE LOWER(name) LIKE '%cash%'
            OR LOWER(name) LIKE '%денежные%'
            OR LOWER(name) LIKE '%касс%'
            ORDER BY code
        `);

        if (cashAccounts.length === 0) {
            console.log('   No cash accounts found by name search.');
        } else {
            cashAccounts.forEach((acc: any) => {
                const balance = acc.balance / 100;
                console.log(`   ${acc.code} - ${acc.name}`);
                console.log(`      Type: ${acc.type}, Balance: ${balance} UZS`);
            });
        }

        // 2. Get all journal entry lines for cash accounts
        console.log('\n2️⃣  Checking journal entries for cash accounts:');
        for (const acc of cashAccounts) {
            const entries = await db.all(sql`
                SELECT
                    jel.id,
                    je.date,
                    je.description,
                    je.reference,
                    je.transaction_id,
                    jel.debit,
                    jel.credit
                FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE jel.account_code = ${acc.code}
                ORDER BY je.date DESC, jel.id DESC
                LIMIT 20
            `);

            console.log(`\n   Account ${acc.code} has ${entries.length} entries:`);
            if (entries.length > 0) {
                entries.forEach((entry: any, idx: number) => {
                    const debit = entry.debit / 100;
                    const credit = entry.credit / 100;
                    console.log(`      ${idx + 1}. ${new Date(entry.date).toLocaleDateString()} - ${entry.description}`);
                    console.log(`         Dr: ${debit} UZS, Cr: ${credit} UZS`);
                });
            }
        }

        // 3. Show all accounts with non-zero balances
        console.log('\n3️⃣  Accounts with non-zero balances:');
        const accountsWithBalance = await db.all(sql`
            SELECT code, name, type, balance
            FROM gl_accounts
            WHERE balance != 0
            ORDER BY ABS(balance) DESC
            LIMIT 10
        `);

        accountsWithBalance.forEach((acc: any) => {
            const balance = acc.balance / 100;
            console.log(`   ${acc.code} - ${acc.name}: ${balance} UZS`);
        });

        // 4. Check dashboard KPIs to see if cash is tracked elsewhere
        console.log('\n4️⃣  Checking actual journal entry lines for account patterns:');
        const accountUsage = await db.all(sql`
            SELECT
                jel.account_code,
                ga.name,
                COUNT(*) as entry_count,
                SUM(jel.debit) as total_debit,
                SUM(jel.credit) as total_credit,
                (SUM(jel.debit) - SUM(jel.credit)) as net_balance
            FROM journal_entry_lines jel
            LEFT JOIN gl_accounts ga ON jel.account_code = ga.code
            GROUP BY jel.account_code
            HAVING entry_count > 0
            ORDER BY entry_count DESC
            LIMIT 10
        `);

        console.log('\n   Most used accounts:');
        accountUsage.forEach((usage: any) => {
            const balance = usage.net_balance / 100;
            console.log(`   ${usage.account_code} - ${usage.name || 'Unknown'}`);
            console.log(`      Entries: ${usage.entry_count}, Net Balance: ${balance} UZS`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkCashAccount();
