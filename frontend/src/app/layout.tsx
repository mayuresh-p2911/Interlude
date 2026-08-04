import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'INTERLUDE — Watch Together, Stay Together',
    template: '%s | INTERLUDE',
  },
  description:
    'INTERLUDE is a premium social movie streaming platform. Watch movies together with friends in real-time synchronized sessions.',
  keywords: ['streaming', 'movies', 'watch together', 'social', 'cinema'],
  authors: [{ name: 'INTERLUDE Team' }],
  creator: 'INTERLUDE',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'INTERLUDE — Watch Together, Stay Together',
    description: 'Premium social movie streaming platform.',
    siteName: 'INTERLUDE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'INTERLUDE — Watch Together, Stay Together',
    description: 'Premium social movie streaming platform.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head />
      <body className="bg-black-midnight text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
