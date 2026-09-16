/**
 * src/instrumentation.ts
 * 
 * Next.js standard startup hook. Runs once when the server starts up.
 * Enforces mandatory deployment safeguards before accepting traffic.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertDeploymentSafeguards } = await import('./lib/startup-check');
    assertDeploymentSafeguards();
  }
}
