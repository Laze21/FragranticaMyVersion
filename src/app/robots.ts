import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/shelf', '/diary', '/api/', '/sign-in', '/sign-up', '/contribute'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
