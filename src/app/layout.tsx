// 确保这是服务器组件
'use server'

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Text to Video Converter',
  description: 'Convert your text into beautiful videos with AI',
  keywords: ['text to video', 'video generation', 'AI video', 'content creation'],
  robots: 'index, follow',
  openGraph: {
    title: 'Text to Video Converter',
    description: 'Convert your text into beautiful videos with AI',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="flex flex-col min-h-screen">
          <header className="bg-white shadow-sm">
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 justify-between items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-bold text-primary-600">
                    Text to Video
                  </h1>
                </div>
              </div>
            </nav>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-white mt-auto">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="py-4 text-center text-sm text-gray-500">
                2024 Text to Video Converter. All rights reserved.
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
