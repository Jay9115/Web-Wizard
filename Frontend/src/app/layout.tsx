import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Student Portal - WebWizard',
  description: 'A modern student portal with role-based management system',
  keywords: 'student, portal, education, management, authentication',
  authors: [{ name: 'WebWizard Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#007AFF',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800">
        <div id="root">
          {children}
        </div>
        <div id="modal-root"></div>
      </body>
    </html>
  )
}