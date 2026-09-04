import { NextRequest, NextResponse } from 'next/server';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';

function getTelcoForService(service: string): string {
  const s = (service || '').toLowerCase();
  if (s.includes('prepaid')) return 'KPLC_PREPAID';
  if (s.includes('postpaid')) return 'KPLC_POSTPAID';
  if (s.includes('kplc')) return 'KPLC_PREPAID';
  if (s.includes('dstv')) return 'DSTV';
  if (s.includes('gotv')) return 'GOTV';
  if (s.includes('startimes')) return 'STARTIMES';
  if (s.includes('zuku')) return 'ZUKU';
  if (s.includes('water')) return 'NAIROBIWATER';
  return 'KPLC_PREPAID';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account, service } = body;

    if (!account || typeof account !== 'string' || account.trim().length < 4) {
      return NextResponse.json({ 
        valid: false, 
        message: 'Please provide a valid account or meter number.' 
      }, { status: 400 });
    }

    const cleanAccount = account.trim();
    const telco = getTelcoForService(service);

    const provider = new KyandaProvider();
    const result = await provider.verifyAccount(cleanAccount, telco);

    return NextResponse.json({
      valid: result.valid,
      customerName: result.customerName || null,
      balance: result.balance || 0,
      accountNumber: cleanAccount,
      service: telco,
      message: result.message || (result.valid ? 'Account verified successfully' : 'Account not found')
    }, { status: 200 });

  } catch (error: any) {
    console.error('[VerifyAccount API] Error:', error.message);
    return NextResponse.json({
      valid: false,
      message: error.message || 'Unable to verify account at this time. Please check the number and try again.',
      balance: 0
    }, { status: 200 });
  }
}
