import { NextRequest, NextResponse } from 'next/server';
import { KyandaProvider } from '@/lib/providers/kyanda/provider';
import { validateServiceAccount } from '@/lib/account-validation';

function getTelcoForService(service: string): string {
  const s = (service || '').toLowerCase();
  if (s.includes('prepaid')) return 'KPLC_PREPAID';
  if (s.includes('postpaid')) return 'KPLC_POSTPAID';
  if (s.includes('kplc')) return 'KPLC_PREPAID';
  if (s.includes('dstv')) return 'DSTV';
  if (s.includes('gotv')) return 'GOTV';
  if (s.includes('startimes')) return 'STARTIMES';
  if (s.includes('zuku')) return 'ZUKU';
  if (s.includes('water')) return 'NAIROBI_WTR';
  return 'KPLC_PREPAID';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account, service } = body;

    if (!account || typeof account !== 'string') {
      return NextResponse.json({ 
        valid: false, 
        message: 'Please provide a valid account or meter number.' 
      }, { status: 400 });
    }

    const cleanAccount = account.trim();
    
    // Validate format per service
    const formatValidation = validateServiceAccount(cleanAccount, service || '');
    if (!formatValidation.isValid) {
      return NextResponse.json({
        valid: false,
        message: formatValidation.error || 'Invalid account number format.',
        balance: 0
      }, { status: 400 });
    }

    const telco = getTelcoForService(service);
    const provider = new KyandaProvider();
    
    try {
      const result = await provider.verifyAccount(formatValidation.normalized, telco);
      if (result.valid) {
        return NextResponse.json({
          valid: true,
          customerName: result.customerName || null,
          balance: result.balance || 0,
          accountNumber: formatValidation.normalized,
          service: telco,
          message: result.message || 'Account verified successfully'
        }, { status: 200 });
      }
    } catch {
      // Kyanda does not have a public account-query endpoint (404).
      // Since syntax format is valid, proceed without customer name.
    }

    // Format is valid, name lookup is optional/unsupported by upstream biller
    return NextResponse.json({
      valid: true,
      customerName: null,
      balance: 0,
      accountNumber: formatValidation.normalized,
      service: telco,
      message: 'Account format verified'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[VerifyAccount API] Error:', error.message);
    return NextResponse.json({
      valid: false,
      message: error.message || 'Unable to verify account at this time.',
      balance: 0
    }, { status: 500 });
  }
}
