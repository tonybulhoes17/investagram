import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title:       'Investagram — A rede social dos investidores',
  description: 'Compartilhe teses, movimentações e carteiras. Conecte-se com investidores.',
  keywords:    'investimentos, ações, cripto, carteira, rede social, investidores',
  openGraph: {
    title:       'Investagram',
    description: 'A rede social dos investidores',
    type:        'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1A1F2E',
              color:      '#fff',
              border:     '1px solid #2D3748',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#00C896', secondary: '#0F1117' } },
          }}
        />
      </body>
    </html>
  )
}
