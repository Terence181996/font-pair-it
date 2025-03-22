import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Settings2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function ColorSettings() {
  const [primaryColor, setPrimaryColor] = React.useState("#4F46E5") // Default primary color
  const [accentColor, setAccentColor] = React.useState("#818CF8") // Default accent color

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  // Calculate contrast ratio
  const getContrastRatio = (l1: number, l2: number) => {
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  }

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }

  const updateCssVariable = (variable: string, color: string) => {
    const { r, g, b } = hexToRgb(color)
    
    // Calculate luminance and determine text color
    const luminance = getLuminance(r, g, b)
    const whiteLuminance = getLuminance(255, 255, 255)
    const blackLuminance = getLuminance(0, 0, 0)
    
    const whiteContrast = getContrastRatio(luminance, whiteLuminance)
    const blackContrast = getContrastRatio(luminance, blackLuminance)
    
    // Set text color based on contrast
    const textColor = whiteContrast > blackContrast ? "255 255 255" : "0 0 0"
    
    // Convert to HSL for the primary/accent color
    const max = Math.max(r, g, b) / 255
    const min = Math.min(r, g, b) / 255
    let h, s, l = (max + min) / 2

    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r / 255: h = (g / 255 - b / 255) / d + (g < b ? 6 : 0); break
        case g / 255: h = (b / 255 - r / 255) / d + 2; break
        case b / 255: h = (r / 255 - g / 255) / d + 4; break
        default: h = 0
      }
      h /= 6
    }

    const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
    
    // Update the CSS variables
    document.documentElement.style.setProperty(variable, hsl)
    if (variable === "--primary") {
      document.documentElement.style.setProperty("--primary-foreground", textColor)
    }
    if (variable === "--accent") {
      document.documentElement.style.setProperty("--accent-foreground", textColor)
    }
  }

  const handlePrimaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setPrimaryColor(color)
    updateCssVariable("--primary", color)
  }

  const handleAccentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setAccentColor(color)
    updateCssVariable("--accent", color)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings2 className="h-4 w-4" />
          <span className="sr-only">Color settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Customize Colors</h4>
            <p className="text-sm text-muted-foreground">
              Adjust the primary and accent colors of the interface.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="primary">Primary Color (CTA)</Label>
                <div className="flex items-center gap-2">
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full border",
                      "bg-primary text-primary-foreground flex items-center justify-center text-[10px]"
                    )} 
                  >
                    Aa
                  </div>
                  <input
                    id="primary"
                    type="color"
                    value={primaryColor}
                    onChange={handlePrimaryChange}
                    className="w-10 h-8 p-0 border rounded-md cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="accent">Accent Color</Label>
                <div className="flex items-center gap-2">
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full border",
                      "bg-accent text-accent-foreground flex items-center justify-center text-[10px]"
                    )} 
                  >
                    Aa
                  </div>
                  <input
                    id="accent"
                    type="color"
                    value={accentColor}
                    onChange={handleAccentChange}
                    className="w-10 h-8 p-0 border rounded-md cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 