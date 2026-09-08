import { z } from 'zod';
import { FAIBA_BUNDLE_CODES } from '../constants/faiba-bundles';

const phoneRegex = /^(?:254|\+254|0)?([17]\d{8})$/;

export const initTransactionSchema = z.object({
  serviceSlug: z.string().min(1, 'Service is required'),
  productId: z.string().uuid('Invalid product ID').or(z.enum(FAIBA_BUNDLE_CODES)).optional(),
  destination: z.string().min(1, 'Destination is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  guestPhone: z.string().regex(phoneRegex, 'Invalid Kenyan phone number').optional(),
}).refine(data => {
  // Documented Kyanda Airtime bounds: whole number, greater than 2, less than 7000
  if (data.serviceSlug.includes('airtime') || data.serviceSlug.includes('data')) {
    if (!Number.isInteger(data.amount)) return false;
    if (data.amount <= 2 || data.amount >= 7000) return false;
  }
  return true;
}, {
  message: 'Amount must be a whole number greater than 2 and less than 7000',
  path: ['amount'],
});

export type InitTransactionPayload = z.infer<typeof initTransactionSchema>;

export const trackTransactionSchema = z.object({
  reference: z.string().min(1, 'Transaction reference is required'),
  phone: z.string().regex(phoneRegex, 'Invalid Kenyan phone number'),
});

export type TrackTransactionPayload = z.infer<typeof trackTransactionSchema>;
