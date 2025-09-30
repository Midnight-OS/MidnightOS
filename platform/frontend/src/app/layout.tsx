import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { QueryProvider } from '@/lib/query-client'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'


export const metadata: Metadata = {
  title: 'MidnightOS - Blockchain Bot Platform',
  description: 'Deploy AI-powered bots with blockchain capabilities to Discord, Telegram, and more without any coding experience.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <div className="relative min-h-screen">
                {children}
              </div>
              <Toaster position="top-right" />
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}