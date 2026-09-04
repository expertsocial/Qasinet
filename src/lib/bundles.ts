export interface ParsedBundleInfo {
  allowance: string;
  validity: string;
  category: 'Daily' | 'Weekly' | 'Monthly' | 'Special';
}

export function parseBundleInfo(productName: string, price?: number): ParsedBundleInfo {
  // 1. Extract allowance: e.g. 50MB, 500 MB, 1.5GB, 10 GB, 25GB, 1TB
  const allowanceMatch = productName.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|TB))/i);
  const allowance = allowanceMatch ? allowanceMatch[1].toUpperCase() : productName;

  // 2. Extract validity: e.g. 24 Hours, 7 Days, 30 Days, 24Hrs, 7Days, 1 Month, etc.
  const validityMatch = productName.match(/(\d+\s*(?:Hours?|Hrs?|Days?|Weeks?|Months?)|24\s*Hours?|7\s*Days?|30\s*Days?|24\s*Hrs?|7\s*Days?)/i);
  let validity = validityMatch ? validityMatch[1] : 'Standard';

  // 3. Extract Category
  let category: 'Daily' | 'Weekly' | 'Monthly' | 'Special' = 'Special';
  const lower = productName.toLowerCase();
  
  if (lower.includes('daily') || lower.includes('24 hour') || lower.includes('24hr') || lower.includes('24 hours') || lower.includes('1 day')) {
    category = 'Daily';
    if (!validityMatch) validity = '24 Hours';
  } else if (lower.includes('weekly') || lower.includes('7 day') || lower.includes('7day') || lower.includes('7 days') || lower.includes('1 week')) {
    category = 'Weekly';
    if (!validityMatch) validity = '7 Days';
  } else if (lower.includes('monthly') || lower.includes('30 day') || lower.includes('30day') || lower.includes('30 days') || lower.includes('1 month')) {
    category = 'Monthly';
    if (!validityMatch) validity = '30 Days';
  } else if (lower.includes('giga') || lower.includes('special') || lower.includes('night') || lower.includes('unlimited')) {
    category = 'Special';
  }

  return {
    allowance,
    validity,
    category
  };
}
