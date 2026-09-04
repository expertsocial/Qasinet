import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Beneficiary } from '@/lib/beneficiaries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const saved = (user.user_metadata?.saved_beneficiaries || []) as Beneficiary[];
    return NextResponse.json({ beneficiaries: saved });
  } catch (error: any) {
    console.error('[Beneficiaries API] GET error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, type, provider, accountNumber } = body;

    if (!name || !type || !provider || !accountNumber) {
      return NextResponse.json({ error: 'Missing required beneficiary fields' }, { status: 400 });
    }

    const existing = (user.user_metadata?.saved_beneficiaries || []) as Beneficiary[];
    
    // Check if duplicate account number exists
    const filtered = existing.filter(b => b.accountNumber !== accountNumber.trim());

    const newBeneficiary: Beneficiary = {
      id: `ben_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      type,
      provider: provider.trim(),
      accountNumber: accountNumber.trim(),
      createdAt: new Date().toISOString()
    };

    const updated = [newBeneficiary, ...filtered];

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        saved_beneficiaries: updated
      }
    });

    if (updateError) {
      console.error('[Beneficiaries API] Save error:', updateError);
      return NextResponse.json({ error: 'Failed to save beneficiary' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      beneficiary: newBeneficiary,
      beneficiaries: updated
    });
  } catch (error: any) {
    console.error('[Beneficiaries API] POST error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Beneficiary ID required' }, { status: 400 });
    }

    const existing = (user.user_metadata?.saved_beneficiaries || []) as Beneficiary[];
    const updated = existing.filter(b => b.id !== id);

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        saved_beneficiaries: updated
      }
    });

    if (updateError) {
      console.error('[Beneficiaries API] Delete error:', updateError);
      return NextResponse.json({ error: 'Failed to delete beneficiary' }, { status: 500 });
    }

    return NextResponse.json({ success: true, beneficiaries: updated });
  } catch (error: any) {
    console.error('[Beneficiaries API] DELETE error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
