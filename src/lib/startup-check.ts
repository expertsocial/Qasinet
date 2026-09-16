/**
 * src/lib/startup-check.ts
 * 
 * Deployment & Startup Safeguards
 * 
 * Prevents silent broken deployments where a service is enabled in the registry
 * but its critical gateway channel code or configuration is missing in the environment.
 * 
 * Specifically addresses the KPLC incident:
 * Real customer payment succeeded, but vending failed with:
 * "Electricity service channel is not currently configured"
 * because KYANDA_KPLC_PREPAID_CHANNEL was blank in production while the service was enabled.
 */

import { isServiceEnabled } from './services/registry';
import { getKplcChannelCode } from './providers/kyanda/paybill-config';

export interface SafeguardCheckResult {
  valid: boolean;
  errors: string[];
}

export function validateDeploymentSafeguards(): SafeguardCheckResult {
  const errors: string[] = [];

  // Check 1: KPLC Prepaid
  if (isServiceEnabled('kplc-prepaid')) {
    const channel = getKplcChannelCode('prepaid');
    if (!channel || channel.trim() === '') {
      errors.push(
        "FATAL DEPLOYMENT ERROR: Service 'kplc-prepaid' is set to 'enabled' in the service registry, " +
        "but KYANDA_KPLC_PREPAID_CHANNEL is blank in the environment! " +
        "Deploying this will cause customer payments to succeed while token vending fails. " +
        "Set KYANDA_KPLC_PREPAID_CHANNEL (e.g. 'KPLC_PREPAID') in environment variables or pause kplc-prepaid in the registry."
      );
    }
  }

  // Check 2: KPLC Postpaid
  if (isServiceEnabled('kplc-postpaid')) {
    const channel = getKplcChannelCode('postpaid');
    if (!channel || channel.trim() === '') {
      errors.push(
        "FATAL DEPLOYMENT ERROR: Service 'kplc-postpaid' is set to 'enabled' in the service registry, " +
        "but KYANDA_KPLC_POSTPAID_CHANNEL is blank in the environment! " +
        "Set KYANDA_KPLC_POSTPAID_CHANNEL in environment variables or pause kplc-postpaid in the registry."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Asserts all deployment safeguards.
 * Throws a fatal Error immediately if any enabled service lacks its required environment configuration.
 */
export function assertDeploymentSafeguards(): void {
  const result = validateDeploymentSafeguards();
  if (!result.valid) {
    const message = result.errors.join('\n\n');
    console.error('\n' + '='.repeat(80));
    console.error('❌ QASINET DEPLOYMENT SAFEGUARD ENFORCEMENT FAILED:');
    console.error(message);
    console.error('='.repeat(80) + '\n');
    throw new Error(message);
  }
}
