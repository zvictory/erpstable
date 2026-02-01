// db/schema/hr.ts
// Human Resources and Payroll Schema

import { sql, relations } from 'drizzle-orm';
import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { users } from './auth';
import { journalEntries } from './finance';

// Shared timestamp fields
const timestampFields = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
};

// ============================================
// PAYROLL PERIODS
// ============================================

export const payrollPeriods = sqliteTable(
  "payroll_periods",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    periodName: text("period_name").notNull(), // e.g., "Январь 2026"
    startDate: integer("start_date", { mode: 'timestamp' }).notNull(),
    endDate: integer("end_date", { mode: 'timestamp' }).notNull(),
    payDate: integer("pay_date", { mode: 'timestamp' }).notNull(), // Usually 5th of following month
    status: text("status", { enum: ["DRAFT", "APPROVED", "PAID"] }).notNull().default("DRAFT"),

    // Aggregate totals (calculated from payslips) - stored in Tiyin
    totalGrossPay: integer("total_gross_pay").notNull().default(0),
    totalDeductions: integer("total_deductions").notNull().default(0),
    totalNetPay: integer("total_net_pay").notNull().default(0),

    // Approval tracking
    approvedBy: integer("approved_by").references(() => users.id),
    approvedAt: integer("approved_at", { mode: 'timestamp' }),

    // GL integration
    journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),

    // Audit
    createdBy: integer("created_by").notNull().references(() => users.id),
    ...timestampFields,
  },
  (table) => ({
    statusIdx: index("payroll_periods_status_idx").on(table.status),
    dateRangeIdx: index("payroll_periods_date_range_idx").on(table.startDate, table.endDate),
  })
);



// ============================================
// PAYSLIPS (Per Employee)
// ============================================

export const payslips = sqliteTable(
  "payslips",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    periodId: integer("period_id").notNull().references(() => payrollPeriods.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id), // Employee

    // Compensation breakdown - stored in Tiyin
    grossPay: integer("gross_pay").notNull().default(0),
    totalTax: integer("total_tax").notNull().default(0),
    totalDeductions: integer("total_deductions").notNull().default(0),
    netPay: integer("net_pay").notNull().default(0),

    // For hourly workers (future use)
    regularHours: integer("regular_hours").default(0),
    overtimeHours: integer("overtime_hours").default(0),

    // Status (mirrors period status, but can be individually managed)
    status: text("status", { enum: ["DRAFT", "APPROVED", "PAID"] }).notNull().default("DRAFT"),

    // GL integration (optional: per-payslip journal entries)
    journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),

    // Audit
    ...timestampFields,
  },
  (table) => ({
    periodUserUniqueIdx: uniqueIndex("payslips_period_user_idx").on(table.periodId, table.userId),
    periodIdx: index("payslips_period_idx").on(table.periodId),
    userIdx: index("payslips_user_idx").on(table.userId),
    statusIdx: index("payslips_status_idx").on(table.status),
  })
);



// ============================================
// PAYSLIP ITEMS (Line Items)
// ============================================

export const payslipItems = sqliteTable(
  "payslip_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    payslipId: integer("payslip_id").notNull().references(() => payslips.id, { onDelete: "cascade" }),

    itemType: text("item_type", { enum: ["EARNING", "DEDUCTION", "TAX"] }).notNull(),
    description: text("description").notNull(), // e.g., "Базовая зарплата", "Подоходный налог"
    amount: integer("amount").notNull(), // In Tiyin

    // GL account for this line item
    accountCode: text("account_code"), // e.g., "6010", "2410"

    // Audit
    createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => ({
    payslipIdx: index("payslip_items_payslip_id_idx").on(table.payslipId),
    typeIdx: index("payslip_items_type_idx").on(table.itemType),
  })
);



// ============================================
// EMPLOYEE COMPENSATION (Temporal)
// ============================================

export const employeeCompensation = sqliteTable(
  "employee_compensation",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id),

    compensationType: text("compensation_type", {
      enum: ["MONTHLY_SALARY", "HOURLY_WAGE"]
    }).notNull().default("MONTHLY_SALARY"),

    // Salary data - stored in Tiyin
    monthlySalary: integer("monthly_salary"), // For monthly employees
    hourlyWage: integer("hourly_wage"), // For hourly workers

    // Temporal validity
    effectiveFrom: integer("effective_from", { mode: 'timestamp' }).notNull(),
    effectiveTo: integer("effective_to", { mode: 'timestamp' }), // NULL = current compensation

    // Notes
    notes: text("notes"),

    // Audit
    createdBy: integer("created_by").notNull().references(() => users.id),
    createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => ({
    userEffectiveIdx: index("employee_compensation_user_effective_idx").on(
      table.userId,
      table.effectiveFrom,
      table.effectiveTo
    ),
    effectiveToIdx: index("employee_compensation_effective_to_idx").on(table.effectiveTo),
  })
);


