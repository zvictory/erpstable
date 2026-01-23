'use client';

import React from 'react';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import CustomerCenterView from './CustomerCenterView';

interface CustomerCenterWrapperProps {
    customers: any[];
    selectedCustomer: any;
    items: any[];
    selectedId?: number;
}

export default function CustomerCenterWrapper(props: CustomerCenterWrapperProps) {
    return (
        <ModuleGuard module="SALES">
            <CustomerCenterView {...props} />
        </ModuleGuard>
    );
}
