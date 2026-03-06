import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { OneSignalInit } from '@/components/OneSignalInit'

export const metadata: Metadata = {
  title:       'Investagram — A rede social dos investidores',
  description: 'Compartilhe teses, movimentações e carteiras. Conecte-se com investidores.',
  keywords:    'investimentos, ações, cripto, carteira, rede social, investidores',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:           true,
    statusBarStyle:    'black-translucent',
    title:             'Investagram',
  },
  openGraph: {
    title:       'Investagram',
    description: 'A rede social dos investidores',
    type:        'website',
  },
  icons: {
    icon:  '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor:           '#00C896',
  width:                'device-width',
  initialScale:         1,
  maximumScale:         1,
  userScalable:         false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <OneSignalInit />
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background:   '#1A1F2E',
              color:        '#fff',
              border:       '1px solid #2D3748',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#00C896', secondary: '#0F1117' } },
          }}
        />
      </body>
    </html>
  )
}
