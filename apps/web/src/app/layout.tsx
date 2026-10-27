/**
 * @file layout.tsx
 * @description الهيكل الجذري للواجهة: اتجاه RTL ولغة عربية، وخط مدى للعناوين والنص.
 */
import type { Metadata } from 'next';
import { Mada } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteHeader } from '../components/site-header';
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={mada.variable}>
      <body className="min-h-screen antialiased">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          تخطَّ إلى المحتوى
        </a>
        <SiteHeader />
        <main id="content">{children}</main>
        <footer className="mt-24 border-t border-rule">
          <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-muted">
            الفيديوهات تُعرض عبر مشغّل يوتيوب الرسمي، وحقوقها لأصحاب القنوات المذكورين عند كل درس.
          </div>
        </footer>
      </body>
    </html>
  );
}
