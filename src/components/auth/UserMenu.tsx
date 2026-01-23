'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { User, ChevronDown, LogOut, Key, Package, Tags } from 'lucide-react';
import { useRouter } from '@/navigation';
import { UserRole } from '@/auth.config';

interface UserMenuProps {
    onChangePassword: () => void;
}

export default function UserMenu({ onChangePassword }: UserMenuProps) {
    const { data: session } = useSession();
    const t = useTranslations('auth.user_menu');
    const ts = useTranslations('settings');
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const user = session?.user as { name?: string; email?: string; role?: UserRole } | undefined;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        // signOut with absolute URL for proper redirection behind reverse proxy
        await signOut({ redirect: false });
        // Redirect to login page with proper locale
        router.push('/login');
    };

    if (!user) return null;

    const getRoleBadgeColor = (role: UserRole | undefined) => {
        switch (role) {
            case 'ADMIN':
                return 'bg-purple-100 text-purple-700';
            case 'ACCOUNTANT':
                return 'bg-amber-100 text-amber-700';
            case 'PLANT_MANAGER':
                return 'bg-blue-100 text-blue-700';
            case 'FACTORY_WORKER':
                return 'bg-green-100 text-green-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    const getRoleLabel = (role: UserRole | undefined) => {
        switch (role) {
            case 'ADMIN':
                return 'Admin';
            case 'ACCOUNTANT':
                return 'Accountant';
            case 'PLANT_MANAGER':
                return 'Plant Manager';
            case 'FACTORY_WORKER':
                return 'Factory Worker';
            default:
                return '';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-3 py-2.5 h-11 rounded-lg transition-all duration-200 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm hover:bg-white hover:border-slate-300 text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${isOpen ? 'ring-2 ring-blue-100 border-blue-300 bg-white' : ''}`}
            >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>

                {/* User Info */}
                <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                    <span className="text-xs text-slate-500">{getRoleLabel(user.role)}</span>
                </div>

                <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white shadow-lg border border-slate-100 py-2 z-50">
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                        <div className="mt-2">
                            <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                {getRoleLabel(user.role)}
                            </span>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onChangePassword();
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                        >
                            <Key size={16} className="text-slate-400" />
                            {t('change_password')}
                        </button>
                    </div>

                    {/* Settings Section */}
                    <div className="border-t border-slate-100" />
                    <div className="px-4 py-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {ts('title')}
                        </p>
                    </div>
                    <div className="py-1">
                        <button
                            onClick={() => {
                                router.push('/settings/uom');
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                        >
                            <Package size={16} className="text-slate-400" />
                            {ts('uom')}
                        </button>
                        <button
                            onClick={() => {
                                router.push('/settings/categories');
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                        >
                            <Tags size={16} className="text-slate-400" />
                            {ts('categories')}
                        </button>
                    </div>

                    {/* Logout */}
                    <div className="pt-1 border-t border-slate-100">
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                        >
                            <LogOut size={16} />
                            {t('logout')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
