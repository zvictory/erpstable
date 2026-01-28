'use server';

import { auth } from '@/auth';
import { db } from '../../../db';
import { z } from 'zod';
import { eq, and, desc, isNull, lte, gte, sql } from 'drizzle-orm';
import {
  payrollPeriods,
  payslips,
  payslipItems,
  employeeCompensation,
} from '../../../db/schema/hr';
import { users } from '../../../db/schema/auth';
import { journalEntries, journalEntryLines, glAccounts } from '../../../db/schema/finance';
import { ACCOUNTS } from '@/lib/accounting-config';
import { UserRole } from '@/auth.config';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createPeriodSchema = z.object({
  periodName: z.string().min(1, 'Period name is required'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  payDate: z.coerce.date(),
});

const approvePeriodSchema = z.object({
  periodId: z.string(),
});

const processPaymentSchema = z.object({
  periodId: z.string(),
  bankAccountCode: z.string().min(4).max(10),
});

const recalculateSchema = z.object({
  periodId: z.string(),
});

// ============================================
// TAX CONFIGURATION (Uzbekistan)
// ============================================

const TAX_RATES = {
  INCOME_TAX: 0.12, // 12% Подоходный налог
  PENSION_FUND: 0.08, // 8% Пенсионный фонд
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get active compensation for an employee at a given date
 */
async function getEmployeeCompensation(userId: number, date: Date) {
  const compensation = await db.query.employeeCompensation.findFirst({
    where: and(
      eq(employeeCompensation.userId, userId),
      lte(employeeCompensation.effectiveFrom, date),
      isNull(employeeCompensation.effectiveTo) // Current compensation
    ),
  });

  return compensation;
}

/**
 * Calculate gross pay for a monthly salary employee (already in Tiyin)
 */
function calculateMonthlyGrossPay(monthlySalaryTiyin: number): number {
  return monthlySalaryTiyin;
}

/**
 * Calculate taxes and deductions (all in Tiyin)
 */
function calculateDeductions(grossPayTiyin: number) {
  const incomeTax = Math.round(grossPayTiyin * TAX_RATES.INCOME_TAX);
  const pensionFund = Math.round(grossPayTiyin * TAX_RATES.PENSION_FUND);
  const totalDeductions = incomeTax + pensionFund;

  return {
    incomeTax,
    pensionFund,
    totalDeductions,
  };
}

// ============================================
// MAIN ACTIONS
// ============================================

/**
 * Create a new payroll period
 */
export async function createPayrollPeriod(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const userRole = (session?.user as any)?.role as UserRole;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
    throw new Error('Insufficient permissions');
  }

  const data = createPeriodSchema.parse(input);

  const period = await db.insert(payrollPeriods).values({
    periodName: data.periodName,
    startDate: data.startDate,
    endDate: data.endDate,
    payDate: data.payDate,
    status: 'DRAFT',
  }).returning();

  return { success: true, period: period[0] };
}

/**
 * Generate payslips for all active employees in a period
 */
export async function generatePayrollPeriod(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const userRole = (session?.user as any)?.role as UserRole;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
    throw new Error('Insufficient permissions');
  }

  const { periodId } = recalculateSchema.parse(input);

  // Get period
  const period = await db.query.payrollPeriods.findFirst({
    where: eq(payrollPeriods.id, Number(periodId)),
  });

  if (!period) {
    throw new Error('Period not found');
  }

  if (period.status !== 'DRAFT') {
    throw new Error('Can only generate payroll for DRAFT periods');
  }

  // Get all active employees
  const activeEmployees = await db.query.users.findMany({
    where: eq(users.isActive, true),
  });

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  // Generate payslip for each employee
  for (const employee of activeEmployees) {
    // Get employee compensation
    const compensation = await getEmployeeCompensation(employee.id, period.endDate);

    if (!compensation || !compensation.monthlySalary) {
      console.warn(`No compensation found for employee ${employee.id}, skipping`);
      continue;
    }

    // monthlySalary is already in Tiyin (integer)
    const grossPay = calculateMonthlyGrossPay(compensation.monthlySalary);
    const { incomeTax, pensionFund, totalDeductions: deductions } = calculateDeductions(grossPay);
    const netPay = grossPay - deductions;

    // Create or update payslip
    const [payslip] = await db.insert(payslips).values({
      periodId: period.id,
      userId: employee.id,
      grossPay: grossPay,
      totalTax: incomeTax + pensionFund,
      totalDeductions: deductions,
      netPay: netPay,
      status: 'DRAFT',
    })
    .onConflictDoUpdate({
      target: [payslips.periodId, payslips.userId],
      set: {
        grossPay: grossPay,
        totalTax: incomeTax + pensionFund,
        totalDeductions: deductions,
        netPay: netPay,
        updatedAt: new Date(),
      }
    })
    .returning();

    // Delete existing payslip items
    await db.delete(payslipItems).where(eq(payslipItems.payslipId, payslip.id));

    // Create payslip items (all amounts in Tiyin)
    await db.insert(payslipItems).values([
      {
        payslipId: payslip.id,
        itemType: 'EARNING',
        description: 'Базовая заработная плата',
        amount: grossPay,
        accountCode: ACCOUNTS.SALARY_EXPENSE,
      },
      {
        payslipId: payslip.id,
        itemType: 'TAX',
        description: 'Подоходный налог (12%)',
        amount: incomeTax,
        accountCode: ACCOUNTS.TAX_PAYABLE_INCOME,
      },
      {
        payslipId: payslip.id,
        itemType: 'TAX',
        description: 'Пенсионный фонд (8%)',
        amount: pensionFund,
        accountCode: ACCOUNTS.TAX_PAYABLE_PENSION,
      },
    ]);

    totalGross += grossPay;
    totalDeductions += deductions;
    totalNet += netPay;
  }

  // Update period totals (all in Tiyin)
  await db.update(payrollPeriods)
    .set({
      totalGrossPay: totalGross,
      totalDeductions: totalDeductions,
      totalNetPay: totalNet,
      updatedAt: new Date(),
    })
    .where(eq(payrollPeriods.id, Number(periodId)));

  return { success: true, employeeCount: activeEmployees.length };
}

/**
 * Approve payroll period (creates journal entry)
 */
export async function approvePayrollPeriod(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const userRole = (session?.user as any)?.role as UserRole;
  if (userRole !== UserRole.ADMIN) {
    throw new Error('Only Admin can approve payroll');
  }

  const { periodId } = approvePeriodSchema.parse(input);

  // Get period with payslips
  const period = await db.query.payrollPeriods.findFirst({
    where: eq(payrollPeriods.id, Number(periodId)),
    with: {
      payslips: {
        with: {
          items: true,
        },
      },
    },
  });

  if (!period) {
    throw new Error('Period not found');
  }

  if (period.status !== 'DRAFT') {
    throw new Error('Period is not in DRAFT status');
  }

  if (!period.payslips || period.payslips.length === 0) {
    throw new Error('No payslips to approve');
  }

  // All values are already in Tiyin (integers)
  const totalGross = period.totalGrossPay;
  const totalDeductions = period.totalDeductions;
  const totalNet = period.totalNetPay;

  // Calculate tax breakdown
  let totalIncomeTax = 0;
  let totalPensionFund = 0;

  for (const payslip of period.payslips) {
    for (const item of payslip.items) {
      if (item.accountCode === ACCOUNTS.TAX_PAYABLE_INCOME) {
        totalIncomeTax += item.amount;
      } else if (item.accountCode === ACCOUNTS.TAX_PAYABLE_PENSION) {
        totalPensionFund += item.amount;
      }
    }
  }

  // Create journal entry (Accrual entry)
  const [journalEntry] = await db.insert(journalEntries).values({
    date: period.endDate,
    description: `Начисление заработной платы - ${period.periodName}`,
    reference: 'PAYROLL',
    transactionId: String(period.id),
  }).returning();

  // Create journal entry lines (amounts in Tiyin)
  const lines = [
    // Debit: Salary Expense
    {
      journalEntryId: journalEntry.id,
      accountCode: ACCOUNTS.SALARY_EXPENSE,
      debit: totalGross,
      credit: 0,
      description: `Расходы на заработную плату - ${period.periodName}`,
    },
    // Credit: Salaries Payable (net amount to pay)
    {
      journalEntryId: journalEntry.id,
      accountCode: ACCOUNTS.SALARIES_PAYABLE,
      debit: 0,
      credit: totalNet,
      description: `Задолженность по заработной плате - ${period.periodName}`,
    },
    // Credit: Income Tax Withheld
    {
      journalEntryId: journalEntry.id,
      accountCode: ACCOUNTS.TAX_PAYABLE_INCOME,
      debit: 0,
      credit: totalIncomeTax,
      description: `Подоходный налог удержанный - ${period.periodName}`,
    },
    // Credit: Pension Fund Payable
    {
      journalEntryId: journalEntry.id,
      accountCode: ACCOUNTS.TAX_PAYABLE_PENSION,
      debit: 0,
      credit: totalPensionFund,
      description: `Пенсионные взносы удержанные - ${period.periodName}`,
    },
  ];

  await db.insert(journalEntryLines).values(lines);

  // Update GL account balances (values in Tiyin)
  await db.execute(sql`
    UPDATE gl_accounts
    SET balance = balance + ${totalGross}
    WHERE code = ${ACCOUNTS.SALARY_EXPENSE}
  `);

  await db.execute(sql`
    UPDATE gl_accounts
    SET balance = balance + ${totalNet}
    WHERE code = ${ACCOUNTS.SALARIES_PAYABLE}
  `);

  await db.execute(sql`
    UPDATE gl_accounts
    SET balance = balance + ${totalIncomeTax}
    WHERE code = ${ACCOUNTS.TAX_PAYABLE_INCOME}
  `);

  await db.execute(sql`
    UPDATE gl_accounts
    SET balance = balance + ${totalPensionFund}
    WHERE code = ${ACCOUNTS.TAX_PAYABLE_PENSION}
  `);

  // Update period status
  await db.update(payrollPeriods)
    .set({
      status: 'APPROVED',
      approvedBy: Number(session.user.id),
      approvedAt: new Date(),
      journalEntryId: journalEntry.id,
      updatedAt: new Date(),
    })
    .where(eq(payrollPeriods.id, Number(periodId)));

  // Update all payslips to APPROVED
  await db.update(payslips)
    .set({ status: 'APPROVED', updatedAt: new Date() })
    .where(eq(payslips.periodId, Number(periodId)));

  return { success: true, journalEntryId: journalEntry.id };
}

/**
 * Process payroll payment (clears liabilities)
 */
export async function processPayrollPayment(input: unknown) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const userRole = (session?.user as any)?.role as UserRole;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
    throw new Error('Insufficient permissions');
  }

  const data = processPaymentSchema.parse(input);

  // Get period
  const period = await db.query.payrollPeriods.findFirst({
    where: eq(payrollPeriods.id, Number(data.periodId)),
    with: {
      payslips: {
        with: {
          items: true,
        },
      },
    },
  });

  if (!period) {
    throw new Error('Period not found');
  }

  if (period.status !== 'APPROVED') {
    throw new Error('Period must be APPROVED before processing payment');
  }

  // All values in Tiyin
  const totalNet = period.totalNetPay;

  // Calculate total tax liabilities to pay
  let totalIncomeTax = 0;
  let totalPensionFund = 0;

  for (const payslip of period.payslips) {
    for (const item of payslip.items) {
      if (item.accountCode === ACCOUNTS.TAX_PAYABLE_INCOME) {
        totalIncomeTax += item.amount;
      } else if (item.accountCode === ACCOUNTS.TAX_PAYABLE_PENSION) {
        totalPensionFund += item.amount;
      }
    }
  }

  const totalPayment = totalNet + totalIncomeTax + totalPensionFund;

  // Create payment journal entry
  const [paymentJE] = await db.insert(journalEntries).values({
    date: period.payDate,
    description: `Выплата заработной платы - ${period.periodName}`,
    reference: 'PAYROLL_PAY',
    transactionId: String(period.id),
  }).returning();

  // Create journal entry lines (amounts in Tiyin)
  const lines = [
    // Debit: Salaries Payable (clearing the liability)
    {
      journalEntryId: paymentJE.id,
      accountCode: ACCOUNTS.SALARIES_PAYABLE,
      debit: totalNet,
      credit: 0,
      description: `Выплата заработной платы - ${period.periodName}`,
    },
    // Debit: Income Tax Payable (clearing the liability)
    {
      journalEntryId: paymentJE.id,
      accountCode: ACCOUNTS.TAX_PAYABLE_INCOME,
      debit: totalIncomeTax,
      credit: 0,
      description: `Оплата подоходного налога - ${period.periodName}`,
    },
    // Debit: Pension Fund Payable (clearing the liability)
    {
      journalEntryId: paymentJE.id,
      accountCode: ACCOUNTS.TAX_PAYABLE_PENSION,
      debit: totalPensionFund,
      credit: 0,
      description: `Оплата пенсионных взносов - ${period.periodName}`,
    },
    // Credit: Bank Account
    {
      journalEntryId: paymentJE.id,
      accountCode: data.bankAccountCode,
      debit: 0,
      credit: totalPayment,
      description: `Списание со счета для выплаты ЗП - ${period.periodName}`,
    },
  ];

  await db.insert(journalEntryLines).values(lines);

  // Update GL account balances (values in Tiyin)
  await db.execute(sql`
    UPDATE gl_accounts
    SET balance = balance - ${totalNet}
    WHERE code = ${ACCOUNTS.SALARIES_PAYABLE}
  `);

  await db.execute(sql`
    UPDATE gl_accounts
    SET balance = balance - ${totalIncomeTax}
    WHERE code = ${ACCOUNTS.TAX_PAYABLE_INCOME}
  `);

  await db.execute(sql`
    UPDATE gl_accounts
    SET balance = balance - ${totalPensionFund}
    WHERE code = ${ACCOUNTS.TAX_PAYABLE_PENSION}
  `);

  await db.execute(sql`
    UPDATE gl_accounts
    SET balance = balance - ${totalPayment}
    WHERE code = ${data.bankAccountCode}
  `);

  // Update period status
  await db.update(payrollPeriods)
    .set({
      status: 'PAID',
      updatedAt: new Date(),
    })
    .where(eq(payrollPeriods.id, Number(data.periodId)));

  // Update all payslips to PAID
  await db.update(payslips)
    .set({ status: 'PAID', updatedAt: new Date() })
    .where(eq(payslips.periodId, Number(data.periodId)));

  return { success: true, journalEntryId: paymentJE.id };
}

/**
 * Get all payroll periods
 */
export async function getPayrollPeriods() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const userRole = (session?.user as any)?.role as UserRole;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
    throw new Error('Insufficient permissions');
  }

  const periods = await db.query.payrollPeriods.findMany({
    orderBy: desc(payrollPeriods.startDate),
    with: {
      approver: {
        columns: {
          id: true,
          name: true,
        },
      },
      creator: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  return periods;
}

/**
 * Get payroll period by ID with all payslips
 */
export async function getPayrollPeriodById(periodId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const userRole = (session?.user as any)?.role as UserRole;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
    throw new Error('Insufficient permissions');
  }

  const period = await db.query.payrollPeriods.findFirst({
    where: eq(payrollPeriods.id, Number(periodId)),
    with: {
      payslips: {
        with: {
          employee: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
        },
      },
      approver: {
        columns: {
          id: true,
          name: true,
        },
      },
      journalEntry: true,
    },
  });

  if (!period) {
    throw new Error('Period not found');
  }

  return period;
}

/**
 * Get employee payslip (for employee self-service)
 */
export async function getEmployeePayslip(periodId: string, employeeId?: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Use provided employeeId or default to current user
  const targetEmployeeId = employeeId ? Number(employeeId) : Number(session.user.id);

  // Check authorization
  const userRole = (session?.user as any)?.role as UserRole;
  if (userRole !== UserRole.ADMIN && userRole !== UserRole.ACCOUNTANT) {
    // Regular employee can only view own payslip
    if (targetEmployeeId !== Number(session.user.id)) {
      throw new Error('Insufficient permissions');
    }
  }

  const payslip = await db.query.payslips.findFirst({
    where: and(
      eq(payslips.periodId, Number(periodId)),
      eq(payslips.userId, targetEmployeeId)
    ),
    with: {
      period: true,
      employee: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: true,
    },
  });

  if (!payslip) {
    throw new Error('Payslip not found');
  }

  return payslip;
}

/**
 * Recalculate payroll (regenerate payslips for DRAFT period)
 */
export async function recalculatePayroll(input: unknown) {
  // This is essentially the same as generatePayrollPeriod
  return generatePayrollPeriod(input);
}
