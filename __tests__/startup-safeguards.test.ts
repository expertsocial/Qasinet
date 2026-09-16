import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateDeploymentSafeguards, assertDeploymentSafeguards } from '@/lib/startup-check';

describe('Startup & Deployment Safeguards', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('KPLC Prepaid Safeguard', () => {
    it('passes validation when kplc-prepaid is enabled and channel code is set', () => {
      process.env.NEXT_PUBLIC_SERVICE_STATUS_KPLC_PREPAID = 'enabled';
      process.env.KYANDA_KPLC_PREPAID_CHANNEL = 'KPLC_PREPAID';

      const result = validateDeploymentSafeguards();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(() => assertDeploymentSafeguards()).not.toThrow();
    });

    it('fails loudly with fatal error when kplc-prepaid is enabled but channel code is blank', () => {
      process.env.NEXT_PUBLIC_SERVICE_STATUS_KPLC_PREPAID = 'enabled';
      delete process.env.KYANDA_KPLC_PREPAID_CHANNEL;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = validateDeploymentSafeguards();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("FATAL DEPLOYMENT ERROR: Service 'kplc-prepaid'");
      expect(result.errors[0]).toContain("KYANDA_KPLC_PREPAID_CHANNEL is blank");

      expect(() => assertDeploymentSafeguards()).toThrow(/FATAL DEPLOYMENT ERROR: Service 'kplc-prepaid'/);
      consoleErrorSpy.mockRestore();
    });

    it('fails loudly when kplc-prepaid channel code is only whitespace', () => {
      process.env.NEXT_PUBLIC_SERVICE_STATUS_KPLC_PREPAID = 'enabled';
      process.env.KYANDA_KPLC_PREPAID_CHANNEL = '   ';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = validateDeploymentSafeguards();

      expect(result.valid).toBe(false);
      expect(() => assertDeploymentSafeguards()).toThrow(/KYANDA_KPLC_PREPAID_CHANNEL is blank/);
      consoleErrorSpy.mockRestore();
    });

    it('passes validation when kplc-prepaid is paused or hidden by default even if channel code is blank', () => {
      delete process.env.NEXT_PUBLIC_SERVICE_STATUS_KPLC_PREPAID; // defaults to 'hidden'
      delete process.env.KYANDA_KPLC_PREPAID_CHANNEL;

      const result = validateDeploymentSafeguards();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(() => assertDeploymentSafeguards()).not.toThrow();
    });
  });

  describe('KPLC Postpaid Safeguard', () => {
    it('passes validation when kplc-postpaid is paused (coming_soon default)', () => {
      delete process.env.NEXT_PUBLIC_SERVICE_STATUS_KPLC_POSTPAID; // default is 'coming_soon'
      delete process.env.KYANDA_KPLC_POSTPAID_CHANNEL;

      process.env.KYANDA_KPLC_PREPAID_CHANNEL = 'KPLC_PREPAID';
      const result = validateDeploymentSafeguards();
      expect(result.valid).toBe(true);
      expect(() => assertDeploymentSafeguards()).not.toThrow();
    });

    it('fails loudly when kplc-postpaid is manually enabled but channel code is blank', () => {
      process.env.NEXT_PUBLIC_SERVICE_STATUS_KPLC_POSTPAID = 'enabled';
      delete process.env.KYANDA_KPLC_POSTPAID_CHANNEL;
      process.env.KYANDA_KPLC_PREPAID_CHANNEL = 'KPLC_PREPAID';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = validateDeploymentSafeguards();

      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes("Service 'kplc-postpaid'"))).toBe(true);
      expect(() => assertDeploymentSafeguards()).toThrow(/FATAL DEPLOYMENT ERROR: Service 'kplc-postpaid'/);
      consoleErrorSpy.mockRestore();
    });

    it('passes validation when kplc-postpaid is enabled AND has valid channel code', () => {
      process.env.NEXT_PUBLIC_SERVICE_STATUS_KPLC_POSTPAID = 'enabled';
      process.env.KYANDA_KPLC_POSTPAID_CHANNEL = 'KPLC_POSTPAID';
      process.env.KYANDA_KPLC_PREPAID_CHANNEL = 'KPLC_PREPAID';

      const result = validateDeploymentSafeguards();
      expect(result.valid).toBe(true);
      expect(() => assertDeploymentSafeguards()).not.toThrow();
    });
  });
});
