import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata = {
  title: 'Next.js + Supabase Auth',
  description: 'Modern authentication with Next.js, Supabase, and shadcn/ui',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="min-h-screen flex flex-col bg-background">
          <div className="flex-1">{children}</div>
        </div>
        <Toaster />
      </body>
    </html>
  )
}