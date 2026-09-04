export type BeneficiaryType = 'phone' | 'electricity' | 'tv' | 'internet' | 'water';

export interface Beneficiary {
  id: string;
  name: string;
  type: BeneficiaryType;
  provider: string; // e.g., 'Safaricom', 'Airtel', 'KPLC', 'DStv', 'Zuku'
  accountNumber: string; // Phone number, Meter number, Smartcard number, Account ID
  createdAt: string;
  lastUsedAt?: string;
}

const STORAGE_KEY = 'qasinet_saved_beneficiaries';
const RECENT_DESTINATIONS_KEY = 'qasinet_recent_destinations';

/**
 * Gets local or cached beneficiaries
 */
export function getLocalBeneficiaries(): Beneficiary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local beneficiaries:', e);
    return [];
  }
}

/**
 * Saves beneficiaries locally
 */
export function saveLocalBeneficiaries(list: Beneficiary[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local beneficiaries:', e);
  }
}

/**
 * Remembers the last-used destination for a service type (e.g. 'airtime', 'data', 'electricity')
 */
export function rememberServiceDestination(serviceType: string, destination: string, provider?: string): void {
  if (typeof window === 'undefined' || !destination) return;
  try {
    const raw = localStorage.getItem(RECENT_DESTINATIONS_KEY);
    const recents: Record<string, { destination: string; provider?: string; timestamp: number }> = raw ? JSON.parse(raw) : {};
    recents[serviceType.toLowerCase()] = {
      destination,
      provider,
      timestamp: Date.now()
    };
    localStorage.setItem(RECENT_DESTINATIONS_KEY, JSON.stringify(recents));
  } catch (e) {
    console.error('Error remembering service destination:', e);
  }
}

/**
 * Gets the last-used destination for a service type
 */
export function getRememberedServiceDestination(serviceType: string): { destination: string; provider?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RECENT_DESTINATIONS_KEY);
    if (!raw) return null;
    const recents = JSON.parse(raw);
    const match = recents[serviceType.toLowerCase()];
    if (match && match.destination) {
      return { destination: match.destination, provider: match.provider };
    }
  } catch (e) {
    console.error('Error reading remembered service destination:', e);
  }
  return null;
}
