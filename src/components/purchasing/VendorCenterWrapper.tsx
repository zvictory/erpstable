'use client';

import React from 'react';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import VendorCenterClient from './VendorCenterClient';

type RightPaneMode = 'VIEW_DETAILS' | 'CREATE_BILL' | 'CREATE_PO' | 'EDIT_BILL' | 'EDIT_PO' | 'EDIT_VENDOR';

interface VendorCenterWrapperProps {
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

export default function VendorCenterWrapper(props: VendorCenterWrapperProps) {
    return (
        <ModuleGuard module="PURCHASING">
            <VendorCenterClient {...props} />
        </ModuleGuard>
    );
}
