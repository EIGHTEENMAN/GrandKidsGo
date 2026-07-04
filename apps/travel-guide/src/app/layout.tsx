import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import Header from '@/components/Header';
import AnimationStyles from '@/components/Animation';

const siteName = '童慧行走天下';
const description = '汇聚千万真实家庭的亲子旅行经验，让每一次出行都有迹可循';

export const metadata: Metadata = {
  title: { default: `${siteName} - 亲子旅行攻略`, template: `%s - ${siteName}` },
  description,
  keywords: ['亲子旅行', '亲子游', '家庭旅游', '儿童旅行', '亲子攻略', '童慧行走天下'],
  openGraph: {
    title: siteName,
    description,
    url: 'https://travel.grandand.com',
    siteName,
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Script src="/auth-check.js" strategy="beforeInteractive" />
        <Header />
        <AnimationStyles />
        {children}
        <AnalyticsTracker />
      </body>
    </html>
  );
}
