'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VendorCenterLayout from './VendorCenterLayout';
import VendorListSidebar from './VendorListSidebar';
import VendorDetailView from './VendorDetailView';
import VendorHistoryView from './VendorHistoryView';
import VendorForm from './VendorForm';
import BillEditor from './BillEditor';
import PurchasingDocumentForm from './PurchasingDocumentForm';
import DeletePOModal from './DeletePOModal';
import { saveItemReceipt, getBillById, deleteVendorBill, getPurchaseOrder, deletePurchaseOrder, savePurchaseOrder } from '@/app/actions/purchasing';

type RightPaneMode = 'VIEW_DETAILS' | 'CREATE_BILL' | 'CREATE_PO' | 'EDIT_BILL' | 'EDIT_PO' | 'EDIT_VENDOR';

interface VendorCenterClientProps {
    vendors: any[];
    selectedVendor: any;
    items: any[];
    selectedVendorId?: number;
    initialBillId?: number;
    initialMode?: RightPaneMode;
    initialTab?: string;
    initialFilter?: string;
    initialStatus?: string;
    action?: string;
}

export default function VendorCenterClient({
    vendors,
    selectedVendor,
    items,
    selectedVendorId,
    initialBillId,
    initialMode = 'VIEW_DETAILS',
    initialTab,
    initialFilter,
    initialStatus,
    action
}: VendorCenterClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<RightPaneMode>(initialMode);
    const [editingBill, setEditingBill] = useState<any>(null);
    const [billFormData, setBillFormData] = useState<any>(null);
    const [editingPO, setEditingPO] = useState<any>(null);
    const [poFormData, setPoFormData] = useState<any>(null);
    const [deletingPO, setDeletingPO] = useState<any>(null);
    const [editingVendor, setEditingVendor] = useState<any>(null);

    const handleCreateBill = () => {
        setMode('CREATE_BILL');
    };

    const handleCreatePO = () => {
        setMode('CREATE_PO');
    };

    const handleEditBill = async (bill: any) => {
        // Only allow editing OPEN bills
        // Allow viewing all bills. Backend handles edit restrictions.

        try {
            // Extract numeric bill ID from transaction ID (format: "bill-{id}")
            const billId = typeof bill.id === 'string' && bill.id.startsWith('bill-')
                ? parseInt(bill.id.replace('bill-', ''), 10)
                : bill.id;

            // Fetch full bill data with line items
            const result = await getBillById(billId);

            if (!result.success) {
                alert(result.error || 'Failed to load bill');
                return;
            }

            setEditingBill(result.bill);
            setBillFormData(result.data);
            setMode('EDIT_BILL');

            // Add billId to URL for deep linking
            const params = new URLSearchParams(searchParams.toString());
            params.set('billId', billId.toString());
            router.push(`/purchasing/vendors?${params.toString()}`);
        } catch (error) {
            console.error('Error loading bill:', error);
            alert('Failed to load bill for editing');
        }
    };

    const handleDeleteBill = async (bill: any) => {
        try {
            // Extract numeric bill ID from transaction ID (format: "bill-{id}")
            const billId = typeof bill.id === 'string' && bill.id.startsWith('bill-')
                ? parseInt(bill.id.replace('bill-', ''), 10)
                : bill.id;

            // Call delete action
            const result = await deleteVendorBill(billId);

            if (result.success) {
                // Show success message
                alert((result as any).message || 'Bill deleted successfully');

                // Refresh the page to get updated data
                router.refresh();
            } else {
                // Show error message
                alert((result as any).error || 'Failed to delete bill');
            }
        } catch (error) {
            console.error('Error deleting bill:', error);
            alert('An unexpected error occurred while deleting the bill');
        }
    };

    const handleEditPO = async (po: any) => {
        // Allow viewing all POs.

        try {
            // Extract numeric PO ID from transaction ID (format: "po-{id}")
            const poId = typeof po.id === 'string' && po.id.startsWith('po-')
                ? parseInt(po.id.replace('po-', ''), 10)
                : po.id;

            // Fetch full PO data with line items
            const result = await getPurchaseOrder(poId);

            if (!result) {
                alert('Failed to load purchase order');
                return;
            }

            setEditingPO(result);

            // Transform DB result to form data with safety checks
            const formData = {
                vendorId: result.vendorId,
                transactionDate: result.date ? new Date(result.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                refNumber: result.orderNumber || '',
                memo: result.notes || '',
                items: Array.isArray(result.lines) ? result.lines.map((line: any) => ({
                    itemId: line.itemId,
                    description: line.description || line.item?.name || '',
                    quantity: line.qtyOrdered || 0,
                    unitPrice: line.unitCost || 0,
                    amount: (line.qtyOrdered || 0) * (line.unitCost || 0)
                })) : []
            };

            console.log('Editing PO Data:', formData);

            setPoFormData(formData);
            setMode('EDIT_PO');
        } catch (error) {
            console.error('Error loading PO:', error);
            alert('Failed to load purchase order for editing');
        }
    };

    const handleDeletePO = async (po: any) => {
        try {
            // Extract numeric PO ID from transaction ID (format: "po-{id}")
            const poId = typeof po.id === 'string' && po.id.startsWith('po-')
                ? parseInt(po.id.replace('po-', ''), 10)
                : po.id;

            // Call delete action
            const result = await deletePurchaseOrder(poId);

            if (result.success) {
                // Show success message
                alert(result.message || 'Purchase order deleted successfully');

                // Refresh the page to get updated data
                router.refresh();
            } else {
                // Show error message
                alert(result.error || 'Failed to delete purchase order');
            }
        } catch (error) {
            console.error('Error deleting PO:', error);
            alert('An unexpected error occurred while deleting the purchase order');
        }
    };

    // Old definitions removed to prevent duplication


    const handleCancelVendorEdit = () => {
        setMode('VIEW_DETAILS');
        setEditingVendor(null);

        // Remove mode param from URL
        const params = new URLSearchParams(searchParams.toString());
        params.delete('mode');
        router.replace(`/purchasing/vendors?${params.toString()}`);
    };

    const handleVendorSaved = () => {
        setMode('VIEW_DETAILS');
        setEditingVendor(null);

        // Remove mode param from URL
        const params = new URLSearchParams(searchParams.toString());
        params.delete('mode');
        router.replace(`/purchasing/vendors?${params.toString()}`);

        // Refresh to show updated vendor data
        router.refresh();
    };

    const handleSavePO = async (data: any) => {
        try {
            // Determine if we are creating or updating
            // const isEdit = mode === 'EDIT_PO' && editingPO; // Not yet implemented fully for handling edits differently if needed

            // Use savePurchaseOrder for POs
            const res = await savePurchaseOrder({
                ...data,
                date: new Date(data.transactionDate), // Convert string date to Date object
                refNumber: data.refNumber // Ensure refNumber is passed
            });

            if (res.success) {
                // Reuse the same success handler to close pane and refresh
                handleSaveSuccess();
            } else {
                alert(res.error || 'Failed to save purchase order');
            }
        } catch (error) {
            console.error('Error saving PO:', error);
            alert('An unexpected error occurred while saving the purchase order');
        }
    };

    // Load vendor data when entering edit mode
    useEffect(() => {
        if (mode === 'EDIT_VENDOR' && selectedVendor) {
            setEditingVendor(selectedVendor);
        }
    }, [mode, selectedVendor]);

    // Handle action parameter
    useEffect(() => {
        if (action === 'receive_items') {
            // Open PO creation form for receiving items
            setMode('CREATE_PO');
        } else if (action === 'receive') {
            // Open bill creation form for entering new bills
            setMode('CREATE_BILL');
        }
    }, [action]);

    // Track manual close to prevent race condition with generic props
    const [justClosed, setJustClosed] = useState(false);

    // Auto-open bill if initialBillId is provided
    useEffect(() => {
        // If we just closed it manually, ignore the prop until it clears (or just block it)
        if (justClosed) return;

        // CRITICAL FIX: Don't re-open if URL has closed flag (survives remounts)
        const closedParam = searchParams.get('closed');
        if (closedParam === 'true') {
            // User just closed - clear the flag and return
            const params = new URLSearchParams(searchParams.toString());
            params.delete('closed');
            router.replace(`/purchasing/vendors?${params.toString()}`);
            return;
        }

        if (initialBillId && !editingBill && mode !== 'EDIT_BILL') {
            // Try to find the bill in the vendor's transactions
            const billTx = selectedVendor?.transactions?.find(
                (tx: any) => tx.id === `bill-${initialBillId}`
            );

            if (billTx) {
                // Bill found in transactions, open it
                handleEditBill(billTx);
            } else {
                // Bill not found in current vendor's transactions, fetch it directly
                (async () => {
                    try {
                        const result = await getBillById(initialBillId);
                        if (result.success && result.bill) {
                            // Construct a transaction-like object
                            const billTx = {
                                id: `bill-${initialBillId}`,
                                type: 'Bill',
                                status: result.bill.status,
                            };
                            await handleEditBill(billTx);
                        }
                    } catch (error) {
                        console.error('Error loading bill:', error);
                    }
                })();
            }
        }
    }, [initialBillId, selectedVendor, editingBill, mode, searchParams, justClosed]);

    const handleCancelEdit = () => {
        // Block re-opening
        setJustClosed(true);

        // Close form immediately via state
        setMode('VIEW_DETAILS');
        setEditingBill(null);
        setBillFormData(null);

        // Update URL to remove billId parameter
        const params = new URLSearchParams(searchParams.toString());
        params.delete('billId');
        // We don't necessarily need 'closed' param if we have local state, but keep it for safety
        params.set('closed', 'true');
        router.replace(`/purchasing/vendors?${params.toString()}`);

        // Reset the block after a delay (enough for router to update)
        setTimeout(() => setJustClosed(false), 2000);
    };

    const handleSaveSuccess = () => {
        // Block re-opening
        setJustClosed(true);

        // Close form immediately via state
        setMode('VIEW_DETAILS');
        setEditingBill(null);
        setBillFormData(null);

        // Update URL to remove billId parameter
        const params = new URLSearchParams(searchParams.toString());
        params.delete('billId');
        params.set('closed', 'true');
        router.replace(`/purchasing/vendors?${params.toString()}`);

        // Refresh the page to get updated data
        router.refresh();

        // Reset the block
        setTimeout(() => setJustClosed(false), 2000);
    };

    // Render rightPane content based on mode
    const rightPaneContent = mode !== 'VIEW_DETAILS' ? (
        mode === 'CREATE_BILL' ? (
            <BillEditor
                mode="create"
                vendorId={selectedVendorId!}
                vendors={vendors}
                items={items}
                onClose={handleCancelEdit}
                onSuccess={handleSaveSuccess}
            />
        ) : mode === 'EDIT_BILL' && editingBill && billFormData ? (
            <BillEditor
                mode="edit"
                billId={editingBill.id.toString()}
                vendorId={editingBill.vendorId}
                vendors={vendors}
                items={items}
                initialData={billFormData}
                onClose={handleCancelEdit}
                onSuccess={handleSaveSuccess}
            />
        ) : mode === 'CREATE_PO' ? (
            <PurchasingDocumentForm
                type="PO"
                vendors={vendors}
                items={items}
                initialData={{ vendorId: selectedVendorId }}
                onClose={handleCancelEdit}
                onSave={handleSavePO}
            />
        ) : mode === 'EDIT_VENDOR' && editingVendor ? (
            <VendorForm
                isEdit={true}
                vendorId={selectedVendorId}
                initialData={editingVendor}
                onCancel={handleCancelVendorEdit}
                onSuccess={handleVendorSaved}
            />
        ) : null
    ) : undefined;

    return (
        <VendorCenterLayout
            sidebar={<VendorListSidebar vendors={vendors} />}
            rightPane={rightPaneContent}
            details={mode === 'VIEW_DETAILS' ? (
                <VendorDetailView
                    vendor={selectedVendor}
                    onCreateBill={handleCreateBill}
                    onCreatePO={handleCreatePO}
                />
            ) : undefined}
            history={mode === 'VIEW_DETAILS' ? (
                <>
                    <VendorHistoryView
                        transactions={selectedVendor?.transactions || []}
                        filter={initialFilter}
                        status={initialStatus}
                        onEditBill={handleEditBill}
                        onDeleteBill={handleDeleteBill}
                        onEditPO={handleEditPO}
                        onDeletePO={handleDeletePO}
                    />
                    {/* Delete PO Modal */}
                    <DeletePOModal
                        isOpen={deletingPO !== null}
                        onClose={() => setDeletingPO(null)}
                        onConfirm={async () => {
                            if (deletingPO && handleDeletePO) {
                                await handleDeletePO(deletingPO);
                                setDeletingPO(null);
                            }
                        }}
                        po={deletingPO ? {
                            id: deletingPO.id,
                            orderNumber: deletingPO.ref,
                            totalAmount: deletingPO.amount,
                            status: deletingPO.status
                        } : null}
                    />
                </>
            ) : undefined}
        />
    );
}
