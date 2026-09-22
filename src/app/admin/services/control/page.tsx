import { Metadata } from 'next';
import { 
  getAllLiveServiceStatuses, 
  getServiceAuditHistory 
} from '@/lib/services/service-lock';
import { MASTER_SERVICES, getServiceStatus } from '@/lib/services/registry';
import { ServiceControlClient, ManagedService } from './ServiceControlClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Live Service Control & Killswitch | QasiNet Admin',
  description: 'Manage live status, instant lock, and visibility for all utility services.',
};

export default async function AdminServiceControlPage() {
  const [liveStatuses, auditLog] = await Promise.all([
    getAllLiveServiceStatuses(),
    getServiceAuditHistory(undefined, 50),
  ]);

  const initialServices: ManagedService[] = MASTER_SERVICES.map((staticService) => {
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

  return (
    <ServiceControlClient 
      initialServices={initialServices} 
      initialAuditLog={auditLog} 
    />
  );
}
