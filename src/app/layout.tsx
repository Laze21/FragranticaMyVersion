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

const archivo = localFont({
  src: '../fonts/archivo-var.woff2',
  variable: '--font-archivo',
  weight: '100 900',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
  adjustFontFallback: 'Arial',
});

const newsreader = localFont({
  src: [
    { path: '../fonts/newsreader-var.woff2', style: 'normal', weight: '200 800' },
    { path: '../fonts/newsreader-var-italic.woff2', style: 'italic', weight: '200 800' },
  ],
  variable: '--font-newsreader',
  display: 'swap',
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
  themeColor: '#f2f0eb',
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
