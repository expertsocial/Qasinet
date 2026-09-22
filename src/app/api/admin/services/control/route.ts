import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { 
  getAllLiveServiceStatuses, 
  setServiceStatus, 
  getServiceAuditHistory,
  LiveServiceStatus 
} from '@/lib/services/service-lock';
import { MASTER_SERVICES, getServiceStatus } from '@/lib/services/registry';
import { sendAdminServiceLockAlertEmail } from '@/lib/services/email';
import { isAuthorizedAdminEmail } from '@/lib/auth/admin-check';

export const dynamic = 'force-dynamic';

async function verifyAdminAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, status: 401, error: 'Unauthorized: Session required' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseService = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);

  const isAdmin = 
    user.app_metadata?.role === 'ADMIN' ||
    user.app_metadata?.is_admin === true ||
    isAuthorizedAdminEmail(user.email);

  if (!isAdmin) {
    const { data: adminCheck } = await supabaseService.from('admins').select('id').eq('id', user.id).single();
    if (!adminCheck) {
      return { authorized: false, status: 403, error: 'Forbidden: Admin access required' };
    }
  }

  return { authorized: true, user };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const serviceSlug = searchParams.get('serviceSlug');

    const [liveStatuses, auditLog] = await Promise.all([
      getAllLiveServiceStatuses(),
      getServiceAuditHistory(serviceSlug || undefined, 50),
    ]);

    // Build unified service listing with live status overlay
    const services = MASTER_SERVICES.map((staticService) => {
      const live = liveStatuses[staticService.id];
      const fallbackStatus = getServiceStatus(staticService.id);
      return {
        id: staticService.id,
        title: staticService.title,
        shortName: staticService.shortName,
        category: staticService.category,
        categoryLabel: staticService.categoryLabel,
        logoSrc: staticService.logoSrc,
        badge: staticService.badge,
        status: (live?.status ?? fallbackStatus) as 'enabled' | 'locked' | 'hidden',
        rawStaticStatus: fallbackStatus,
        reason: live?.reason || null,
        customerMessage: live?.customerMessage || staticService.comingSoonMessage || null,
        lockedAt: live?.lockedAt || null,
        lockedBy: live?.lockedBy || null,
        updatedAt: live?.updatedAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      services,
      auditLog,
    });
  } catch (error: any) {
    console.error('[Admin Service Control] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load services' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { serviceSlug, status, reason, customerMessage } = body;

    // 1. Validate serviceSlug
    if (!serviceSlug || typeof serviceSlug !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid serviceSlug is required.' },
        { status: 400 }
      );
    }

    const matchedService = MASTER_SERVICES.find((s) => s.id === serviceSlug);
    if (!matchedService) {
      return NextResponse.json(
        { success: false, error: `Service '${serviceSlug}' is not recognized in registry.` },
        { status: 400 }
      );
    }

    // 2. Validate status
    const validStatuses = ['enabled', 'locked', 'hidden'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}.` },
        { status: 400 }
      );
    }

    // 3. Mandatory reason check (Audit trail requirement)
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmedReason || trimmedReason.length < 3) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A mandatory reason is required to change service status (minimum 3 characters).' 
        },
        { status: 400 }
      );
    }

    const adminEmail = auth.user.email || 'Admin';
    const trimmedCustomerMsg = typeof customerMessage === 'string' && customerMessage.trim() ? customerMessage.trim() : null;

    // 4. Update status in DB and cache
    const updatedStatus = await setServiceStatus({
      serviceSlug,
      status,
      reason: trimmedReason,
      customerMessage: trimmedCustomerMsg || undefined,
      changedBy: adminEmail,
    });

    // 5. Send Resend Admin Alert notification in background
    try {
      await sendAdminServiceLockAlertEmail({
        serviceId: serviceSlug,
        serviceName: matchedService.title,
        action: status === 'locked' ? 'LOCKED' : 'UNLOCKED',
        status,
        reason: trimmedReason,
        customerFacingMessage: trimmedCustomerMsg || undefined,
        adminEmail,
        date: new Date().toISOString(),
      });
    } catch (emailErr) {
      console.error('[Admin Service Control] Failed to send email alert:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Service '${matchedService.title}' status successfully set to ${status}.`,
      status: updatedStatus,
    });
  } catch (error: any) {
    console.error('[Admin Service Control] POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update service status' },
      { status: 500 }
    );
  }
}
