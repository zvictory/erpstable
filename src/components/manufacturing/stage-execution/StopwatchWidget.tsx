'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, AlertCircle, Zap } from 'lucide-react';

/**
 * Stopwatch state and timing information
 */
export interface TimerState {
    status: 'idle' | 'running' | 'paused' | 'stopped';
    elapsedMs: number;
    startTime: Date | null;
    endTime: Date | null;
    pausedDuration: number;
    pauseHistory: Array<{ pausedAt: Date; resumedAt: Date }>;
}

/**
 * StopwatchWidget - Cycle timer for production stage execution
 *
 * Features:
 * - Automatic start/stop buttons
 * - Real-time electricity cost calculation
 * - Pause/resume with history tracking
 * - Validation: cannot submit until timer is stopped
 * - Displays elapsed time, start time, estimated electricity cost
 */
interface StopwatchWidgetProps {
    workCenterCostPerHour: number; // In Tiyin
    onTimerStateChange?: (state: TimerState) => void;
    readonly?: boolean;
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatUZS(amount: number): string {
    return new Intl.NumberFormat('uz-UZ', {
        style: 'currency',
        currency: 'UZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount / 100); // Convert from Tiyin to сўм
}

export default function StopwatchWidget({
    workCenterCostPerHour,
    onTimerStateChange,
    readonly = false,
}: StopwatchWidgetProps) {
    const [timerState, setTimerState] = useState<TimerState>({
        status: 'idle',
        elapsedMs: 0,
        startTime: null,
        endTime: null,
        pausedDuration: 0,
        pauseHistory: [],
    });

    const [displayTime, setDisplayTime] = useState('00:00:00');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Update display time based on elapsed duration
     * Called every 100ms when timer is running
     */
    useEffect(() => {
        if (timerState.status === 'running' && timerState.startTime) {
            intervalRef.current = setInterval(() => {
                setTimerState(prev => {
                    const now = new Date();
                    const elapsed = now.getTime() - prev.startTime!.getTime() - prev.pausedDuration;
                    setDisplayTime(formatTime(elapsed));
                    return { ...prev, elapsedMs: elapsed };
                });
            }, 100);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timerState.status !== 'idle') {
                setDisplayTime(formatTime(timerState.elapsedMs));
            }
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [timerState.status, timerState.startTime, timerState.pausedDuration]);

    /**
     * Notify parent component when timer state changes
     */
    useEffect(() => {
        onTimerStateChange?.(timerState);
    }, [timerState, onTimerStateChange]);

    const handleStart = () => {
        setTimerState(prev => ({
            ...prev,
            status: 'running',
            startTime: prev.startTime || new Date(),
        }));
    };

    const handlePause = () => {
        if (timerState.status === 'running') {
            const pauseTime = new Date();
            setTimerState(prev => ({
                ...prev,
                status: 'paused',
                pauseHistory: [
                    ...prev.pauseHistory,
                    { pausedAt: pauseTime, resumedAt: new Date() },
                ],
            }));
        } else if (timerState.status === 'paused') {
            // Resume from pause
            const resumeTime = new Date();
            const lastPause = timerState.pauseHistory[timerState.pauseHistory.length - 1];
            if (lastPause) {
                lastPause.resumedAt = resumeTime;
            }

            const pauseDuration = timerState.pauseHistory.reduce((total, pause) => {
                return total + (pause.resumedAt.getTime() - pause.pausedAt.getTime());
            }, 0);

            setTimerState(prev => ({
                ...prev,
                status: 'running',
                pausedDuration: pauseDuration,
            }));
        }
    };

    const handleStop = () => {
        if (timerState.status === 'running' || timerState.status === 'paused') {
            setTimerState(prev => ({
                ...prev,
                status: 'stopped',
                endTime: new Date(),
            }));
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    };

    const handleReset = () => {
        setTimerState({
            status: 'idle',
            elapsedMs: 0,
            startTime: null,
            endTime: null,
            pausedDuration: 0,
            pauseHistory: [],
        });
        setDisplayTime('00:00:00');
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    // Calculate electricity cost
    const durationHours = timerState.elapsedMs / (1000 * 60 * 60);
    const electricityCost = Math.round(workCenterCostPerHour * durationHours);

    const canSubmit = timerState.status === 'stopped' && timerState.elapsedMs > 0;

    return (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                    <Zap size={32} />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">Cycle Timer</h3>
                    <p className="text-sm text-slate-500">Track production time for electricity costing</p>
                </div>
            </div>

            {/* Timer Display */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 mb-8 text-center">
                <div className="text-7xl font-mono font-bold text-white tracking-wider mb-4">
                    {displayTime}
                </div>
                <div className="text-slate-300 text-sm uppercase tracking-wide">
                    {timerState.status === 'running' && '⏱️ Running'}
                    {timerState.status === 'paused' && '⏸️ Paused'}
                    {timerState.status === 'stopped' && '⏹️ Stopped'}
                    {timerState.status === 'idle' && '⏱️ Ready'}
                </div>
            </div>

            {/* Timeline Info */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Start Time */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                        Started
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-2">
                        {timerState.startTime ? (
                            timerState.startTime.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true,
                            })
                        ) : (
                            '—'
                        )}
                    </div>
                </div>

                {/* Electricity Cost */}
                <div className={`rounded-xl p-4 border-2 ${canSubmit ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="text-xs font-medium uppercase tracking-wide">
                        <Zap className="w-4 h-4 inline mr-1" />
                        Est. Electricity
                    </div>
                    <div className={`text-lg font-bold mt-2 ${canSubmit ? 'text-green-700' : 'text-slate-900'}`}>
                        {formatUZS(electricityCost)}
                    </div>
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3 mb-8">
                <button
                    type="button"
                    onClick={handleStart}
                    disabled={timerState.status === 'running' || readonly}
                    className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                >
                    <Play size={20} />
                    Start
                </button>

                <button
                    type="button"
                    onClick={handlePause}
                    disabled={
                        timerState.status !== 'running' && timerState.status !== 'paused' ||
                        readonly
                    }
                    className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                >
                    <Pause size={20} />
                    {timerState.status === 'paused' ? 'Resume' : 'Pause'}
                </button>

                <button
                    type="button"
                    onClick={handleStop}
                    disabled={timerState.status === 'idle' || timerState.status === 'stopped' || readonly}
                    className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                >
                    <Square size={20} />
                    Stop
                </button>

                <button
                    type="button"
                    onClick={handleReset}
                    disabled={timerState.status === 'idle' || readonly}
                    className="py-4 px-6 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Reset timer"
                >
                    ↻
                </button>
            </div>

            {/* Validation Messages */}
            {timerState.status !== 'stopped' && timerState.elapsedMs === 0 && timerState.status !== 'idle' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold text-blue-900">Timer is running</div>
                        <div className="text-sm text-blue-700">
                            Stop the timer before submitting the production stage
                        </div>
                    </div>
                </div>
            )}

            {!canSubmit && timerState.status === 'stopped' && timerState.elapsedMs === 0 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold text-amber-900">No time recorded</div>
                        <div className="text-sm text-amber-700">
                            Start and stop the timer to record cycle time
                        </div>
                    </div>
                </div>
            )}

            {canSubmit && (
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-start gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <div>
                        <div className="font-semibold text-green-900">Timer stopped</div>
                        <div className="text-sm text-green-700">
                            Duration: {displayTime} | Electricity cost: {formatUZS(electricityCost)}
                        </div>
                    </div>
                </div>
            )}

            {/* Pause History */}
            {timerState.pauseHistory.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="text-sm font-semibold text-slate-600 mb-3">
                        Pause History ({timerState.pauseHistory.length})
                    </div>
                    <div className="space-y-2 max-h-24 overflow-y-auto">
                        {timerState.pauseHistory.map((pause, idx) => (
                            <div key={idx} className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                <span className="font-medium">Pause {idx + 1}:</span>{' '}
                                {pause.pausedAt.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true,
                                })}{' '}
                                →{' '}
                                {pause.resumedAt.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true,
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
