export type CarrierName = 'SAFARICOM' | 'AIRTEL' | 'TELKOM' | 'UNKNOWN';

export interface CarrierInfo {
  name: CarrierName;
  displayName: string;
  color: string;
  badgeBg: string;
  borderBg: string;
  prefix: string;
}

export function detectCarrier(phoneOrInput: string): CarrierInfo {
  const clean = phoneOrInput.replace(/\D/g, '');
  let localPhone = clean;

  if (clean.startsWith('254')) {
    localPhone = '0' + clean.slice(3);
  } else if (clean.startsWith('+254')) {
    localPhone = '0' + clean.slice(4);
  }

  const prefix = localPhone.slice(0, 4);
  const prefix3 = localPhone.slice(0, 3);

  // Safaricom Prefixes: 070X, 071X, 072X, 079X, 0740-0743, 0745-0746, 0748, 0757-0759, 0768-0769, 0110-0115
  const safaricom2 = ['070', '071', '072', '079', '011'];
  if (safaricom2.some(p => localPhone.startsWith(p))) {
    return {
      name: 'SAFARICOM',
      displayName: 'Safaricom',
      color: '#10b981', // emerald-500
      badgeBg: 'bg-emerald-500/10 text-emerald-400',
      borderBg: 'border-emerald-500/30',
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
      badgeBg: 'bg-emerald-500/10 text-emerald-400',
      borderBg: 'border-emerald-500/30',
      prefix
    };
  }

  // Airtel Prefixes: 073X, 0750-0756, 078X, 0100-0106
  const airtel2 = ['073', '078', '010'];
  if (airtel2.some(p => localPhone.startsWith(p))) {
    return {
      name: 'AIRTEL',
      displayName: 'Airtel',
      color: '#ef4444', // red-500
      badgeBg: 'bg-red-500/10 text-red-400',
      borderBg: 'border-red-500/30',
      prefix: prefix3
    };
  }

  const airtel4 = ['0750', '0751', '0752', '0753', '0754', '0755', '0756'];
  if (airtel4.some(p => localPhone.startsWith(p))) {
    return {
      name: 'AIRTEL',
      displayName: 'Airtel',
      color: '#ef4444',
      badgeBg: 'bg-red-500/10 text-red-400',
      borderBg: 'border-red-500/30',
      prefix
    };
  }

  // Telkom Prefixes: 077X
  if (localPhone.startsWith('077')) {
    return {
      name: 'TELKOM',
      displayName: 'Telkom',
      color: '#06b6d4', // cyan-500
      badgeBg: 'bg-cyan-500/10 text-cyan-400',
      borderBg: 'border-cyan-500/30',
      prefix: prefix3
    };
  }

  return {
    name: 'UNKNOWN',
    displayName: 'Kenyan Mobile',
    color: '#8b5cf6',
    badgeBg: 'bg-neutral-800 text-neutral-300',
    borderBg: 'border-neutral-700',
    prefix: ''
  };
}
