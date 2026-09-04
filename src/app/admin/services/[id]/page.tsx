import { redirect } from 'next/navigation';

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/services/${id}/pricing`);
}
