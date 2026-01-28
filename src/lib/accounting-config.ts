export const ACCOUNTS = {
    AP_LOCAL: "2100", // Accounts Payable (Liability)
    INVENTORY_RAW: "1310", // Inventory - Raw Materials (Asset)
    BANK_MAIN: "1110", // Bank Account (Asset)
    VAT_INPUT: "2300", // VAT Payable (Liability) - Using 2300 as placeholder for Tax
    SALES_TAX: "2200", // Sales Tax Payable (Liability)
    AR: "1200", // Accounts Receivable (Asset)
    SALES_INCOME: "4100", // Sales Revenue
    PETTY_CASH: "1010", // Petty Cash (Asset)
    EMPLOYEE_PAYABLES: "2150", // Employee Reimbursements Payable (Liability)
    EXPENSE_TRAVEL: "5100", // Travel Expenses
    EXPENSE_MEALS: "5200", // Meals & Entertainment
    EXPENSE_OFFICE: "5300", // Office Supplies
    EXPENSE_FUEL: "5400", // Fuel & Vehicle
    EXPENSE_COMMS: "5500", // Communications
    EXPENSE_MISC: "5900", // Miscellaneous Expenses

    // Maintenance & Repair Accounts (CMMS)
    MAINTENANCE_EXPENSE: "5600", // Maintenance Expense (parent)
    MAINTENANCE_LABOR: "5610", // Maintenance Labor
    MAINTENANCE_PARTS: "5620", // Maintenance Parts
    MAINTENANCE_EXTERNAL: "5630", // External Services
    MAINTENANCE_PAYABLES: "2180", // Maintenance Payables

    // Payroll Accounts
    SALARY_EXPENSE: "6010", // Salary Expense
    WAGE_EXPENSE: "6020", // Wage Expense
    OVERTIME_EXPENSE: "6030", // Overtime Expense
    BONUS_EXPENSE: "6040", // Bonus Expense
    PAYROLL_TAX_EXPENSE: "6050", // Payroll Tax Expense
    SALARIES_PAYABLE: "2400", // Salaries Payable
    TAX_PAYABLE_INCOME: "2410", // Income Tax Withheld
    TAX_PAYABLE_PENSION: "2420", // Pension Fund Payable
    TAX_PAYABLE_SOCIAL: "2430", // Social Tax Payable
    INSURANCE_PAYABLE: "2440", // Insurance Payable
};
