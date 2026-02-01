'use server';

import { auth } from '@/auth';
import { db } from '../../../db';
import { productionLaborLogs, users, productionRuns, productionCosts } from '../../../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Clock In Schema
const clockInSchema = z.object({
    runId: z.number().int().positive(),
    notes: z.string().max(500).optional(),
});

export async function clockIn(input: unknown) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Unauthorized - Please log in' };
        }

        const data = clockInSchema.parse(input);

        const userEmail = session.user.email!;
        const [currentUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, userEmail))
            .limit(1);

        if (!currentUser || !currentUser.isActive) {
            return { success: false, error: 'User account is inactive' };
        }

        return await db.transaction(async (tx: any) => {
            // Check run exists and is IN_PROGRESS
            const [run] = await tx
                .select()
                .from(productionRuns)
                .where(eq(productionRuns.id, data.runId))
                .limit(1);

            if (!run) {
                throw new Error('Production run not found');
            }

            if (run.status !== 'IN_PROGRESS') {
                throw new Error(`Cannot clock in: Run status is ${run.status}. Only IN_PROGRESS runs allow clock-in.`);
            }

            // Check for existing active clock-in
            const activeClockIns = await tx
                .select()
                .from(productionLaborLogs)
                .where(
                    and(
                        eq(productionLaborLogs.userId, currentUser.id),
                        isNull(productionLaborLogs.clockOutAt)
                    )
                )
                .limit(1);

            if (activeClockIns.length > 0) {
                const activeLog = activeClockIns[0];
                throw new Error(
                    `You are already clocked in to Run #${activeLog.runId}. Please clock out first.`
                );
            }

            // Create labor log
            const [laborLog] = await tx.insert(productionLaborLogs).values({
                runId: data.runId,
                userId: currentUser.id,
                clockInAt: new Date(),
                clockOutAt: null,
                durationMinutes: null,
                hourlyRateSnapshot: currentUser.hourlyRate,
                totalCost: null,
                notes: data.notes,
                isManual: false,
            }).returning();

            return { success: true, laborLogId: laborLog.id };
        });

    } catch (error: any) {
        console.error('Clock In Error:', error);
        return { success: false, error: error.message || 'Failed to clock in' };
    } finally {
        revalidatePath('/production');
    }
}

// Clock Out Schema
const clockOutSchema = z.object({
    laborLogId: z.number().int().positive(),
    notes: z.string().max(500).optional(),
});

export async function clockOut(input: unknown) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Unauthorized - Please log in' };
        }

        const data = clockOutSchema.parse(input);

        const userEmail = session.user.email!;
        const [currentUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, userEmail))
            .limit(1);

        if (!currentUser) {
            return { success: false, error: 'User not found' };
        }

        return await db.transaction(async (tx: any) => {
            const [laborLog] = await tx
                .select()
                .from(productionLaborLogs)
                .where(eq(productionLaborLogs.id, data.laborLogId))
                .limit(1);

            if (!laborLog) {
                throw new Error('Labor log not found');
            }

            if (laborLog.userId !== currentUser.id) {
                throw new Error('You can only clock out your own time entries');
            }

            if (laborLog.clockOutAt !== null) {
                throw new Error('Already clocked out');
            }

            // Calculate duration and cost
            const clockOutTime = new Date();
            const clockInTime = new Date(laborLog.clockInAt);
            const durationMs = clockOutTime.getTime() - clockInTime.getTime();
            const durationMinutes = Math.round(durationMs / 1000 / 60);

            if (durationMinutes < 1) {
                throw new Error('Clock out time must be at least 1 minute after clock in');
            }

            // Cost calculation: (hourlyRate / 60) * minutes
            const totalCost = Math.round((laborLog.hourlyRateSnapshot / 60) * durationMinutes);

            // Update labor log
            await tx.update(productionLaborLogs)
                .set({
                    clockOutAt: clockOutTime,
                    durationMinutes: durationMinutes,
                    totalCost: totalCost,
                    notes: data.notes || laborLog.notes,
                    updatedAt: new Date(),
                })
                .where(eq(productionLaborLogs.id, data.laborLogId));

            // CRITICAL: Sync to productionCosts table
            await tx.insert(productionCosts).values({
                runId: laborLog.runId,
                costType: 'Labor',
                amount: totalCost,
                description: `Labor: ${currentUser.name} (${durationMinutes} min @ ${laborLog.hourlyRateSnapshot / 100} per hour)`,
            });

            return {
                success: true,
                durationMinutes,
                totalCost,
            };
        });

    } catch (error: any) {
        console.error('Clock Out Error:', error);
        return { success: false, error: error.message || 'Failed to clock out' };
    } finally {
        revalidatePath('/production');
    }
}

// Manual Labor Log Schema
const manualLaborLogSchema = z.object({
    runId: z.number().int().positive(),
    userId: z.number().int().positive(),
    clockInAt: z.coerce.date(),
    clockOutAt: z.coerce.date(),
    notes: z.string().max(500).optional(),
});

export async function addManualLaborLog(input: unknown) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Unauthorized - Please log in' };
        }

        const userEmail = session.user.email!;
        const [currentUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, userEmail))
            .limit(1);

        if (!currentUser) {
            return { success: false, error: 'User not found' };
        }

        // AUTHORIZATION: Only ADMIN or PLANT_MANAGER
        if (currentUser.role !== 'ADMIN' && currentUser.role !== 'PLANT_MANAGER') {
            return { success: false, error: 'Insufficient permissions. Only admins can add manual labor logs.' };
        }

        const data = manualLaborLogSchema.parse(input);

        if (data.clockOutAt <= data.clockInAt) {
            return { success: false, error: 'Clock out time must be after clock in time' };
        }

        return await db.transaction(async (tx: any) => {
            const [run] = await tx
                .select()
                .from(productionRuns)
                .where(eq(productionRuns.id, data.runId))
                .limit(1);

            if (!run) {
                throw new Error('Production run not found');
            }

            const [targetUser] = await tx
                .select()
                .from(users)
                .where(eq(users.id, data.userId))
                .limit(1);

            if (!targetUser) {
                throw new Error('Target user not found');
            }

            const durationMs = data.clockOutAt.getTime() - data.clockInAt.getTime();
            const durationMinutes = Math.round(durationMs / 1000 / 60);
            const totalCost = Math.round((targetUser.hourlyRate / 60) * durationMinutes);

            const [laborLog] = await tx.insert(productionLaborLogs).values({
                runId: data.runId,
                userId: data.userId,
                clockInAt: data.clockInAt,
                clockOutAt: data.clockOutAt,
                durationMinutes: durationMinutes,
                hourlyRateSnapshot: targetUser.hourlyRate,
                totalCost: totalCost,
                notes: data.notes,
                isManual: true,
            }).returning();

            await tx.insert(productionCosts).values({
                runId: data.runId,
                costType: 'Labor',
                amount: totalCost,
                description: `Labor (Manual): ${targetUser.name} (${durationMinutes} min @ ${targetUser.hourlyRate / 100} per hour)`,
            });

            return { success: true, laborLogId: laborLog.id };
        });

    } catch (error: any) {
        console.error('Add Manual Labor Log Error:', error);
        return { success: false, error: error.message || 'Failed to add manual labor log' };
    } finally {
        revalidatePath('/production');
    }
}

// Get Production Run Labor Details
export async function getProductionRunLabor(runId: number) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' };
        }

        const laborLogs = await db
            .select({
                id: productionLaborLogs.id,
                userId: productionLaborLogs.userId,
                userName: users.name,
                userRole: users.role,
                clockInAt: productionLaborLogs.clockInAt,
                clockOutAt: productionLaborLogs.clockOutAt,
                durationMinutes: productionLaborLogs.durationMinutes,
                hourlyRateSnapshot: productionLaborLogs.hourlyRateSnapshot,
                totalCost: productionLaborLogs.totalCost,
                notes: productionLaborLogs.notes,
                isManual: productionLaborLogs.isManual,
                createdAt: productionLaborLogs.createdAt,
            })
            .from(productionLaborLogs)
            .leftJoin(users, eq(productionLaborLogs.userId, users.id))
            .where(eq(productionLaborLogs.runId, runId))
            .orderBy(productionLaborLogs.clockInAt);

        const activeLogs = laborLogs.filter((log: any) => log.clockOutAt === null);
        const completedLogs = laborLogs.filter((log: any) => log.clockOutAt !== null);

        const totalLaborCost = completedLogs.reduce((sum: number, log: any) => sum + (log.totalCost || 0), 0);
        const totalLaborMinutes = completedLogs.reduce((sum: number, log: any) => sum + (log.durationMinutes || 0), 0);

        return {
            success: true,
            data: {
                activeLogs,
                completedLogs,
                totalLaborCost,
                totalLaborMinutes,
                totalLaborHours: Math.round((totalLaborMinutes / 60) * 100) / 100,
            },
        };

    } catch (error: any) {
        console.error('Get Production Run Labor Error:', error);
        return { success: false, error: error.message || 'Failed to fetch labor data' };
    }
}

// Get Active Operators Helper
export async function getActiveOperators() {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: 'Unauthorized', operators: [] };
        }

        const operators = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                hourlyRate: users.hourlyRate,
            })
            .from(users)
            .where(
                and(
                    eq(users.role, 'FACTORY_WORKER'),
                    eq(users.isActive, true)
                )
            )
            .orderBy(users.name);

        return {
            success: true,
            operators: operators,
        };

    } catch (error: any) {
        console.error('Error fetching operators:', error);
        return {
            success: false,
            operators: [],
            error: error instanceof Error ? error.message : 'Failed to fetch operators',
        };
    }
}
