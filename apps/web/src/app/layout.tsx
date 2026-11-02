/**
 * @file layout.tsx
 * @description الهيكل الجذري للواجهة: اتجاه RTL ولغة عربية، وخط الهوية الأساسي KOMission (واحتياطيًا IBM Plex Sans Arabic وTajawal وInter).
 */
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Inter, Tajawal } from 'next/font/google';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { GlobalLoader } from '../components/global-loader';
import { NavigationProgress } from '../components/navigation-progress';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
import { THEME_INIT_SCRIPT } from '../components/theme-toggle';
import './globals.css';

// خطوط الهوية: IBM Plex Sans Arabic للعناوين العربية، وTajawal لنص القراءة العربي، وInter للاتينية والأرقام.
// كلها مرخّصة OFL وتُحمَّل ذاتيًا عبر next/font. نكتفي بالأوزان المستخدمة فعلًا لتقليل التحميل
// (Tajawal بلا وزن 600، فيُرسم الوزن 600 بأقرب وزن متاح).
// الخط الأساسي KOMission (وزن Black وحيد): نعلن مدى الأوزان كلها ليستخدمه المتصفح لكل وزن دون تزييف عريض،
// وتبقى الخطوط أدناه احتياطًا للحروف التي لا يحتويها.
const komission = localFont({
  src: '../fonts/KOMission-Black.otf',
  weight: '100 900',
  variable: '--font-komission',
  display: 'swap',
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'قلم — مسارات تعلّم تقيس فهمك',
  description: 'منصة عربية تنظّم الدروس المبعثرة في مسار واحد، وتقيس فهمك بالتمرين، وتعدّل خطتك حسب أدائك.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1726' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${komission.variable} ${plexArabic.variable} ${tajawal.variable} ${inter.variable}`} suppressHydrationWarning>
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
        <NavigationProgress />
      </body>
    </html>
  );
}
