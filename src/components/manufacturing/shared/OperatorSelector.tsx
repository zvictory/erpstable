'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { getActiveOperators } from '@/app/actions/manufacturing';

/**
 * OperatorSelector - Reusable operator selection component
 *
 * Allows selection of factory workers (FACTORY_WORKER role) for production steps.
 * Fetches active operators from the database and displays them in a dropdown.
 *
 * Features:
 * - Dropdown/combobox of active factory workers
 * - Search/filter by operator name
 * - Display operator role badge
 * - Show current operator if already assigned
 * - Required/optional field support
 */

interface Operator {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface OperatorSelectorProps {
    selectedOperatorId?: number;
    selectedOperatorName?: string;
    onSelect: (operatorId: number, operatorName: string) => void;
    required?: boolean;
    label?: string;
    disabled?: boolean;
}

export default function OperatorSelector({
    selectedOperatorId,
    selectedOperatorName,
    onSelect,
    required = false,
    label = 'Operator',
    disabled = false,
}: OperatorSelectorProps) {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch operators on component mount
    useEffect(() => {
        const fetchOperators = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const result = await getActiveOperators();
                if (result.success) {
                    setOperators(result.operators);
                } else {
                    throw new Error(result.error || 'Failed to fetch operators');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error loading operators');
                // Set empty array as fallback
                setOperators([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOperators();
    }, []);

    // Filter operators based on search term
    const filteredOperators = operators.filter((op) =>
        op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (operatorId: number, operatorName: string) => {
        onSelect(operatorId, operatorName);
        setIsOpen(false);
        setSearchTerm('');
    };

    const selectedOperator = operators.find((op) => op.id === selectedOperatorId);

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>

            <div className="relative">
                {/* Display selected operator or empty state */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={disabled || isLoading}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between ${
                        disabled || isLoading ? 'bg-gray-50 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                    } ${selectedOperatorId ? 'border-blue-300 bg-blue-50' : ''}`}
                >
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {isLoading ? (
                            <span className="text-gray-500">Loading operators...</span>
                        ) : selectedOperator ? (
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{selectedOperator.name}</span>
                                <span className="text-xs text-gray-500">{selectedOperator.email}</span>
                            </div>
                        ) : (
                            <span className="text-gray-500">Select operator...</span>
                        )}
                    </div>
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </button>

                {/* Dropdown menu */}
                {isOpen && !disabled && !isLoading && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg">
                        {/* Search input */}
                        <div className="p-2 border-b border-gray-200">
                            <input
                                type="text"
                                placeholder="Search operator..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Operator list */}
                        <ul className="max-h-64 overflow-y-auto">
                            {error ? (
                                <li className="px-4 py-3 text-red-600 text-sm">{error}</li>
                            ) : filteredOperators.length === 0 ? (
                                <li className="px-4 py-3 text-gray-500 text-sm">No operators found</li>
                            ) : (
                                filteredOperators.map((operator) => (
                                    <li key={operator.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(operator.id, operator.name)}
                                            className={`w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 flex items-center justify-between ${
                                                selectedOperatorId === operator.id ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
                                            }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{operator.name}</span>
                                                <span className="text-xs text-gray-500">{operator.email}</span>
                                            </div>
                                            {selectedOperatorId === operator.id && (
                                                <svg
                                                    className="w-5 h-5 text-blue-600"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                )}
            </div>

            {/* Error state (only show when required and not selected) */}
            {required && !selectedOperatorId && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <span>⚠</span> Operator selection is required
                </p>
            )}
        </div>
    );
}
