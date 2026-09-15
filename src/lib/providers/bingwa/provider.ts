import { BingwaClient, BingwaClientConfig } from './client';
import { BingwaResellerPayload, BingwaResellerResponse } from './types';
import { QasiNetError } from '../../errors';

export function formatKenyanPhone(phone: string): string {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('254')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

export interface VendBundleParams {
  phone: string;
  bundleCode: string;
  amount: number;
  reference?: string;
  till?: string;
}

export interface VendAirtimeParams {
  phone: string;
  amount: number;
  reference?: string;
  till?: string;
}

export class BingwaProvider {
  private readonly client: BingwaClient;

  constructor(config?: BingwaClientConfig) {
    this.client = new BingwaClient(config);
  }

  /**
   * Vends a mobile data/voice bundle via the Reseller API
   */
  public async vendBundle(params: VendBundleParams): Promise<BingwaResellerResponse> {
    const formattedPhone = formatKenyanPhone(params.phone);
    if (!formattedPhone || formattedPhone.length !== 10) {
      throw new QasiNetError('VALIDATION_ERROR', 'Invalid Kenyan mobile phone number for bundle delivery');
    }

    if (!params.bundleCode) {
      throw new QasiNetError('VALIDATION_ERROR', 'Bundle code is required');
    }

    if (!params.amount || params.amount <= 0) {
      throw new QasiNetError('VALIDATION_ERROR', 'Valid bundle amount is required');
    }

    const payload: BingwaResellerPayload = {
      till: params.till || this.client.getDefaultTill(),
      amount: params.amount,
      phone: formattedPhone,
      bundle: params.bundleCode,
      reference: params.reference,
      callback_url: process.env.BINGWA_SOKONI_CALLBACK_URL || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/webhooks/bingwa`,
    };

    console.log(`[ResellerProvider] Vending bundle ${params.bundleCode} for ${formattedPhone} (Amount: KES ${params.amount})`);
    return await this.client.requestPay(payload);
  }

  /**
   * Vends airtime via the Reseller API
   */
  public async vendAirtime(params: VendAirtimeParams): Promise<BingwaResellerResponse> {
    const formattedPhone = formatKenyanPhone(params.phone);
    if (!formattedPhone || formattedPhone.length !== 10) {
      throw new QasiNetError('VALIDATION_ERROR', 'Invalid Kenyan mobile phone number for airtime delivery');
    }

    if (!params.amount || params.amount < 5) {
      throw new QasiNetError('VALIDATION_ERROR', 'Minimum airtime amount is KES 5');
    }

    const payload: BingwaResellerPayload = {
      till: params.till || this.client.getDefaultTill(),
      amount: params.amount,
      phone: formattedPhone,
      bundle: 'AIRTIME',
      reference: params.reference,
      callback_url: process.env.BINGWA_SOKONI_CALLBACK_URL || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/webhooks/bingwa`,
    };

    console.log(`[ResellerProvider] Vending airtime KES ${params.amount} for ${formattedPhone}`);
    return await this.client.requestPay(payload);
  }
}
