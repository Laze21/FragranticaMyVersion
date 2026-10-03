import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { APP_NAME, APP_TAGLINE, SITE_URL } from '@/lib/config';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { MobileTabBar } from '@/components/shell/MobileTabBar';
import { DemoBanner } from '@/components/shell/DemoBanner';
import { OfflineNotice } from '@/components/shell/OfflineNotice';
import { ViewerProvider } from '@/components/viewer/ViewerProvider';
import { Toaster } from '@/components/ui/Toaster';
import '@/styles/globals.css';

/*
 * Two families, two voices. Archivo is the instrument (labels, data, buttons, nav); Newsreader is
 * the display and reading voice, italic reserved for fragrance names. Both are subset variable
 * fonts. Newsreader's opsz axis is what makes a 72px name crisp and an 18px review body sturdy,
 * so optical sizing is declared on the face itself and pinned per role in globals.css.
 * Handoff: the shipped subsets still need re-exporting with opsz 6-72 (Newsreader) and the arrow
 * range U+2190-2193, U+2197 (Archivo); until then the declaration below is inert but correct.
 */
const archivo = localFont({
  src: '../fonts/archivo-var.woff2',
  variable: '--font-archivo',
  weight: '100 900',
  display: 'swap',
  declarations: [
    { prop: 'font-stretch', value: '62% 125%' },
    { prop: 'font-optical-sizing', value: 'auto' },
  ],
  adjustFontFallback: 'Arial',
});

const newsreader = localFont({
  src: [
    { path: '../fonts/newsreader-var.woff2', style: 'normal', weight: '200 800' },
    { path: '../fonts/newsreader-var-italic.woff2', style: 'italic', weight: '200 800' },
  ],
  variable: '--font-newsreader',
  display: 'swap',
  declarations: [{ prop: 'font-optical-sizing', value: 'auto' }],
  adjustFontFallback: 'Times New Roman',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${APP_NAME}: ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description:
    'A fragrance database, collection tracker and community. What a fragrance smells like in plain words, how long it lasts, when to wear it, and what people actually smell.',
  applicationName: APP_NAME,
  openGraph: { siteName: APP_NAME, type: 'website' },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#f3f0ea',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${newsreader.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <ViewerProvider>
          <OfflineNotice />
          <DemoBanner />
          <SiteHeader />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
          <MobileTabBar />
          <Toaster />
        </ViewerProvider>
      </body>
    </html>
  );
}
