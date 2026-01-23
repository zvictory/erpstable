'use server';

import { db } from '../../../db';
import { lineIssues, users } from '../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

// Create issue
export async function createLineIssue(params: {
  workCenterId: number;
  title: string;
  titleRu?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  affectsProduction: boolean;
  estimatedDowntimeMinutes?: number;
  reportedByUserId: number;
  assignedToUserId?: number;
  downtimeEventId?: number;
}) {
  try {
    const now = new Date();
    const assignedAt = params.assignedToUserId ? now : null;
    const status = params.assignedToUserId ? 'assigned' : 'open';

    const result = await db.insert(lineIssues).values({
      workCenterId: params.workCenterId,
      title: params.title,
      titleRu: params.titleRu,
      description: params.description,
      severity: params.severity,
      category: params.category,
      affectsProduction: params.affectsProduction,
      estimatedDowntimeMinutes: params.estimatedDowntimeMinutes,
      reportedByUserId: params.reportedByUserId,
      assignedToUserId: params.assignedToUserId,
      status: status,
      assignedAt: assignedAt,
      downtimeEventId: params.downtimeEventId,
    }).returning();

    return {
      success: true,
      issueId: result[0].id
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Update issue status
export async function updateIssueStatus(params: {
  issueId: number;
  status: string;
  resolutionNotes?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  resolvedByUserId?: number;
}) {
  try {
    const now = new Date();
    const updates: any = {
      status: params.status,
      updatedAt: now,
    };

    if (params.status === 'resolved') {
      updates.resolvedAt = now;
      updates.resolvedByUserId = params.resolvedByUserId;
      updates.resolutionNotes = params.resolutionNotes;
      updates.rootCause = params.rootCause;
      updates.correctiveAction = params.correctiveAction;
      updates.preventiveAction = params.preventiveAction;
    }

    if (params.status === 'closed') {
      updates.closedAt = now;
    }

    await db.update(lineIssues)
      .set(updates)
      .where(eq(lineIssues.id, params.issueId));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get open issues for a line
export async function getOpenIssues(workCenterId: number) {
  try {
    const results = await db.select({
      id: lineIssues.id,
      title: lineIssues.title,
      description: lineIssues.description,
      severity: lineIssues.severity,
      category: lineIssues.category,
      affectsProduction: lineIssues.affectsProduction,
      status: lineIssues.status,
      reportedBy: users.name,
      reportedAt: lineIssues.reportedAt,
    })
    .from(lineIssues)
    .leftJoin(users, eq(users.id, lineIssues.reportedByUserId))
    .where(
      and(
        eq(lineIssues.workCenterId, workCenterId),
      )
    )
    .orderBy(desc(lineIssues.reportedAt));

    // Filter for open, assigned, and in_progress statuses
    const openIssues = results.filter(r =>
      r.status === 'open' || r.status === 'assigned' || r.status === 'in_progress'
    );

    return {
      success: true,
      openIssues: openIssues.map(issue => {
        const reportedAt = issue.reportedAt instanceof Date ? issue.reportedAt : new Date(issue.reportedAt as any);
        return {
          ...issue,
          reportedAt,
        };
      })
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get all issues for a line
export async function getLineIssuesHistory(params: {
  workCenterId: number;
  limit?: number;
}) {
  try {
    const limitValue = params.limit || 50;

    const results = await db.select({
      id: lineIssues.id,
      title: lineIssues.title,
      description: lineIssues.description,
      severity: lineIssues.severity,
      category: lineIssues.category,
      status: lineIssues.status,
      reportedBy: users.name,
      reportedAt: lineIssues.reportedAt,
      resolutionNotes: lineIssues.resolutionNotes,
      rootCause: lineIssues.rootCause,
    })
    .from(lineIssues)
    .leftJoin(users, eq(users.id, lineIssues.reportedByUserId))
    .where(eq(lineIssues.workCenterId, params.workCenterId))
    .orderBy(desc(lineIssues.reportedAt))
    .limit(limitValue);

    return {
      success: true,
      issues: results.map(issue => {
        const reportedAt = issue.reportedAt instanceof Date ? issue.reportedAt : new Date(issue.reportedAt as any);
        return {
          ...issue,
          reportedAt,
        };
      })
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
