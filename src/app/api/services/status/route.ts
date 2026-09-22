import { NextResponse } from 'next/server';
import { getAllLiveServiceStatuses } from '@/lib/services/service-lock';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const statuses = await getAllLiveServiceStatuses();
    return NextResponse.json(
      {
        success: true,
        statuses,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch service statuses',
      },
      { status: 500 }
    );
  }
}
