import { z } from 'zod';

const phoneRegex = /^(?:254|\+254|0)?([17]\d{8})$/;

export const initTransactionSchema = z.object({
  serviceSlug: z.string().min(1, 'Service is required'),
  productId: z.string().uuid('Invalid product ID').optional(),
  destination: z.string().min(1, 'Destination is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  guestPhone: z.string().regex(phoneRegex, 'Invalid Kenyan phone number').optional(),
}).refine(data => {
  // Wait, if it's airtime, it might not have productId
  return true;
});

export type InitTransactionPayload = z.infer<typeof initTransactionSchema>;

export const trackTransactionSchema = z.object({
  reference: z.string().min(1, 'Transaction reference is required'),
  phone: z.string().regex(phoneRegex, 'Invalid Kenyan phone number'),
});

export type TrackTransactionPayload = z.infer<typeof trackTransactionSchema>;
