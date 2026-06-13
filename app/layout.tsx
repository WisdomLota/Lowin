import type { Metadata } from 'next'
import { Montserrat, Rajdhani } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-heading' })
const rajdhani = Rajdhani({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'LOWIN — Crypto Discovery, Trading Journal & Investment Tracker',
  description: 'Discover sub-penny cryptocurrencies, journal your trades, track investments and monitor your portfolio performance in real time.',
  icons: {
    icon: '/lowinBrandLogo.png',
    shortcut: '/lowinBrandLogo.png',
    apple: '/lowinBrandLogo.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${montserrat.variable} ${rajdhani.variable} font-(family-name:--font-body) bg-[#0F0800] text-white antialiased`}>
        <Providers>{children}</Providers>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a0f00',
              border: '1px solid rgba(135,71,8,0.2)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  )
}