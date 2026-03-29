export const SITE_NAME = 'Opening Book';
export const PRIMARY_SITE_URL = 'https://openingbook.xyz';
export const PRIMARY_SITE_HOST = 'openingbook.xyz';
export const LEGACY_VERCEL_HOST = 'openingbook.vercel.app';

export function buildSiteUrl(pathname = '/'): string {
  return new URL(pathname, PRIMARY_SITE_URL).toString();
}
