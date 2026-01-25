'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { updateUserRole } from '@/app/actions/settings';
import { Badge } from '@/components/ui/Badge';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from '@/components/ui/table';

interface User {
    id: number;
    email: string;
    name: string | null;
    role: string;
    isActive: boolean;
    lastLoginAt: Date | null;
}

interface TeamManagementTableProps {
    initialUsers: User[];
}

const ROLE_OPTIONS = [
    { value: 'FACTORY_WORKER', label: 'Factory Worker' },
    { value: 'PLANT_MANAGER', label: 'Plant Manager' },
    { value: 'ACCOUNTANT', label: 'Accountant' },
    { value: 'ADMIN', label: 'Admin' },
];

const AVATAR_COLORS = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500',
];

// Simple hash function to generate consistent color from name
function getAvatarColor(name: string): string {
    if (!name) return AVATAR_COLORS[0];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
}

// Get first letter of name for avatar
function getInitial(name: string | null): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
}

// Format relative time
function formatRelativeTime(date: Date | null): string {
    if (!date) return 'Never';

    try {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (error) {
        return 'Invalid date';
    }
}

export default function TeamManagementTable({ initialUsers }: TeamManagementTableProps) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loadingUserId, setLoadingUserId] = useState<number | null>(null);

    const handleRoleChange = async (userId: number, newRole: string) => {
        setError(null);
        setLoadingUserId(userId);

        try {
            const result = await updateUserRole(userId, newRole);

            if (!result.success) {
                setError(result.error || 'Failed to update user role');
                return;
            }

            // Refresh the page to show updated data
            router.refresh();
        } catch (err) {
            setError('An unexpected error occurred');
            console.error('Error updating user role:', err);
        } finally {
            setLoadingUserId(null);
        }
    };

    return (
        <div>
            {/* Error Banner */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
            )}

            {/* Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Login</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialUsers.map((user) => {
                            const isLoading = loadingUserId === user.id;
                            const avatarColor = getAvatarColor(user.name || user.email);
                            const initial = getInitial(user.name);

                            return (
                                <TableRow key={user.id}>
                                    {/* Avatar & Name */}
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-sm`}
                                            >
                                                {initial}
                                            </div>
                                            <span className="font-medium text-slate-900">
                                                {user.name || 'Unnamed User'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Email */}
                                    <TableCell>
                                        <span className="text-slate-600">{user.email}</span>
                                    </TableCell>

                                    {/* Role Dropdown */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                disabled={isLoading}
                                                className="flex h-9 w-full max-w-[180px] rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {ROLE_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {isLoading && (
                                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Status Badge */}
                                    <TableCell>
                                        <Badge
                                            variant={user.isActive ? 'success' : 'outline'}
                                            className={
                                                user.isActive
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200'
                                            }
                                        >
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>

                                    {/* Last Login */}
                                    <TableCell>
                                        <span className="text-sm text-slate-500">
                                            {formatRelativeTime(user.lastLoginAt)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Empty State */}
            {initialUsers.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-500">No users found</p>
                </div>
            )}
        </div>
    );
}
