import { KyandaProvider } from '../providers/kyanda/provider';
import { PayBillServiceHandler, PayBillResult } from './paybill';

export type VendingResult = PayBillResult;

/**
 * Backward-compatible Electricity Service Handler delegating to the shared PayBillServiceHandler.
 */
export class ElectricityServiceHandler {
  private readonly paybillHandler: PayBillServiceHandler;

  constructor(kyandaProvider: KyandaProvider) {
    this.paybillHandler = new PayBillServiceHandler(kyandaProvider);
  }

  /**
   * Dispatches Kenya Power (KPLC) Bill / Token purchase via shared Pay Bill handler.
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
    return this.paybillHandler.vendElectricity(params);
  }
}
