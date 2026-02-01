import { relations } from 'drizzle-orm';
import { users, passwordResetTokens } from './auth';
import {
    items, uoms, uomConversions, categories, inventoryLayers,
    inventoryLocationTransfers, warehouses, warehouseLocations,
    auditLogs, inventoryReserves, inventoryTransactions
} from './inventory';
import {
    vendors, purchaseOrders, purchaseOrderLines, vendorBills,
    vendorBillLines, landedCostAllocations, goodsReceivedNotes, grnItems
} from './purchasing';
import {
    leads, customers, priceLists, priceListRules, deals, activities,
    invoices, commissionRules, commissions, invoiceLines,
    customerPayments, paymentAllocations
} from './sales';
import {
    glAccounts, journalEntries, journalEntryLines, taxRates,
    taxGroups, analyticAccounts, bankStatements, statementLines
} from './finance';
import {
    payrollPeriods, payslips, payslipItems, employeeCompensation
} from './hr';
import { vendorPayments, vendorPaymentAllocations } from './payments';
import { expenseCategories, expenses } from './expenses';
import { fixedAssets, depreciationEntries } from './fixed_assets';
import { notifications } from './notifications';
import {
    customerAssets, serviceContracts, contractRefillItems,
    serviceTickets, serviceTicketAssets
} from './service';
import {
    workCenters, equipmentUnits, routings, routingSteps,
    workOrders, workOrderSteps, workOrderStepStatus,
    workOrderStepCosts, processReadings, productionLineKpiSnapshots,
    operatorPerformanceSnapshots, downtimeEvents, downtimeReasonCodes,
    maintenanceSchedules, maintenanceEvents, lineIssues
} from './manufacturing';
import { qualityTests, inspectionOrders, inspectionResults } from './quality';
import {
    recipes, recipeItems, productionRuns, productionRunSteps,
    productionInputs, productionOutputs, productionCosts,
    productionRunDependencies, productionLaborLogs,
    productionRunChains, productionRunChainMembers
} from './production';
import { bomHeaders, bomItems } from './manufacturing_bom';

// --- Auth ---
export const usersRelations = relations(users, ({ many }) => ({
    resetTokens: many(passwordResetTokens),
    approvedBills: many(vendorBills),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
    user: one(users, {
        fields: [passwordResetTokens.userId],
        references: [users.id],
    }),
}));

// --- Inventory ---
export const itemsRelations = relations(items, ({ one, many }) => ({
    category: one(categories, {
        fields: [items.categoryId],
        references: [categories.id],
    }),
    baseUom: one(uoms, {
        fields: [items.baseUomId],
        references: [uoms.id],
        relationName: 'baseUom'
    }),
    purchaseUom: one(uoms, {
        fields: [items.purchaseUomId],
        references: [uoms.id],
        relationName: 'purchaseUom'
    }),
    parent: one(items, {
        fields: [items.parentId],
        references: [items.id],
        relationName: 'itemHierarchy'
    }),
    children: many(items, {
        relationName: 'itemHierarchy'
    }),
    layers: many(inventoryLayers),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
    locations: many(warehouseLocations),
    inventoryLayers: many(inventoryLayers),
    fromTransfers: many(inventoryLocationTransfers, { relationName: 'fromWarehouse' }),
    toTransfers: many(inventoryLocationTransfers, { relationName: 'toWarehouse' }),
}));

export const warehouseLocationsRelations = relations(warehouseLocations, ({ one, many }) => ({
    warehouse: one(warehouses, {
        fields: [warehouseLocations.warehouseId],
        references: [warehouses.id]
    }),
    reservedForItem: one(items, {
        fields: [warehouseLocations.reservedForItemId],
        references: [items.id]
    }),
    inventoryLayers: many(inventoryLayers),
    fromTransfers: many(inventoryLocationTransfers, { relationName: 'fromLocation' }),
    toTransfers: many(inventoryLocationTransfers, { relationName: 'toLocation' }),
}));

export const inventoryLayersRelations = relations(inventoryLayers, ({ one }) => ({
    item: one(items, {
        fields: [inventoryLayers.itemId],
        references: [items.id],
    }),
    warehouse: one(warehouses, {
        fields: [inventoryLayers.warehouseId],
        references: [warehouses.id],
    }),
    location: one(warehouseLocations, {
        fields: [inventoryLayers.locationId],
        references: [warehouseLocations.id],
    }),
}));

export const inventoryLocationTransfersRelations = relations(inventoryLocationTransfers, ({ one }) => ({
    item: one(items, {
        fields: [inventoryLocationTransfers.itemId],
        references: [items.id],
    }),
    fromWarehouse: one(warehouses, {
        fields: [inventoryLocationTransfers.fromWarehouseId],
        references: [warehouses.id],
        relationName: 'fromWarehouse',
    }),
    fromLocation: one(warehouseLocations, {
        fields: [inventoryLocationTransfers.fromLocationId],
        references: [warehouseLocations.id],
        relationName: 'fromLocation',
    }),
    toWarehouse: one(warehouses, {
        fields: [inventoryLocationTransfers.toWarehouseId],
        references: [warehouses.id],
        relationName: 'toWarehouse',
    }),
    toLocation: one(warehouseLocations, {
        fields: [inventoryLocationTransfers.toLocationId],
        references: [warehouseLocations.id],
        relationName: 'toLocation',
    }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
    items: many(items),
}));

export const uomsRelations = relations(uoms, ({ many }) => ({
    conversionsFrom: many(uomConversions, { relationName: 'fromUom' }),
    conversionsTo: many(uomConversions, { relationName: 'toUom' }),
}));

export const uomConversionsRelations = relations(uomConversions, ({ one }) => ({
    fromUom: one(uoms, {
        fields: [uomConversions.fromUomId],
        references: [uoms.id],
        relationName: 'fromUom'
    }),
    toUom: one(uoms, {
        fields: [uomConversions.toUomId],
        references: [uoms.id],
        relationName: 'toUom'
    }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
    item: one(items, {
        fields: [inventoryTransactions.itemId],
        references: [items.id],
    }),
    warehouse: one(warehouses, {
        fields: [inventoryTransactions.warehouseId],
        references: [warehouses.id],
    }),
}));

// --- Purchasing ---
export const vendorsRelations = relations(vendors, ({ many }) => ({
    purchaseOrders: many(purchaseOrders),
    bills: many(vendorBills),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [purchaseOrders.vendorId],
        references: [vendors.id],
    }),
    lines: many(purchaseOrderLines),
    bills: many(vendorBills),
}));

export const purchaseOrderLinesRelations = relations(purchaseOrderLines, ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
        fields: [purchaseOrderLines.poId],
        references: [purchaseOrders.id],
    }),
    item: one(items, {
        fields: [purchaseOrderLines.itemId],
        references: [items.id],
    }),
}));

export const vendorBillsRelations = relations(vendorBills, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [vendorBills.vendorId],
        references: [vendors.id],
    }),
    purchaseOrder: one(purchaseOrders, {
        fields: [vendorBills.poId],
        references: [purchaseOrders.id],
    }),
    approver: one(users, {
        fields: [vendorBills.approvedBy],
        references: [users.id],
    }),
    lines: many(vendorBillLines),
}));

export const vendorBillLinesRelations = relations(vendorBillLines, ({ one }) => ({
    bill: one(vendorBills, {
        fields: [vendorBillLines.billId],
        references: [vendorBills.id],
    }),
    item: one(items, {
        fields: [vendorBillLines.itemId],
        references: [items.id],
    }),
}));

export const landedCostAllocationsRelations = relations(landedCostAllocations, ({ one }) => ({
    serviceLine: one(vendorBillLines, {
        fields: [landedCostAllocations.serviceBillLineId],
        references: [vendorBillLines.id],
        relationName: 'serviceLineSource'
    }),
    targetBill: one(vendorBills, {
        fields: [landedCostAllocations.targetBillId],
        references: [vendorBills.id],
        relationName: 'costAllocationTarget'
    }),
}));

export const goodsReceivedNotesRelations = relations(goodsReceivedNotes, ({ one, many }) => ({
    bill: one(vendorBills, {
        fields: [goodsReceivedNotes.billId],
        references: [vendorBills.id],
    }),
    warehouse: one(warehouses, {
        fields: [goodsReceivedNotes.warehouseId],
        references: [warehouses.id],
    }),
    items: many(grnItems),
}));

export const grnItemsRelations = relations(grnItems, ({ one }) => ({
    grn: one(goodsReceivedNotes, {
        fields: [grnItems.grnId],
        references: [goodsReceivedNotes.id],
    }),
    item: one(items, {
        fields: [grnItems.itemId],
        references: [items.id],
    }),
}));

// --- Sales ---
export const leadsRelations = relations(leads, ({ one, many }) => ({
    owner: one(users, {
        fields: [leads.owner_id],
        references: [users.id],
    }),
    convertedCustomer: one(customers, {
        fields: [leads.converted_customer_id],
        references: [customers.id],
    }),
    deals: many(deals),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
    customer: one(customers, {
        fields: [deals.customer_id],
        references: [customers.id],
    }),
    owner: one(users, {
        fields: [deals.owner_id],
        references: [users.id],
    }),
    lead: one(leads, {
        fields: [deals.lead_id],
        references: [leads.id],
    }),
    quote: one(invoices, {
        fields: [deals.quote_id],
        references: [invoices.id],
        relationName: 'dealQuote',
    }),
    salesOrder: one(invoices, {
        fields: [deals.sales_order_id],
        references: [invoices.id],
        relationName: 'dealSalesOrder',
    }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
    invoices: many(invoices),
    payments: many(customerPayments),
    deals: many(deals),
    convertedFromLeads: many(leads),
    priceList: one(priceLists, {
        fields: [customers.priceListId],
        references: [priceLists.id],
    }),
}));

export const priceListsRelations = relations(priceLists, ({ many }) => ({
    customers: many(customers),
    rules: many(priceListRules),
}));

export const priceListRulesRelations = relations(priceListRules, ({ one }) => ({
    priceList: one(priceLists, {
        fields: [priceListRules.priceListId],
        references: [priceLists.id],
    }),
    item: one(items, {
        fields: [priceListRules.itemId],
        references: [items.id],
    }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
    customer: one(customers, {
        fields: [invoices.customerId],
        references: [customers.id],
    }),
    lines: many(invoiceLines),
    allocations: many(paymentAllocations),
    deal: one(deals, {
        fields: [invoices.deal_id],
        references: [deals.id],
    }),
    convertedFromQuote: one(invoices, {
        fields: [invoices.convertedFromQuoteId],
        references: [invoices.id],
        relationName: 'quoteConversion',
    }),
    convertedToDocuments: many(invoices, {
        relationName: 'quoteConversion',
    }),
    salesRep: one(users, {
        fields: [invoices.salesRepId],
        references: [users.id],
    }),
    commissions: many(commissions),
}));

export const commissionRulesRelations = relations(commissionRules, ({ one }) => ({
    salesRep: one(users, {
        fields: [commissionRules.salesRepId],
        references: [users.id],
    }),
}));

export const commissionsRelations = relations(commissions, ({ one }) => ({
    invoice: one(invoices, {
        fields: [commissions.invoiceId],
        references: [invoices.id],
    }),
    salesRep: one(users, {
        fields: [commissions.salesRepId],
        references: [users.id],
    }),
    rule: one(commissionRules, {
        fields: [commissions.ruleId],
        references: [commissionRules.id],
    }),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
    invoice: one(invoices, {
        fields: [invoiceLines.invoiceId],
        references: [invoices.id],
    }),
    item: one(items, {
        fields: [invoiceLines.itemId],
        references: [items.id],
    }),
}));

export const customerPaymentsRelations = relations(customerPayments, ({ one, many }) => ({
    customer: one(customers, {
        fields: [customerPayments.customerId],
        references: [customers.id],
    }),
    allocations: many(paymentAllocations),
}));

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
    payment: one(customerPayments, {
        fields: [paymentAllocations.paymentId],
        references: [customerPayments.id],
    }),
    invoice: one(invoices, {
        fields: [paymentAllocations.invoiceId],
        references: [invoices.id],
    }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
    performedByUser: one(users, {
        fields: [activities.performed_by],
        references: [users.id],
    }),
}));

// --- Finance ---
export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
    lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
    journalEntry: one(journalEntries, {
        fields: [journalEntryLines.journalEntryId],
        references: [journalEntries.id],
    }),
    account: one(glAccounts, {
        fields: [journalEntryLines.accountCode],
        references: [glAccounts.code],
    }),
}));

// --- HR ---
export const payrollPeriodsRelations = relations(payrollPeriods, ({ one, many }) => ({
    payslips: many(payslips),
    approver: one(users, {
        fields: [payrollPeriods.approvedBy],
        references: [users.id],
        relationName: "approver",
    }),
    creator: one(users, {
        fields: [payrollPeriods.createdBy],
        references: [users.id],
        relationName: "creator",
    }),
    journalEntry: one(journalEntries, {
        fields: [payrollPeriods.journalEntryId],
        references: [journalEntries.id],
    }),
}));

export const payslipsRelations = relations(payslips, ({ one, many }) => ({
    period: one(payrollPeriods, {
        fields: [payslips.periodId],
        references: [payrollPeriods.id],
    }),
    employee: one(users, {
        fields: [payslips.userId],
        references: [users.id],
    }),
    items: many(payslipItems),
    journalEntry: one(journalEntries, {
        fields: [payslips.journalEntryId],
        references: [journalEntries.id],
    }),
}));

export const payslipItemsRelations = relations(payslipItems, ({ one }) => ({
    payslip: one(payslips, {
        fields: [payslipItems.payslipId],
        references: [payslips.id],
    }),
}));

export const employeeCompensationRelations = relations(employeeCompensation, ({ one }) => ({
    employee: one(users, {
        fields: [employeeCompensation.userId],
        references: [users.id],
        relationName: "employee",
    }),
    creator: one(users, {
        fields: [employeeCompensation.createdBy],
        references: [users.id],
        relationName: "compensationCreator",
    }),
}));

// --- Payments ---
export const vendorPaymentsRelations = relations(vendorPayments, ({ one, many }) => ({
    vendor: one(vendors, {
        fields: [vendorPayments.vendorId],
        references: [vendors.id],
    }),
    allocations: many(vendorPaymentAllocations),
}));

export const vendorPaymentAllocationsRelations = relations(vendorPaymentAllocations, ({ one }) => ({
    payment: one(vendorPayments, {
        fields: [vendorPaymentAllocations.paymentId],
        references: [vendorPayments.id],
    }),
    bill: one(vendorBills, {
        fields: [vendorPaymentAllocations.billId],
        references: [vendorBills.id],
    }),
}));

// --- Expenses ---
export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
    expenseAccount: one(glAccounts, {
        fields: [expenseCategories.expenseAccountCode],
        references: [glAccounts.code],
    }),
    expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
    category: one(expenseCategories, {
        fields: [expenses.categoryId],
        references: [expenseCategories.id],
    }),
    paidFromAccount: one(glAccounts, {
        fields: [expenses.paidFromAccountCode],
        references: [glAccounts.code],
    }),
    reimbursableToEmployee: one(users, {
        fields: [expenses.reimbursableToEmployeeId],
        references: [users.id],
        relationName: 'reimbursableExpenses',
    }),
    approver: one(users, {
        fields: [expenses.approvedBy],
        references: [users.id],
        relationName: 'approvedExpenses',
    }),
    creator: one(users, {
        fields: [expenses.createdBy],
        references: [users.id],
        relationName: 'createdExpenses',
    }),
}));

// --- Fixed Assets ---
export const fixedAssetsRelations = relations(fixedAssets, ({ many, one }) => ({
    depreciationEntries: many(depreciationEntries),
    assetAccount: one(glAccounts, {
        fields: [fixedAssets.assetAccountCode],
        references: [glAccounts.code],
        relationName: 'assetAccount',
    }),
    depreciationExpenseAccount: one(glAccounts, {
        fields: [fixedAssets.depreciationExpenseAccountCode],
        references: [glAccounts.code],
        relationName: 'depreciationExpenseAccount',
    }),
    accumulatedDepreciationAccount: one(glAccounts, {
        fields: [fixedAssets.accumulatedDepreciationAccountCode],
        references: [glAccounts.code],
        relationName: 'accumulatedDepreciationAccount',
    }),
    vendorBillLine: one(vendorBillLines, {
        fields: [fixedAssets.vendorBillLineId],
        references: [vendorBillLines.id],
    }),
}));

export const depreciationEntriesRelations = relations(depreciationEntries, ({ one }) => ({
    asset: one(fixedAssets, {
        fields: [depreciationEntries.assetId],
        references: [fixedAssets.id],
    }),
    journalEntry: one(journalEntries, {
        fields: [depreciationEntries.journalEntryId],
        references: [journalEntries.id],
    }),
}));

// --- Notifications ---
export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
}));

// --- Service ---
export const customerAssetsRelations = relations(customerAssets, ({ one, many }) => ({
    customer: one(customers, {
        fields: [customerAssets.customerId],
        references: [customers.id],
    }),
    item: one(items, {
        fields: [customerAssets.itemId],
        references: [items.id],
    }),
    invoiceLine: one(invoiceLines, {
        fields: [customerAssets.invoiceLineId],
        references: [invoiceLines.id],
    }),
    serviceContract: one(serviceContracts, {
        fields: [customerAssets.serviceContractId],
        references: [serviceContracts.id],
    }),
    serviceTicketAssets: many(serviceTicketAssets),
}));

export const serviceContractsRelations = relations(serviceContracts, ({ one, many }) => ({
    customer: one(customers, {
        fields: [serviceContracts.customerId],
        references: [customers.id],
    }),
    assignedTechnician: one(users, {
        fields: [serviceContracts.assignedTechnicianId],
        references: [users.id],
    }),
    sourceInvoice: one(invoices, {
        fields: [serviceContracts.sourceInvoiceId],
        references: [invoices.id],
    }),
    refillItems: many(contractRefillItems),
    customerAssets: many(customerAssets),
    serviceTickets: many(serviceTickets),
}));

export const contractRefillItemsRelations = relations(contractRefillItems, ({ one }) => ({
    contract: one(serviceContracts, {
        fields: [contractRefillItems.contractId],
        references: [serviceContracts.id],
    }),
    item: one(items, {
        fields: [contractRefillItems.itemId],
        references: [items.id],
    }),
}));

export const serviceTicketsRelations = relations(serviceTickets, ({ one, many }) => ({
    customer: one(customers, {
        fields: [serviceTickets.customerId],
        references: [customers.id],
    }),
    contract: one(serviceContracts, {
        fields: [serviceTickets.serviceContractId],
        references: [serviceContracts.id],
    }),
    assignedTechnician: one(users, {
        fields: [serviceTickets.assignedTechnicianId],
        references: [users.id],
    }),
    serviceInvoice: one(invoices, {
        fields: [serviceTickets.serviceInvoiceId],
        references: [invoices.id],
        relationName: 'serviceTicketInvoice',
    }),
    sourceInvoice: one(invoices, {
        fields: [serviceTickets.sourceInvoiceId],
        references: [invoices.id],
        relationName: 'serviceTicketSource',
    }),
    ticketAssets: many(serviceTicketAssets),
}));

export const serviceTicketAssetsRelations = relations(serviceTicketAssets, ({ one }) => ({
    ticket: one(serviceTickets, {
        fields: [serviceTicketAssets.ticketId],
        references: [serviceTickets.id],
    }),
    asset: one(customerAssets, {
        fields: [serviceTicketAssets.assetId],
        references: [customerAssets.id],
    }),
}));

// --- Manufacturing ---
export const workCentersRelations = relations(workCenters, ({ many }) => ({
    routingSteps: many(routingSteps),
    equipmentUnits: many(equipmentUnits),
}));

export const equipmentUnitsRelations = relations(equipmentUnits, ({ one, many }) => ({
    workCenter: one(workCenters, {
        fields: [equipmentUnits.workCenterId],
        references: [workCenters.id],
    }),
    workOrderSteps: many(workOrderSteps),
}));

export const routingsRelations = relations(routings, ({ one, many }) => ({
    item: one(items, {
        fields: [routings.itemId],
        references: [items.id],
    }),
    steps: many(routingSteps),
}));

export const routingStepsRelations = relations(routingSteps, ({ many, one }) => ({
    routing: one(routings, {
        fields: [routingSteps.routingId],
        references: [routings.id],
    }),
    workCenter: one(workCenters, {
        fields: [routingSteps.workCenterId],
        references: [workCenters.id],
    }),
    bomItems: many(bomItems),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
    item: one(items, {
        fields: [workOrders.itemId],
        references: [items.id],
    }),
    routing: one(routings, {
        fields: [workOrders.routingId],
        references: [routings.id],
    }),
    steps: many(workOrderSteps),
}));

export const workOrderStepsRelations = relations(workOrderSteps, ({ one, many }) => ({
    workOrder: one(workOrders, {
        fields: [workOrderSteps.workOrderId],
        references: [workOrders.id],
    }),
    routingStep: one(routingSteps, {
        fields: [workOrderSteps.routingStepId],
        references: [routingSteps.id],
    }),
    equipmentUnit: one(equipmentUnits, {
        fields: [workOrderSteps.equipmentUnitId],
        references: [equipmentUnits.id],
    }),
    costs: many(workOrderStepCosts),
    status: one(workOrderStepStatus, {
        fields: [workOrderSteps.id],
        references: [workOrderStepStatus.workOrderStepId],
    }),
    processReadings: many(processReadings),
}));

export const workOrderStepStatusRelations = relations(workOrderStepStatus, ({ one }) => ({
    workOrderStep: one(workOrderSteps, {
        fields: [workOrderStepStatus.workOrderStepId],
        references: [workOrderSteps.id],
    }),
}));

export const workOrderStepCostsRelations = relations(workOrderStepCosts, ({ one }) => ({
    workOrderStep: one(workOrderSteps, {
        fields: [workOrderStepCosts.workOrderStepId],
        references: [workOrderSteps.id],
    }),
}));

export const processReadingsRelations = relations(processReadings, ({ one }) => ({
    workOrderStep: one(workOrderSteps, {
        fields: [processReadings.workOrderStepId],
        references: [workOrderSteps.id],
    }),
}));

export const maintenanceEventsRelations = relations(maintenanceEvents, ({ one }) => ({
    schedule: one(maintenanceSchedules, {
        fields: [maintenanceEvents.maintenanceScheduleId],
        references: [maintenanceSchedules.id],
    }),
    workCenter: one(workCenters, {
        fields: [maintenanceEvents.workCenterId],
        references: [workCenters.id],
    }),
    fixedAsset: one(fixedAssets, {
        fields: [maintenanceEvents.fixedAssetId],
        references: [fixedAssets.id],
    }),
    technician: one(users, {
        fields: [maintenanceEvents.technicianId],
        references: [users.id],
    }),
}));

// --- Quality ---
export const qualityTestsRelations = relations(qualityTests, ({ many }) => ({
    inspectionResults: many(inspectionResults),
}));

export const inspectionOrdersRelations = relations(inspectionOrders, ({ one, many }) => ({
    item: one(items, {
        fields: [inspectionOrders.itemId],
        references: [items.id],
    }),
    inspector: one(users, {
        fields: [inspectionOrders.inspectorId],
        references: [users.id],
    }),
    results: many(inspectionResults),
}));

export const inspectionResultsRelations = relations(inspectionResults, ({ one }) => ({
    inspection: one(inspectionOrders, {
        fields: [inspectionResults.inspectionId],
        references: [inspectionOrders.id],
    }),
    test: one(qualityTests, {
        fields: [inspectionResults.testId],
        references: [qualityTests.id],
    }),
}));

// --- Production ---
export const recipesRelations = relations(recipes, ({ one, many }) => ({
    outputItem: one(items, {
        fields: [recipes.outputItemId],
        references: [items.id],
    }),
    ingredients: many(recipeItems),
    productionRuns: many(productionRuns),
}));

export const recipeItemsRelations = relations(recipeItems, ({ one }) => ({
    recipe: one(recipes, {
        fields: [recipeItems.recipeId],
        references: [recipes.id],
    }),
    item: one(items, {
        fields: [recipeItems.itemId],
        references: [items.id],
    }),
}));

export const productionRunsRelations = relations(productionRuns, ({ one, many }) => ({
    recipe: one(recipes, {
        fields: [productionRuns.recipeId],
        references: [recipes.id],
    }),
    destinationLocation: one(warehouseLocations, {
        fields: [productionRuns.destinationLocationId],
        references: [warehouseLocations.id],
    }),
    inputs: many(productionInputs),
    outputs: many(productionOutputs),
    costs: many(productionCosts),
    laborLogs: many(productionLaborLogs),
    steps: many(productionRunSteps),
    childDependencies: many(productionRunDependencies, { relationName: 'parentRun' }),
    parentDependencies: many(productionRunDependencies, { relationName: 'childRun' }),
}));

export const productionRunStepsRelations = relations(productionRunSteps, ({ one, many }) => ({
    run: one(productionRuns, {
        fields: [productionRunSteps.runId],
        references: [productionRuns.id],
    }),
    outputWipItem: one(items, {
        fields: [productionRunSteps.outputWipItemId],
        references: [items.id],
    }),
    inputs: many(productionInputs),
}));

export const productionInputsRelations = relations(productionInputs, ({ one }) => ({
    run: one(productionRuns, {
        fields: [productionInputs.runId],
        references: [productionRuns.id],
    }),
    step: one(productionRunSteps, {
        fields: [productionInputs.stepId],
        references: [productionRunSteps.id],
    }),
    item: one(items, {
        fields: [productionInputs.itemId],
        references: [items.id],
    }),
}));

export const productionOutputsRelations = relations(productionOutputs, ({ one }) => ({
    run: one(productionRuns, {
        fields: [productionOutputs.runId],
        references: [productionRuns.id],
    }),
    item: one(items, {
        fields: [productionOutputs.itemId],
        references: [items.id],
    }),
}));

export const productionCostsRelations = relations(productionCosts, ({ one }) => ({
    run: one(productionRuns, {
        fields: [productionCosts.runId],
        references: [productionRuns.id],
    }),
}));

export const productionRunDependenciesRelations = relations(productionRunDependencies, ({ one }) => ({
    parentRun: one(productionRuns, {
        fields: [productionRunDependencies.parentRunId],
        references: [productionRuns.id],
        relationName: 'parentRun',
    }),
    childRun: one(productionRuns, {
        fields: [productionRunDependencies.childRunId],
        references: [productionRuns.id],
        relationName: 'childRun',
    }),
    item: one(items, {
        fields: [productionRunDependencies.itemId],
        references: [items.id],
    }),
}));

export const productionLaborLogsRelations = relations(productionLaborLogs, ({ one }) => ({
    run: one(productionRuns, {
        fields: [productionLaborLogs.runId],
        references: [productionRuns.id],
    }),
    user: one(users, {
        fields: [productionLaborLogs.userId],
        references: [users.id],
    }),
}));

export const productionRunChainsRelations = relations(productionRunChains, ({ one, many }) => ({
    targetItem: one(items, {
        fields: [productionRunChains.targetItemId],
        references: [items.id],
    }),
    creator: one(users, {
        fields: [productionRunChains.createdBy],
        references: [users.id],
    }),
    members: many(productionRunChainMembers),
}));

export const productionRunChainMembersRelations = relations(productionRunChainMembers, ({ one }) => ({
    chain: one(productionRunChains, {
        fields: [productionRunChainMembers.chainId],
        references: [productionRunChains.id],
    }),
    run: one(productionRuns, {
        fields: [productionRunChainMembers.runId],
        references: [productionRuns.id],
    }),
}));

// --- BOM ---
export const bomHeadersRelations = relations(bomHeaders, ({ one, many }) => ({
    item: one(items, {
        fields: [bomHeaders.itemId],
        references: [items.id],
    }),
    items: many(bomItems),
}));

export const bomItemsRelations = relations(bomItems, ({ one }) => ({
    bom: one(bomHeaders, {
        fields: [bomItems.bomId],
        references: [bomHeaders.id],
    }),
    part: one(items, {
        fields: [bomItems.componentItemId],
        references: [items.id],
        relationName: 'bomComponent'
    }),
    step: one(routingSteps, {
        fields: [bomItems.routingStepId],
        references: [routingSteps.id],
    }),
}));
