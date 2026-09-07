import { KyandaProvider } from '../providers/kyanda/provider';
import { getKplcChannelCode } from '../providers/kyanda/paybill-config';
import { QasiNetError } from '../errors';

export interface VendingResult {
  merchant_reference: string;
  token?: string;
  units?: string;
  receipt?: string;
  rawResponse?: Record<string, unknown> | unknown;
}

export class ElectricityServiceHandler {
  constructor(private readonly kyandaProvider: KyandaProvider) {}

  /**
   * Dispatches Kenya Power (KPLC) Bill / Token purchase via Kyanda Pay Bill API.
   *
   * @param params
   *   - amount: payment amount in KES
   *   - meterNumber: KPLC prepaid meter number or postpaid account number
   *   - type: 'prepaid' | 'postpaid'
   *   - initiatorPhone: phone number tied to transaction for Kyanda records
   */
  public async vendElectricity(params: {
    amount: number | string;
    meterNumber: string;
    type?: 'prepaid' | 'postpaid';
    initiatorPhone: string;
  }): Promise<VendingResult> {
    const meterType = params.type || 'prepaid';
    const cleanMeter = (params.meterNumber || '').trim();

    if (!cleanMeter) {
      throw new QasiNetError('VALIDATION_ERROR', 'Meter number is required for electricity vending.');
    }

    // Resolve channel code from configuration
    const channelCode = getKplcChannelCode(meterType);

    if (!channelCode) {
      console.warn(`[ElectricityServiceHandler] Kenya Power channel code is missing for type '${meterType}'.`);
      throw new QasiNetError(
        'SERVICE_UNAVAILABLE',
        'Electricity service channel is not currently configured. Please contact support.'
      );
    }

    console.log(
      `[ElectricityServiceHandler] Initiating Pay Bill for Meter: ${cleanMeter}, Amount: ${params.amount}, Telco: ${channelCode}`
    );

    const response = await this.kyandaProvider.payBill(
      params.amount,
      cleanMeter,
      channelCode,
      params.initiatorPhone
    );

    const raw = response as Record<string, unknown>;
    const details = (raw?.details && typeof raw.details === 'object' ? raw.details : {}) as Record<string, unknown>;
    const token = (raw?.Token || raw?.token || details?.Token || details?.token) as string | undefined;
    const units = (raw?.Units || raw?.units || details?.Units || details?.units) as string | undefined;
    const receipt = (raw?.Receipt || raw?.receipt || details?.Receipt || details?.receipt) as string | undefined;

    return {
      merchant_reference: response.merchant_reference,
      token,
      units,
      receipt,
      rawResponse: response
    };
  }
}
