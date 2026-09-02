import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionOrchestrator } from '@/lib/services/orchestrator';
import { QasiNetError } from '@/lib/errors';
import { SupabaseClient } from '@supabase/supabase-js';

// Deep mock strategy for Supabase Builder
const mockTerminal = vi.fn();
const createChainableMock = () => {
  const chainable = {
    select: vi.fn(() => chainable),
    insert: vi.fn(() => chainable),
    update: vi.fn(() => chainable),
    eq: vi.fn(() => chainable),
    in: vi.fn(() => chainable),
    gte: vi.fn(() => mockTerminal()), // Terminal for the idempotency check
    single: mockTerminal,             // Terminal for most select queries
  };
  return chainable;
};

const mockBuilder = createChainableMock();
const mockFrom = vi.fn(() => mockBuilder);
const mockSupabase = { from: mockFrom } as unknown as SupabaseClient;

describe('TransactionOrchestrator', () => {
  let orchestrator: TransactionOrchestrator;

  beforeEach(() => {
    vi.resetAllMocks();
    orchestrator = new TransactionOrchestrator(mockSupabase);
    mockTerminal.mockReset();
    mockTerminal.mockResolvedValue({ data: null, error: null });
    
    // Reset specific mock implementations that might have been overridden
    mockBuilder.insert.mockImplementation(() => mockBuilder);
    mockBuilder.update.mockImplementation(() => mockBuilder);
  });

  describe('initiateTransaction', () => {
    it('should reject a duplicate request', async () => {
      // Mock finding an existing recent transaction (gte is the terminal here)
      mockTerminal.mockResolvedValueOnce({ data: [{ id: 'existing-tx' }] });

      await expect(
        orchestrator.initiateTransaction({
          serviceSlug: 'airtime',
          destination: '0712345678',
          amount: 100,
          idempotencyKey: 'idemp-123'
        })
      ).rejects.toThrowError(new QasiNetError('DUPLICATE_REQUEST', 'A similar transaction is already in progress. Please wait.'));
    });

    it('should throw SERVICE_UNAVAILABLE if pricing is missing', async () => {
      mockTerminal.mockResolvedValueOnce({ data: [] }); // GTE: No dupes
      mockTerminal.mockResolvedValueOnce({ data: { id: 'svc-1', provider_id: 'prov-1', pricing: [] } }); // SINGLE: Service missing pricing

      await expect(
        orchestrator.initiateTransaction({
          serviceSlug: 'airtime',
          destination: '0712345678',
          amount: 100,
          idempotencyKey: 'idemp-123'
        })
      ).rejects.toThrowError(new QasiNetError('SERVICE_UNAVAILABLE', 'Pricing configuration missing for this service'));
    });

    it('should calculate profit and create transaction correctly', async () => {
      mockTerminal.mockResolvedValueOnce({ data: [] }); // No dupes
      // Mock Service & Pricing
      mockTerminal.mockResolvedValueOnce({ 
        data: { 
          id: 'svc-1', 
          provider_id: 'prov-1', 
          pricing: [{ provider_cost_percentage: 95, selling_price_percentage: 100 }] 
        } 
      });
      // Mock Insert returning new Tx
      mockBuilder.insert.mockImplementationOnce(() => {
         mockTerminal.mockResolvedValueOnce({
          data: { id: 'new-tx', qsn_reference: 'QSN-123', status: 'CREATED', amount: 100, selling_price: 100 }
         });
         return mockBuilder;
      });
      // Mock insert for Event log
      mockBuilder.insert.mockImplementationOnce(() => {
         mockTerminal.mockResolvedValueOnce({ error: null });
         return mockBuilder;
      });

      const tx = await orchestrator.initiateTransaction({
        serviceSlug: 'airtime',
        destination: '0712345678',
        amount: 100,
        idempotencyKey: 'idemp-123'
      });

      expect(tx.id).toBe('new-tx');
      
      const insertCall = mockBuilder.insert.mock.calls[0][0];
      expect(insertCall.provider_cost).toBe(95); // 95% of 100
      expect(insertCall.profit).toBe(5); // 100 - 95
      expect(insertCall.status).toBe('CREATED');
    });
  });

  describe('updatePaymentState', () => {
    it('should throw if transaction is not in valid state', async () => {
      mockTerminal.mockResolvedValueOnce({ data: { status: 'VENDING_PENDING' } });

      await expect(
        orchestrator.updatePaymentState('tx-1', 'PAYMENT_CONFIRMED')
      ).rejects.toThrowError(new QasiNetError('VALIDATION_ERROR', 'Cannot update payment from state: VENDING_PENDING'));
    });

    it('should update to PAYMENT_CONFIRMED successfully', async () => {
      mockTerminal.mockResolvedValueOnce({ data: { status: 'PAYMENT_PENDING' } });
      
      mockBuilder.update.mockImplementationOnce(() => {
         mockTerminal.mockResolvedValueOnce({ error: null }); // For update
         return mockBuilder;
      });
      mockBuilder.insert.mockImplementationOnce(() => {
         mockTerminal.mockResolvedValueOnce({ error: null }); // For event log
         return mockBuilder;
      });

      await expect(orchestrator.updatePaymentState('tx-1', 'PAYMENT_CONFIRMED', 'MPESA123')).resolves.not.toThrow();
      
      const updateCall = mockBuilder.update.mock.calls[0][0];
      expect(updateCall.status).toBe('PAYMENT_CONFIRMED');
      expect(updateCall.payment_reference).toBe('MPESA123');
    });
  });

  describe('authorizeVending', () => {
    it('should throw if payment is not confirmed', async () => {
      mockTerminal.mockResolvedValueOnce({ data: { status: 'PAYMENT_PENDING' } });

      await expect(
        orchestrator.authorizeVending('tx-1')
      ).rejects.toThrowError(new QasiNetError('VALIDATION_ERROR', 'Vending rejected. Transaction payment state is PAYMENT_PENDING, expected PAYMENT_CONFIRMED.'));
    });

    it('should authorize vending if payment is confirmed', async () => {
      mockTerminal.mockResolvedValueOnce({ data: { status: 'PAYMENT_CONFIRMED' } });
      
      mockBuilder.update.mockImplementationOnce(() => {
         mockTerminal.mockResolvedValueOnce({ error: null });
         return mockBuilder;
      });
      mockBuilder.insert.mockImplementationOnce(() => {
         mockTerminal.mockResolvedValueOnce({ error: null });
         return mockBuilder;
      });

      await expect(orchestrator.authorizeVending('tx-1')).resolves.not.toThrow();

      const updateCall = mockBuilder.update.mock.calls[0][0];
      expect(updateCall.status).toBe('VENDING_PENDING');
    });
  });
});
