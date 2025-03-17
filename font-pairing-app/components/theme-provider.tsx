'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  // Wait until mounted to render with theme props to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return children only without theme provider to avoid hydration mismatch
    return <>{children}</>
  }

  // Override props to fix hydration issues
  const safeProps = {
    ...props,
    enableSystem: false,
    enableColorScheme: false,
    attribute: "class",
    defaultTheme: "light",
  }

  return <NextThemesProvider {...safeProps}>{children}</NextThemesProvider>
}
