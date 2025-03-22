import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { MainNav } from "@/components/main-nav"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Font & Color Explorer",
  description: "Explore and analyze font pairings and color combinations",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={inter.className}
        suppressHydrationWarning
        data-new-gr-c-s-check-loaded={undefined}
        data-gr-ext-installed={undefined}
      >
        <Providers>
          <div className="relative min-h-screen">
            <MainNav />
            <div className="pt-16">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}