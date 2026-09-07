import { KyandaProvider } from '../providers/kyanda/provider';
import { getKplcChannelCode } from '../providers/kyanda/paybill-config';
import { QasiNetError } from '../errors';

export type TvProvider = 'GOTV' | 'DSTV' | 'ZUKU' | 'STARTIMES';

export const SUPPORTED_TV_PROVIDERS: readonly TvProvider[] = ['GOTV', 'DSTV', 'ZUKU', 'STARTIMES'] as const;

export interface PayBillParams {
  amount: number | string;
  accountNumber: string;
  telco: string;
  initiatorPhone: string;
  accountLabel?: string;
}

export interface PayBillResult {
  merchant_reference: string;
  token?: string;
  units?: string;
  receipt?: string;
  rawResponse?: Record<string, unknown> | unknown;
}

/**
 * Shared Pay Bill service handler for all Kyanda Bill Create operations
 * (Kenya Power KPLC electricity tokens and TV subscriptions: DStv, GOtv, Zuku, StarTimes).
 */
export class PayBillServiceHandler {
  constructor(private readonly kyandaProvider: KyandaProvider) {}

  /**
   * Generic Pay Bill dispatcher calling the Kyanda Pay Bill API (Section B of Kyanda docs).
   */
  public async payBill(params: PayBillParams): Promise<PayBillResult> {
    const cleanAccount = (params.accountNumber || '').trim();
    const cleanTelco = (params.telco || '').trim();
    const label = params.accountLabel || 'Account number';

    if (!cleanAccount) {
      throw new QasiNetError('VALIDATION_ERROR', `${label} is required for bill payment.`);
    }

    if (!cleanTelco) {
      throw new QasiNetError('VALIDATION_ERROR', 'Provider channel code (telco) is required.');
    }

    const numAmount = Number(params.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new QasiNetError('VALIDATION_ERROR', 'A valid payment amount greater than 0 is required.');
    }

    console.log(
      `[PayBillServiceHandler] Initiating Pay Bill for Account: ${cleanAccount}, Amount: ${params.amount}, Telco: ${cleanTelco}`
    );

    const response = await this.kyandaProvider.payBill(
      params.amount,
      cleanAccount,
      cleanTelco,
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
      rawResponse: response,
    };
  }

  /**
   * Dispatches TV subscription payments (GOTV, DSTV, ZUKU, STARTIMES).
   */
  public async vendTvSubscription(params: {
    amount: number | string;
    decoderNumber: string;
    provider: TvProvider | string;
    initiatorPhone: string;
  }): Promise<PayBillResult> {
    const cleanDecoder = (params.decoderNumber || '').trim();
    if (!cleanDecoder) {
      throw new QasiNetError('VALIDATION_ERROR', 'Decoder / smartcard number is required.');
    }

    const rawProvider = (params.provider || '').toUpperCase().trim();

    if (!SUPPORTED_TV_PROVIDERS.includes(rawProvider as TvProvider)) {
      throw new QasiNetError(
        'VALIDATION_ERROR',
        `Unsupported TV provider: '${params.provider}'. Supported providers are: ${SUPPORTED_TV_PROVIDERS.join(', ')}.`
      );
    }

    return this.payBill({
      amount: params.amount,
      accountNumber: cleanDecoder,
      telco: rawProvider,
      initiatorPhone: params.initiatorPhone,
      accountLabel: 'Decoder / smartcard number',
    });
  }

  /**
   * Dispatches Kenya Power (KPLC) Bill / Token purchase via Kyanda Pay Bill API.
   */
  public async vendElectricity(params: {
    amount: number | string;
    meterNumber: string;
    type?: 'prepaid' | 'postpaid';
    initiatorPhone: string;
  }): Promise<PayBillResult> {
    const cleanMeter = (params.meterNumber || '').trim();
    if (!cleanMeter) {
      throw new QasiNetError('VALIDATION_ERROR', 'Meter number is required for electricity vending.');
    }

    const meterType = params.type || 'prepaid';
    const channelCode = getKplcChannelCode(meterType);

    if (!channelCode) {
      console.warn(`[PayBillServiceHandler] Kenya Power channel code is missing for type '${meterType}'.`);
      throw new QasiNetError(
        'SERVICE_UNAVAILABLE',
        'Electricity service channel is not currently configured. Please contact support.'
      );
    }

    return this.payBill({
      amount: params.amount,
      accountNumber: cleanMeter,
      telco: channelCode,
      initiatorPhone: params.initiatorPhone,
      accountLabel: 'Meter number',
    });
  }
}
