/**
 * @file layout.tsx
 * @description الهيكل الجذري للواجهة: اتجاه RTL ولغة عربية، وخط مدى للعناوين والنص.
 */
import type { Metadata, Viewport } from 'next';
import { Mada } from 'next/font/google';
import type { ReactNode } from 'react';
import { GlobalLoader } from '../components/global-loader';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
import { THEME_INIT_SCRIPT } from '../components/theme-toggle';
import './globals.css';

// مدى: خط عربي هندسي نظيف قريب في روحه من خطوط الشركات الحديثة (مثل STC)،
// مرخّص OFL، ويغطي العربية واللاتينية بأوزان متعددة فنكتفي به للعناوين والنص.
const mada = Mada({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-mada',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'قلم — مسارات تعلّم تقيس فهمك',
  description: 'منصة عربية تنظّم الدروس المبعثرة في مسار واحد، وتقيس فهمك بالتمرين، وتعدّل خطتك حسب أدائك.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4fbf8' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1513' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={mada.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
        >
          تخطَّ إلى المحتوى
        </a>
        <SiteHeader />
        <main id="content">{children}</main>
        <SiteFooter />
        <GlobalLoader />
      </body>
    </html>
  );
}
