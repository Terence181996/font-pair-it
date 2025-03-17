"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

interface HSVColor {
  h: number
  s: number
  v: number
}

// Expanded list of preset colors grouped by theme
const colorPresets = {
  light: [
    "#ffffff", // White
    "#f8f9fa", // Light gray
    "#e9ecef", // Lighter gray
    "#f8f0e3", // Cream
    "#edf2ff", // Light blue
    "#f3f0ff", // Light purple
    "#fff3bf", // Light yellow
    "#d8f5a2", // Light green
    "#ffe3e3", // Light red
    "#fffbe6", // Light beige
  ],
  dark: [
    "#1e1e1e", // Dark mode background
    "#212529", // Dark gray
    "#343a40", // Medium dark gray
    "#190425", // Dark purple
    "#1a2e35", // Dark teal
    "#121212", // Almost black
    "#2b2b2b", // Charcoal
    "#1c1f24", // Gray/blue dark
    "#1a1b1e", // Slate dark
    "#282c34", // VS Code dark theme
  ],
  colorful: [
    "#ff7a00", // Orange
    "#0af", // Bright blue
    "#ff0066", // Pink
    "#02ccba", // Turquoise
    "#8a2be2", // Violet
    "#1da1f2", // Twitter blue
    "#6c4bf4", // Purple
    "#00c16e", // Green
    "#5f27cd", // Indigo
    "#fd9644", // Light orange
  ],
  pastels: [
    "#ffcdd2", // Pastel red
    "#f8bbd0", // Pastel pink
    "#e1bee7", // Pastel purple
    "#bbdefb", // Pastel blue
    "#b2dfdb", // Pastel teal
    "#c8e6c9", // Pastel green
    "#ffecb3", // Pastel yellow
    "#ffccbc", // Pastel orange
    "#d7ccc8", // Pastel brown
    "#cfd8dc", // Pastel gray
  ]
}

// Convert hex to HSV
const hexToHsv = (hex: string): HSVColor => {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse the hex values
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = max === 0 ? 0 : delta / max;
  let v = max;

  if (delta === 0) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / delta) % 6;
  } else if (max === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  return { h, s, v };
};

// Convert HSV to hex
const hsvToHex = (hsv: HSVColor): string => {
  const { h, s, v } = hsv;
  
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - chroma;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    [r, g, b] = [chroma, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, chroma, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, chroma, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, chroma];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, chroma];
  } else {
    [r, g, b] = [chroma, 0, x];
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("light") 
  const [hsv, setHsv] = useState<HSVColor>(() => hexToHsv(color || '#ffffff'));
  const [hexValue, setHexValue] = useState(color || '#ffffff');
  const colorAreaRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);

  // Update hex value when HSV changes
  useEffect(() => {
    const newHexValue = hsvToHex(hsv);
    setHexValue(newHexValue);
    onChange(newHexValue);
  }, [hsv, onChange]);

  // Update HSV when hex input changes
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexValue(value);
    
    // Only update HSV if it's a valid hex color
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setHsv(hexToHsv(value));
    }
  };

  // Handle color area mouse interactions
  const handleColorAreaInteraction = useCallback((event: MouseEvent) => {
    if (!colorAreaRef.current) return;
    
    const rect = colorAreaRef.current.getBoundingClientRect();
    let x = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
    let y = Math.min(Math.max(0, event.clientY - rect.top), rect.height);
    
    const s = x / rect.width;
    const v = 1 - (y / rect.height);
    
    setHsv(prev => ({ ...prev, s, v }));
  }, []);

  // Handle hue slider mouse interactions
  const handleHueSliderInteraction = useCallback((event: MouseEvent) => {
    if (!hueSliderRef.current) return;
    
    const rect = hueSliderRef.current.getBoundingClientRect();
    let x = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
    
    const h = (x / rect.width) * 360;
    
    setHsv(prev => ({ ...prev, h }));
  }, []);

  // Setup and remove event listeners for mouse movement
  const setupGlobalMouseHandlers = useCallback((
    handler: (event: MouseEvent) => void
  ) => {
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handler(e);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start font-normal">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded border" style={{ backgroundColor: hexValue }} />
            <span>{hexValue}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Pick a color</h4>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-md"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="light">Light</TabsTrigger>
                <TabsTrigger value="dark">Dark</TabsTrigger>
                <TabsTrigger value="colorful">Vibrant</TabsTrigger>
                <TabsTrigger value="pastels">Pastels</TabsTrigger>
              </TabsList>
              
              {Object.entries(colorPresets).map(([category, colors]) => (
                <TabsContent key={category} value={category} className="mt-2">
                  <div className="grid grid-cols-5 gap-2">
                    {colors.map((presetColor) => (
                      <button
                        key={presetColor}
                        className={cn(
                          "h-8 w-8 rounded-md border transition-all hover:scale-110",
                          color === presetColor && "ring-2 ring-ring ring-offset-2",
                          presetColor === "#ffffff" && "border-gray-200"
                        )}
                        style={{ backgroundColor: presetColor }}
                        onClick={() => {
                          onChange(presetColor)
                          setIsOpen(false)
                        }}
                        title={presetColor}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Recently Used</h4>
            <div className="grid grid-cols-5 gap-2">
              {[
                "#1e1e1e", // Dark
                "#ffffff", // White
                "#dddddd", // Light gray
                "#ff0000", // Red
                "#0000ff", // Blue
              ].map((recentColor) => (
                <button
                  key={recentColor}
                  className={cn(
                    "h-6 w-6 rounded-md border",
                    color === recentColor && "ring-2 ring-ring ring-offset-2",
                    recentColor === "#ffffff" && "border-gray-200"
                  )}
                  style={{ backgroundColor: recentColor }}
                  onClick={() => {
                    onChange(recentColor)
                    setIsOpen(false)
                  }}
                />
              ))}
            </div>
          </div>

          {/* Color area (saturation and value) */}
          <div 
            ref={colorAreaRef}
            className="relative h-40 w-full rounded-md cursor-crosshair overflow-hidden"
            style={{
              background: `linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
              backgroundImage: `
                linear-gradient(to top, #000, transparent),
                linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))
              `,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              handleColorAreaInteraction(e.nativeEvent);
              setupGlobalMouseHandlers(handleColorAreaInteraction);
            }}
          >
            {/* Color selection marker */}
            <div 
              className="absolute h-4 w-4 rounded-full border-2 border-white shadow-sm pointer-events-none"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>

          {/* Hue slider */}
          <div 
            ref={hueSliderRef}
            className="relative h-6 w-full rounded-md cursor-pointer overflow-hidden"
            style={{
              background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              handleHueSliderInteraction(e.nativeEvent);
              setupGlobalMouseHandlers(handleHueSliderInteraction);
            }}
          >
            {/* Hue selection marker */}
            <div 
              className="absolute h-6 w-4 bg-white opacity-30 transform -translate-x-1/2 pointer-events-none"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
              }}
            />
            <div 
              className="absolute h-6 w-1 border-2 border-white transform -translate-x-1/2 pointer-events-none"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
              }}
            />
          </div>

          {/* Hex input */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Hex:</span>
            <input
              type="text"
              value={hexValue}
              onChange={handleHexChange}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

