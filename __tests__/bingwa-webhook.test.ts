import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockFinalizeTransaction,
  mockFrom,
  mockMaybeSingle,
  mockEq,
  mockIn,
  mockSelect,
  mockOrder,
  mockLimit,
  mockOr,
} = vi.hoisted(() => {
  const mockFinalizeTransaction = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
  const mockIn = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ or: mockOr }) });
  const mockEq = vi.fn().mockImplementation(() => ({
    maybeSingle: mockMaybeSingle,
    eq: mockEq,
  }));
  const mockSelect = vi.fn().mockReturnValue({
    eq: mockEq,
    in: mockIn,
  });
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
  });

  return {
    mockFinalizeTransaction,
    mockFrom,
    mockMaybeSingle,
    mockEq,
    mockIn,
    mockSelect,
    mockOrder,
    mockLimit,
    mockOr,
  };
});

vi.mock('@/lib/services/orchestrator', () => {
  return {
    TransactionOrchestrator: class {
      finalizeTransaction = mockFinalizeTransaction;
    },
  };
});

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn().mockReturnValue({
      from: mockFrom,
    }),
  };
});

// Import POST after mocks are set up
import { POST } from '@/app/api/webhooks/bingwa/route';

function setupQueryChain(resolvedData: any) {
  mockMaybeSingle.mockResolvedValue({ data: resolvedData, error: null });
  mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockOr.mockReturnValue({ order: mockOrder });
  mockIn.mockReturnValue({ eq: vi.fn().mockReturnValue({ or: mockOr }) });

  mockEq.mockImplementation(() => ({
    maybeSingle: mockMaybeSingle,
    eq: mockEq,
  }));

  mockSelect.mockReturnValue({
    eq: mockEq,
    in: mockIn,
  });

  mockFrom.mockReturnValue({
    select: mockSelect,
  });
}

describe('Bingwa Sokoni Reseller Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('returns 400 Bad Request when payload is malformed', async () => {
    const req = {
      json: vi.fn().mockRejectedValue(new Error('SyntaxError: Unexpected token')),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.status).toBe('error');
    expect(body.message).toContain('Invalid JSON payload');
  });

  it('returns 200 ignored when transaction is not found in database', async () => {
    setupQueryChain(null);

    const req = {
      json: vi.fn().mockResolvedValue({
        reference: 'QSN-NONEXISTENT',
        status: true,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ignored');
    expect(mockFinalizeTransaction).not.toHaveBeenCalled();
  });

  it('returns 200 already processed when transaction is already in terminal SUCCESS state', async () => {
    setupQueryChain({
      id: 'tx-123',
      qsn_reference: 'QSN-20260917-ALREADYDONE',
      status: 'SUCCESS',
      amount: 51,
      destination: '0712345678',
    });

    const req = {
      json: vi.fn().mockResolvedValue({
        reference: 'QSN-20260917-ALREADYDONE',
        status: true,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.message).toBe('Already processed');
    expect(mockFinalizeTransaction).not.toHaveBeenCalled();
  });

  it('matches transaction by QasiNet reference and finalizes successfully', async () => {
    setupQueryChain({
      id: 'tx-999',
      qsn_reference: 'QSN-20260917-MATCHREF',
      status: 'PAYMENT_CONFIRMED',
      amount: 51,
      destination: '0712345678',
      kyanda_reference: 'PREV-REF',
    });

    const req = {
      json: vi.fn().mockResolvedValue({
        reference: 'QSN-20260917-MATCHREF',
        transaction_id: 'RES-DELIVERED-001',
        status: true,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.received).toBe(true);

    expect(mockFinalizeTransaction).toHaveBeenCalledWith(
      'tx-999',
      true,
      undefined,
      'RES-DELIVERED-001',
      expect.objectContaining({
        provider_payload: expect.objectContaining({
          transaction_id: 'RES-DELIVERED-001',
        }),
      })
    );
  });

  it('handles delivery failure callback by setting VENDING_FAILED_REFUND_PENDING', async () => {
    setupQueryChain({
      id: 'tx-fail-1',
      qsn_reference: 'QSN-20260917-FAILORDER',
      status: 'PAYMENT_CONFIRMED',
      amount: 51,
      destination: '0712345678',
    });

    const req = {
      json: vi.fn().mockResolvedValue({
        reference: 'QSN-20260917-FAILORDER',
        status: false,
        message: 'Network subscriber absent or out of reach',
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');

    expect(mockFinalizeTransaction).toHaveBeenCalledWith(
      'tx-fail-1',
      false,
      'Network subscriber absent or out of reach',
      undefined,
      expect.objectContaining({
        provider_payload: expect.objectContaining({
          message: 'Network subscriber absent or out of reach',
        }),
      }),
      'VENDING_FAILED_REFUND_PENDING'
    );
  });
});
