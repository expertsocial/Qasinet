export type CarrierName = 'SAFARICOM' | 'AIRTEL' | 'TELKOM' | 'EQUITEL' | 'FAIBA' | 'UNKNOWN';

export interface CarrierInfo {
  name: CarrierName;
  displayName: string;
  color: string;
  badgeBg: string;
  borderBg: string;
  logoSrc: string;
  prefix: string;
}

export function detectCarrier(phoneOrInput: string): CarrierInfo {
  if (!phoneOrInput) {
    return {
      name: 'UNKNOWN',
      displayName: 'Kenyan Mobile',
      color: '#8b5cf6',
      badgeBg: 'bg-neutral-800 text-neutral-300',
      borderBg: 'border-neutral-700',
      logoSrc: '/logos/safaricom-logo.png',
      prefix: ''
    };
  }

  const clean = phoneOrInput.replace(/\D/g, '');
  let localPhone = clean;

  if (clean.startsWith('254')) {
    localPhone = '0' + clean.slice(3);
  } else if (clean.length === 9 && (clean.startsWith('7') || clean.startsWith('1'))) {
    localPhone = '0' + clean;
  }

  const prefix4 = localPhone.slice(0, 4);
  const prefix3 = localPhone.slice(0, 3);

  // 1. AIRTEL KENYA
  // Prefixes: 073X, 078X, 0100-0106, 0750-0756
  const airtel3 = ['073', '078', '010'];
  if (airtel3.some(p => localPhone.startsWith(p))) {
    return {
      name: 'AIRTEL',
      displayName: 'Airtel',
      color: '#ef4444',
      badgeBg: 'bg-red-500/15 text-red-400 font-bold',
      borderBg: 'border-red-500/40',
      logoSrc: '/logos/airtel-logo.jpg',
      prefix: prefix3
    };
  }

  const airtel4 = ['0750', '0751', '0752', '0753', '0754', '0755', '0756'];
  if (airtel4.some(p => localPhone.startsWith(p))) {
    return {
      name: 'AIRTEL',
      displayName: 'Airtel',
      color: '#ef4444',
      badgeBg: 'bg-red-500/15 text-red-400 font-bold',
      borderBg: 'border-red-500/40',
      logoSrc: '/logos/airtel-logo.jpg',
      prefix: prefix4
    };
  }

  // 2. TELKOM KENYA
  // Prefixes: 0770-0779
  if (localPhone.startsWith('077')) {
    return {
      name: 'TELKOM',
      displayName: 'Telkom',
      color: '#06b6d4',
      badgeBg: 'bg-cyan-500/15 text-cyan-400 font-bold',
      borderBg: 'border-cyan-500/40',
      logoSrc: '/logos/telcom-logo.png',
      prefix: prefix3
    };
  }

  // 3. EQUITEL
  // Prefixes: 0763-0766
  const equitel4 = ['0763', '0764', '0765', '0766'];
  if (equitel4.some(p => localPhone.startsWith(p))) {
    return {
      name: 'EQUITEL',
      displayName: 'Equitel',
      color: '#a855f7',
      badgeBg: 'bg-purple-500/15 text-purple-400 font-bold',
      borderBg: 'border-purple-500/40',
      logoSrc: '/logos/equitel-logo.jpg',
      prefix: prefix4
    };
  }

  // 4. FAIBA 4G (Jamii Telecom)
  // Prefixes: 0747
  if (localPhone.startsWith('0747')) {
    return {
      name: 'FAIBA',
      displayName: 'Faiba 4G',
      color: '#3b82f6',
      badgeBg: 'bg-blue-500/15 text-blue-400 font-bold',
      borderBg: 'border-blue-500/40',
      logoSrc: '/logos/faiba-logo.png',
      prefix: prefix4
    };
  }

  // 5. SAFARICOM KENYA
  // Prefixes: 070X, 071X, 072X, 079X, 0110-0115, 0740-0743, 0745, 0746, 0748, 0757-0759, 0768-0769
  const safaricom3 = ['070', '071', '072', '079', '011'];
  if (safaricom3.some(p => localPhone.startsWith(p))) {
    return {
      name: 'SAFARICOM',
      displayName: 'Safaricom',
      color: '#10b981',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 font-bold',
      borderBg: 'border-emerald-500/40',
      logoSrc: '/logos/safaricom-logo.png',
      prefix: prefix3
    };
  }

  const safaricom4 = [
    '0740', '0741', '0742', '0743', '0745', '0746', '0748',
    '0757', '0758', '0759', '0768', '0769'
  ];
  if (safaricom4.some(p => localPhone.startsWith(p))) {
    return {
      name: 'SAFARICOM',
      displayName: 'Safaricom',
      color: '#10b981',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 font-bold',
      borderBg: 'border-emerald-500/40',
      logoSrc: '/logos/safaricom-logo.png',
      prefix: prefix4
    };
  }

  return {
    name: 'UNKNOWN',
    displayName: 'Kenyan Mobile',
    color: '#8b5cf6',
    badgeBg: 'bg-neutral-800 text-neutral-300 font-medium',
    borderBg: 'border-neutral-700',
    logoSrc: '/logos/safaricom-logo.png',
    prefix: ''
  };
}
