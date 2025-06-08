import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "UniAPI 管理面板",
  description: "UniAPI 前端统计与管理应用",
    generator: 'v0.dev & melosbot'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          rel="icon"
          href="https://raw.githubusercontent.com/yym68686/uni-api/refs/heads/main/static/favicon.ico"
          type="image/x-icon"
        />
        <link
          rel="apple-touch-icon"
          href="https://raw.githubusercontent.com/yym68686/uni-api/refs/heads/main/static/apple-touch-icon.png"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
