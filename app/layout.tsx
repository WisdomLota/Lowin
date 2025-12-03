// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LOWIN - Discover Low-Priced Cryptocurrencies',
  description: 'Track and discover cryptocurrencies priced at $0.01 or lower. Find micro-cap gems with high potential.',
  keywords: 'cryptocurrency, low price coins, micro cap, crypto tracking, penny coins',
  openGraph: {
    title: 'LOWIN - Discover Low-Priced Cryptocurrencies',
    description: 'Track and discover cryptocurrencies priced at $0.01 or lower',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LOWIN - Discover Low-Priced Cryptocurrencies',
    description: 'Track and discover cryptocurrencies priced at $0.01 or lower'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}