/**
 * Centralized authorization check for administrative access.
 * Strict Rule: Admin access and administrative buttons appear exclusively for
 * accounts associated with qasinetltd.com (such as qasinetltd@gmail.com or *@qasinetltd.com).
 * For all other accounts, only the user dashboard is available.
 */
export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return (
    clean === 'qasinetltd@gmail.com' ||
    clean.endsWith('@qasinetltd.com') ||
    clean === 'qasinetltd.com' ||
    clean.endsWith('@qasinet.com') ||
    clean.includes('qasinetltd.com')
  );
}
