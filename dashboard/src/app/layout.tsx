import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Caddy Dashboard',
  description: 'Local HTTPS services dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
