import { NextResponse } from 'next/server';
import { generateRecurringRefills } from '@/../../src/app/actions/service';

/**
 * Cron job endpoint to generate recurring refill invoices
 * Called daily by Vercel Cron at 2:00 AM UTC
 *
 * Security: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: Request) {
  // Security: Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call service action with skipAuth = true (no user session in cron)
    const result = await generateRecurringRefills(true);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result.results,
    });
  } catch (error: any) {
    console.error('Error generating refills:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
