import { runMonthlyDepreciation } from '../app/actions/depreciation';

/**
 * MONTHLY DEPRECIATION PROCESSOR
 *
 * Run depreciation for a specific month (or current month by default)
 *
 * Usage:
 *   npm run db:depreciation              # Run for current month
 *   npm run db:depreciation 2024 12      # Run for December 2024
 *   npx tsx src/scripts/run-depreciation.ts 2024 1
 *
 * This script:
 * 1. Parses year and month arguments (defaults to current)
 * 2. Calls runMonthlyDepreciation() server action
 * 3. Displays results and summary
 * 4. Exits with appropriate status code
 */

async function main() {
    // Parse arguments
    const args = process.argv.slice(2);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    let year = currentYear;
    let month = currentMonth;

    if (args.length >= 2) {
        year = parseInt(args[0], 10);
        month = parseInt(args[1], 10);
    } else if (args.length === 1) {
        year = parseInt(args[0], 10);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('🏭 MONTHLY DEPRECIATION PROCESSOR');
    console.log('═'.repeat(60));
    console.log(`\nPeriod: ${year}-${String(month).padStart(2, '0')}`);
    console.log(`Time: ${new Date().toLocaleString()}\n`);

    try {
        const result = await runMonthlyDepreciation(year, month);

        console.log('\n' + '─'.repeat(60));

        if (result.success) {
            console.log('✅ DEPRECIATION RUN COMPLETED SUCCESSFULLY\n');
            console.log(`  📊 Assets Processed: ${result.processedCount}`);
            console.log(`  ⏭️  Assets Skipped: ${result.skippedCount}`);
            console.log(`  💰 Total Depreciation: ${result.totalAmount.toLocaleString()} Tiyin`);

            if (result.errors.length > 0) {
                console.log(`\n  ⚠️  Errors Encountered: ${result.errors.length}`);
                for (const error of result.errors) {
                    if (error.assetId > 0) {
                        console.log(`     Asset #${error.assetId}: ${error.message}`);
                    } else {
                        console.log(`     ${error.message}`);
                    }
                }
            }

            console.log('\n' + '═'.repeat(60));
            console.log('✅ Process completed successfully');
            console.log('═'.repeat(60) + '\n');
            process.exit(0);
        } else {
            console.log('❌ DEPRECIATION RUN FAILED\n');
            console.log(`  Message: ${result.message}`);

            if (result.errors.length > 0) {
                console.log(`\n  Errors:`);
                for (const error of result.errors) {
                    if (error.assetId > 0) {
                        console.log(`    Asset #${error.assetId}: ${error.message}`);
                    } else {
                        console.log(`    ${error.message}`);
                    }
                }
            }

            console.log('\n' + '═'.repeat(60));
            console.log('❌ Process failed');
            console.log('═'.repeat(60) + '\n');
            process.exit(1);
        }
    } catch (error: any) {
        console.log('❌ UNEXPECTED ERROR\n');
        console.log(`  ${error.message || error}\n`);

        if (error.stack) {
            console.log('Stack trace:');
            console.log(error.stack);
        }

        console.log('\n' + '═'.repeat(60));
        console.log('❌ Process failed with unexpected error');
        console.log('═'.repeat(60) + '\n');
        process.exit(1);
    }
}

main();
