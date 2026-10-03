/**
 * The product name is NOT final (see docs/03-naming.md). Everything user-facing reads it from
 * here so a rename is one environment variable, not a refactor.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Wake';
export const APP_TAGLINE = 'Fragrance, understood.';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
/** Shown wherever demo content appears. Set NEXT_PUBLIC_DEMO_MODE=0 once real data is loaded. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== '0';
