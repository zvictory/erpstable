
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { UserRole } from '../../auth.config';

type ProtectProps = {
    roles: UserRole[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
};

export default function Protect({ roles, children, fallback = null }: ProtectProps) {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!session?.user) return <>{fallback}</>;

    const userRole = (session.user as any).role as UserRole;

    if (roles.includes(userRole)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
