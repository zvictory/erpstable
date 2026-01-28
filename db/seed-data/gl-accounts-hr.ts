// db/seed-data/gl-accounts-hr.ts
// Chart of Accounts - Human Resources and Payroll

export const hrGLAccounts = [
  // ============================================
  // EXPENSE ACCOUNTS (6000 series)
  // ============================================
  {
    code: "6010",
    name: "Расходы на заработную плату", // Salary Expense
    type: "Expense" as const,
    description: "Основная заработная плата сотрудников (оклады)",
    balance: 0,
  },
  {
    code: "6020",
    name: "Расходы на почасовую оплату", // Wage Expense
    type: "Expense" as const,
    description: "Почасовая оплата труда сотрудников",
    balance: 0,
  },
  {
    code: "6030",
    name: "Расходы на сверхурочные", // Overtime Expense
    type: "Expense" as const,
    description: "Оплата сверхурочных часов",
    balance: 0,
  },
  {
    code: "6040",
    name: "Расходы на премии и бонусы", // Bonus Expense
    type: "Expense" as const,
    description: "Премиальные выплаты сотрудникам",
    balance: 0,
  },
  {
    code: "6050",
    name: "Расходы на налоги с заработной платы", // Payroll Tax Expense
    type: "Expense" as const,
    description: "Налоги, уплачиваемые работодателем (ЕСП, взносы)",
    balance: 0,
  },

  // ============================================
  // LIABILITY ACCOUNTS (2400 series)
  // ============================================
  {
    code: "2400",
    name: "Задолженность по заработной плате", // Salaries Payable
    type: "Liability" as const,
    description: "Начисленная, но не выплаченная заработная плата",
    balance: 0,
  },
  {
    code: "2410",
    name: "Задолженность по подоходному налогу", // Income Tax Withheld
    type: "Liability" as const,
    description: "Удержанный подоходный налог (12%)",
    balance: 0,
  },
  {
    code: "2420",
    name: "Задолженность по пенсионным взносам", // Pension Fund Payable
    type: "Liability" as const,
    description: "Удержания в пенсионный фонд (8%)",
    balance: 0,
  },
  {
    code: "2430",
    name: "Задолженность по социальному налогу", // Social Tax Payable
    type: "Liability" as const,
    description: "Социальный налог работодателя",
    balance: 0,
  },
  {
    code: "2440",
    name: "Задолженность по медицинскому страхованию", // Insurance Payable
    type: "Liability" as const,
    description: "Отчисления на медицинское страхование",
    balance: 0,
  },
];
