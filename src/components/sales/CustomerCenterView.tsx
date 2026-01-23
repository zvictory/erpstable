'use client';

import React from 'react';
import CustomerCenterLayout from './CustomerCenterLayout';
import CustomerList from './CustomerList';
import CustomerDetailView from './CustomerDetailView';
import CustomerHistoryView from './CustomerHistoryView';
import CustomerCenterController from './CustomerCenterController';

interface CustomerCenterViewProps {
    customers: any[];
    selectedCustomer: any;
    selectedId?: number;
    items: any[];
}

export default function CustomerCenterView({ customers, selectedCustomer, selectedId, items }: CustomerCenterViewProps) {
    return (
        <CustomerCenterController selectedCustomerId={selectedId} selectedCustomer={selectedCustomer} items={items}>
            <CustomerCenterLayout
                sidebar={<CustomerList customers={customers} />}
                detailsView={
                    <ActionWrapper selectedId={selectedId}>
                        {(onAction) => (
                            <CustomerDetailView
                                customer={selectedCustomer}
                                onAction={onAction}
                            />
                        )}
                    </ActionWrapper>
                }
                historyView={
                    selectedCustomer ? (
                        <CustomerHistoryView
                            customerId={selectedId || 0}
                            transactions={selectedCustomer.transactions || []}
                        />
                    ) : (
                        <div className="p-6 text-center text-slate-400">
                            <p className="text-sm font-medium">Select a customer to view transaction history.</p>
                        </div>
                    )
                }
            />
        </CustomerCenterController>
    );
}

// Internal helper to bridge the controller's action logic to the detail view
// This stays entirely on the client side, so no function-passing issues.
function ActionWrapper({ children, selectedId }: { children: (onAction: any) => React.ReactNode, selectedId?: number }) {
    const onAction = (action: string) => {
        const params = new URLSearchParams(window.location.search);
        if (action === 'NEW_INVOICE') {
            params.set('modal', 'new_invoice');
        } else if (action === 'RECEIVE_PAYMENT') {
            params.set('modal', 'receive_payment');
        }
        window.history.pushState(null, '', `?${params.toString()}`);
        // Force a refresh or rely on the SearchParams listener in the controller
        window.dispatchEvent(new Event('popstate'));
    };

    return <>{children(onAction)}</>;
}
