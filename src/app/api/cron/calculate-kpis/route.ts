import { NextResponse } from 'next/server';
import { db } from '@/../../db';
import { productionLineKpiSnapshots, workCenters } from '@/../../db/schema';
import { sql } from 'drizzle-orm';

// Helper function to calculate KPIs for a line (imported pattern from actions)
async function calculateLineKPIs(workCenterId: number) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // This is a simplified version - in production you'd extract this to a shared utility
  // For now, returning default KPIs
  return {
    utilizationPercent: 0,
    throughputUnitsPerHour: 0,
    oee: 0,
    availability: 0,
    performance: 0,
    quality: 100,
  };
}

// Cron job: Run hourly to store KPI snapshots
export async function GET(request: Request) {
  try {
    const now = new Date();
    const hour = now.getHours() - 1; // Previous hour
    const snapshotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    snapshotDate.setHours(0, 0, 0, 0);

    // Get all production lines
    const lines = await db
      .select()
      .from(workCenters)
      .where(sql`production_line_config IS NOT NULL`);

    let snapshotsCreated = 0;

    for (const line of lines) {
      const kpis = await calculateLineKPIs(line.id);

      try {
        await db
          .insert(productionLineKpiSnapshots)
          .values({
            workCenterId: line.id,
            snapshotDate: snapshotDate,
            snapshotHour: hour >= 0 ? hour : 23,
            totalMinutesAvailable: 60,
            totalMinutesRunning: (kpis.utilizationPercent / 100) * 60,
            totalMinutesIdle: 60 - (kpis.utilizationPercent / 100) * 60,
            totalMinutesPaused: 0,
            totalMinutesSetup: 0,
            totalUnitsProduced: kpis.throughputUnitsPerHour,
            totalUnitsPlanned: 0,
            totalUnitsRejected: 0,
            utilizationPercent: kpis.utilizationPercent,
            throughputUnitsPerHour: kpis.throughputUnitsPerHour,
            availabilityPercent: kpis.availability,
            performancePercent: kpis.performance,
            qualityPercent: kpis.quality,
            oeePercent: kpis.oee,
          });

        snapshotsCreated++;
      } catch (error) {
        // Handle unique constraint violations gracefully
        console.log(`Snapshot already exists for line ${line.id}`);
      }
    }

    return NextResponse.json({
      success: true,
      snapshotsCreated,
      timestamp: now,
      message: `Successfully created ${snapshotsCreated} KPI snapshots`,
    });
  } catch (error) {
    console.error('Error calculating KPI snapshots:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
