"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Inter,
  Roboto_Serif,
  Playfair_Display,
  Montserrat,
  Open_Sans,
  Lora,
  Raleway,
  Merriweather,
} from "next/font/google"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Copy, Download, Share2, Smartphone, Monitor, RefreshCw, Check, ChevronsUpDown, Search, Moon, Sun } from "lucide-react"
import FontPairCard from "@/components/font-pair-card"
import ColorPicker from "@/components/color-picker"
import { cn } from "@/lib/utils"
import { 
  loadAndInjectFont, 
  fetchAllGoogleFonts, 
  generateFontPairing, 
  GoogleFontItem,
  calculateFontContrast 
} from "@/lib/fonts"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useTheme } from "next-themes"

// Initialize with Next.js fonts for SSR compatibility
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: "swap"
})
const robotoSerif = Roboto_Serif({ 
  subsets: ["latin"], 
  variable: "--font-roboto-serif",
  display: "swap"
})
const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: "--font-playfair",
  display: "swap"
})
const montserrat = Montserrat({ 
  subsets: ["latin"], 
  variable: "--font-montserrat",
  display: "swap"
})
const openSans = Open_Sans({ 
  subsets: ["latin"], 
  variable: "--font-open-sans",
  display: "swap"
})
const lora = Lora({ 
  subsets: ["latin"], 
  variable: "--font-lora",
  display: "swap"
})
const raleway = Raleway({ 
  subsets: ["latin"], 
  variable: "--font-raleway",
  display: "swap"
})
const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  variable: "--font-merriweather",
  subsets: ["latin"],
  display: "swap"
})

// Initial font pairs for SSR
const initialFontPairs = [
  {
    name: "Classic Professional",
    heading: { font: playfair, name: "Playfair Display" },
    body: { font: openSans, name: "Open Sans" },
    category: "Professional",
  },
  {
    name: "Modern Minimal",
    heading: { font: montserrat, name: "Montserrat" },
    body: { font: robotoSerif, name: "Roboto Serif" },
    category: "Modern",
  },
  {
    name: "Elegant Contrast",
    heading: { font: playfair, name: "Playfair Display" },
    body: { font: raleway, name: "Raleway" },
    category: "Elegant",
  },
  {
    name: "Clean Corporate",
    heading: { font: raleway, name: "Raleway" },
    body: { font: openSans, name: "Open Sans" },
    category: "Professional",
  },
  {
    name: "Editorial Style",
    heading: { font: merriweather, name: "Merriweather" },
    body: { font: openSans, name: "Open Sans" },
    category: "Editorial",
  },
  {
    name: "Creative Contrast",
    heading: { font: lora, name: "Lora" },
    body: { font: montserrat, name: "Montserrat" },
    category: "Creative",
  },
]

// Define interfaces for font components
interface FontInfo {
  name: string;
  font: any; // Using any since we mix Next.js font objects and null for dynamic fonts
}

interface FontPair {
  name: string;
  heading: FontInfo;
  body: FontInfo;
  category: string;
}

// Helper function to get unique fonts (maintain UI compatibility)
const getUniqueFonts = (fontPairs: FontPair[], type: 'heading' | 'body'): FontInfo[] => {
  const uniqueFonts: FontInfo[] = []
  const fontNames = new Set<string>()

  fontPairs.forEach((pair) => {
    const font = type === "heading" ? pair.heading : pair.body
    if (!fontNames.has(font.name)) {
      fontNames.add(font.name)
      uniqueFonts.push(font)
    }
  })

  return uniqueFonts
}

// Convert Google Font item to internal format
const convertGoogleFontToInternal = (googleFont: GoogleFontItem | null): FontInfo | null => {
  if (!googleFont) return null;
  return {
    name: googleFont.family,
    // No font object for dynamic fonts - we load them directly
    font: null
  };
};

// Add contrast calculation helper function
const calculateContrastYIQ = (hexcolor: string) => {
  // If no hex color or invalid format, return black
  if (!hexcolor || !hexcolor.startsWith("#") || hexcolor.length < 7) {
    return "dark";
  }
  
  // Remove the # symbol
  hexcolor = hexcolor.slice(1);
  
  // Convert to RGB
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  
  // Calculate YIQ ratio
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Return black or white based on YIQ threshold
  return yiq >= 128 ? "light" : "dark";
}

export default function Home() {
  // State variables for the current font pairing
  const [headingFont, setHeadingFont] = useState({ name: "Playfair Display", font: playfair })
  const [bodyFont, setBodyFont] = useState({ name: "Open Sans", font: openSans })
  const [contrastValue, setContrastValue] = useState(50)
  const [bgColor, setBgColor] = useState("#ffffff")
  const [isMobileView, setIsMobileView] = useState(false)
  const [headingSize, setHeadingSize] = useState(48)
  const [bodySize, setBodySize] = useState(16)
  const [subheadingSize, setSubheadingSize] = useState(24)
  const [category, setCategory] = useState("All")
  
  // Dynamic Google Fonts state
  const [googleFonts, setGoogleFonts] = useState<GoogleFontItem[]>([])
  const [dynamicFontPairs, setDynamicFontPairs] = useState<FontPair[]>([])
  const [loadingFonts, setLoadingFonts] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  // Initialize state with the static fonts for SSR compatibility
  const [displayedFontPairs, setDisplayedFontPairs] = useState<FontPair[]>(initialFontPairs)
  const [uniqueHeadingFonts, setUniqueHeadingFonts] = useState(() => getUniqueFonts(initialFontPairs, "heading"))
  const [uniqueBodyFonts, setUniqueBodyFonts] = useState(() => getUniqueFonts(initialFontPairs, "body"))
  
  // Add state for combobox open/search state
  const [headingFontOpen, setHeadingFontOpen] = useState(false)
  const [bodyFontOpen, setBodyFontOpen] = useState(false)
  const [headingFontSearch, setHeadingFontSearch] = useState("")
  const [bodyFontSearch, setBodyFontSearch] = useState("")
  
  // Add new state for font category
  const [fontCategory, setFontCategory] = useState("All")
  
  // Add theme toggle functionality
  const { theme, setTheme } = useTheme()
  
  // Reset background color based on theme
  const resetBgColor = () => {
    setBgColor(theme === 'dark' ? '#1e1e1e' : '#ffffff')
  }
  
  // Update background color when theme changes
  useEffect(() => {
    resetBgColor()
  }, [theme])
  
  // Safely mount component
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Load all Google Fonts on initial render and set up dynamic font pairs
  useEffect(() => {
    if (!isMounted) return;
    
    const loadGoogleFontsList = async () => {
      setLoadingFonts(true)
      try {
        // Fetch all Google Fonts
        const fonts = await fetchAllGoogleFonts()
        setGoogleFonts(fonts)
        
        // Generate 10 dynamic font pairs with varying contrast levels
        const newPairs = []
        for (let i = 0; i < 10; i++) {
          // Use different contrast levels for variety
          const contrast = 20 + (i * 6)
          const pair = await generateFontPairing(fonts, contrast)
          if (pair) {
            const internalPair = {
              name: pair.name,
              heading: convertGoogleFontToInternal(pair.heading),
              body: convertGoogleFontToInternal(pair.body),
              category: getCategory(contrast),
            }
            newPairs.push(internalPair)
            
            // Preload these fonts
            await Promise.all([
              loadAndInjectFont(pair.heading.family),
              loadAndInjectFont(pair.body.family)
            ])
          }
        }
        
        // Combine with initial pairs for a smoother experience
        const combinedPairs = [...initialFontPairs, ...newPairs]
        setDynamicFontPairs(newPairs)
        setDisplayedFontPairs(combinedPairs)
        
        // Update unique fonts
        setUniqueHeadingFonts(getUniqueFonts(combinedPairs, "heading"))
        setUniqueBodyFonts(getUniqueFonts(combinedPairs, "body"))
      } catch (error) {
        console.error("Error loading Google Fonts:", error)
      } finally {
        setLoadingFonts(false)
      }
    }
    
    loadGoogleFontsList()
  }, [isMounted])
  
  // Load current fonts
  useEffect(() => {
    if (!isMounted) return;
    
    const loadFonts = async () => {
      try {
        // Show loading state if needed
        setLoadingFonts(true)
        
        // Load both fonts in parallel
        await Promise.all([
          loadAndInjectFont(headingFont.name),
          loadAndInjectFont(bodyFont.name)
        ])
      } catch (error) {
        console.error("Error loading fonts:", error)
      } finally {
        setLoadingFonts(false)
      }
    }
    
    loadFonts()
  }, [headingFont.name, bodyFont.name, isMounted])
  
  // Helper function to get category based on contrast
  const getCategory = (contrast: number): string => {
    if (contrast >= 70) return "High Contrast";
    if (contrast >= 40) return "Balanced";
    return "Harmonious";
  }
  
  // Handle selecting a font pair
  const handleSelect = (pair: FontPair) => {
    setHeadingFont(pair.heading)
    setBodyFont(pair.body)
    if (!isMounted) return;
    
    const previewSection = document.getElementById("preview-section")
    if (previewSection) {
      previewSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Enhanced generate button function with loading state
  const generatePairing = async () => {
    if (isGenerating || googleFonts.length === 0) return

    setIsGenerating(true)
    
    try {
      // Get a new pairing based on contrast and category
      const normalizedContrast = contrastValue / 100
      const newPairing = await generateFontPairing(
        googleFonts, 
        normalizedContrast, 
        headingFont.name, 
        fontCategory !== "All" ? fontCategory : undefined
      )

      if (newPairing) {
        const heading = newPairing.heading
        const body = newPairing.body

        // Load and inject the fonts
        const headingFontName = await loadAndInjectFont(heading)
        const bodyFontName = await loadAndInjectFont(body)

        // Set the new fonts
        setHeadingFont({ name: headingFontName, font: null })
        setBodyFont({ name: bodyFontName, font: null })

        // Add to unique fonts lists if not already present
        if (!uniqueHeadingFonts.some(f => f.name === headingFontName)) {
          setUniqueHeadingFonts(prev => [...prev, { name: headingFontName, font: null }])
        }
        if (!uniqueBodyFonts.some(f => f.name === bodyFontName)) {
          setUniqueBodyFonts(prev => [...prev, { name: bodyFontName, font: null }])
        }

        // Scroll to preview section
        const previewSection = document.getElementById("preview-section")
        if (previewSection) {
          previewSection.scrollIntoView({ behavior: "smooth" })
        }
      }
    } catch (error) {
      console.error("Error generating font pairing:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Filter font pairs by category
  const filteredPairs = category === "All" 
    ? displayedFontPairs 
    : displayedFontPairs.filter((pair) => pair.category === category);
  
  // Handle contrast slider change
  const handleContrastChange = (value: number[]) => {
    setContrastValue(value[0])
  }
  
  // Filter fonts based on search query - fix to combine both static and Google fonts
  const filteredHeadingFonts = useMemo(() => {
    const searchTerm = headingFontSearch?.toLowerCase() || "";
    // Include both pre-defined fonts and dynamically loaded Google fonts
    const allFonts = [...uniqueHeadingFonts];
    
    // Add any Google fonts that aren't already in uniqueHeadingFonts
    if (googleFonts?.length > 0) {
      googleFonts.forEach(font => {
        if (font?.family && !allFonts.some(f => f?.name === font.family)) {
          allFonts.push({ name: font.family, font: null });
        }
      });
    }
    
    return allFonts.filter(font => font?.name && font.name.toLowerCase().includes(searchTerm));
  }, [uniqueHeadingFonts, googleFonts, headingFontSearch]);
  
  const filteredBodyFonts = useMemo(() => {
    const searchTerm = bodyFontSearch?.toLowerCase() || "";
    // Include both pre-defined fonts and dynamically loaded Google fonts
    const allFonts = [...uniqueBodyFonts];
    
    // Add any Google fonts that aren't already in uniqueBodyFonts
    if (googleFonts?.length > 0) {
      googleFonts.forEach(font => {
        if (font?.family && !allFonts.some(f => f?.name === font.family)) {
          allFonts.push({ name: font.family, font: null });
        }
      });
    }
    
    return allFonts.filter(font => font?.name && font.name.toLowerCase().includes(searchTerm));
  }, [uniqueBodyFonts, googleFonts, bodyFontSearch]);
  
  // Calculate text color based on background color
  const getTextColor = (bgColor: string, textType: "heading" | "body") => {
    const bgContrast = calculateContrastYIQ(bgColor);
    
    if (theme === "dark") {
      // Dark theme
      if (bgContrast === "dark") {
        // Dark background, light text
        return textType === "heading" ? "#ffffff" : "#e0e0e0";
      } else {
        // Light background, dark text in dark mode
        return textType === "heading" ? "#000000" : "#333333";
      }
    } else {
      // Light theme
      if (bgContrast === "dark") {
        // Dark background, light text
        return textType === "heading" ? "#ffffff" : "#e0e0e0";
      } else {
        // Light background, dark text
        return textType === "heading" ? "#000000" : "#333333";
      }
    }
  }
  
  // Add a font download function
  const downloadFont = async (fontName: string) => {
    try {
      // Use the specimen URL format with the font name
      const downloadUrl = `https://fonts.google.com/specimen/${encodeURIComponent(fontName)}?query=${encodeURIComponent(fontName)}`;
      
      // Open the download page directly in a new tab
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading font:', error);
    }
  };
  
  // Add a copy function for the font name
  const copyFontName = (fontName: string) => {
    navigator.clipboard.writeText(fontName)
      .then(() => {
        // You could add a toast notification here
        console.log(`Copied '${fontName}' to clipboard`);
        alert(`Copied '${fontName}' to clipboard`);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <main
      className={cn(
        "min-h-screen p-4 md:p-8 transition-colors",
        inter.variable,
        robotoSerif.variable,
        playfair.variable,
        montserrat.variable,
        openSans.variable,
        lora.variable,
        raleway.variable,
        merriweather.variable,
      )}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Font Pairing Explorer</h1>
            <p className="text-muted-foreground">Discover and preview perfect font combinations for your projects</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "light" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Preview</h2>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsMobileView(false)}>
                        <Monitor className="h-4 w-4 mr-2" />
                        Desktop
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsMobileView(true)}>
                        <Smartphone className="h-4 w-4 mr-2" />
                        Mobile
                      </Button>
                    </div>
                  </div>

                  <div
                    id="preview-section"
                    className={cn(
                      "border rounded-lg p-6 transition-all",
                      isMobileView ? "max-w-[375px] mx-auto" : "w-full"
                    )}
                    style={{ backgroundColor: bgColor }}
                  >
                    {isMounted ? (
                      <>
                    <h1
                      className="mb-4 font-bold"
                      style={{
                            fontFamily: `${headingFont.name}, sans-serif`,
                        fontSize: `${headingSize}px`,
                        lineHeight: 1.2,
                            color: getTextColor(bgColor, "heading"),
                      }}
                    >
                      Design with beautiful typography
                    </h1>
                    <h2
                      className="mb-4"
                      style={{
                            fontFamily: `${headingFont.name}, sans-serif`,
                        fontSize: `${subheadingSize}px`,
                        fontWeight: 500,
                        lineHeight: 1.4,
                            color: getTextColor(bgColor, "heading"),
                      }}
                    >
                      Find the perfect font pairing for your next project
                    </h2>
                    <p
                      className="mb-4"
                      style={{
                            fontFamily: `${bodyFont.name}, sans-serif`,
                        fontSize: `${bodySize}px`,
                        lineHeight: 1.6,
                            color: getTextColor(bgColor, "body"),
                      }}
                    >
                      Typography is the art and technique of arranging type to make written language legible, readable,
                      and appealing when displayed. Good typography can create a strong visual hierarchy, provide
                      balance and set the product's overall tone.
                    </p>
                    <p
                      className="mb-4"
                      style={{
                            fontFamily: `${bodyFont.name}, sans-serif`,
                        fontSize: `${bodySize}px`,
                        lineHeight: 1.6,
                            color: getTextColor(bgColor, "body"),
                      }}
                    >
                      The right font pairing can elevate your design and help communicate your message effectively. This
                      tool helps you discover beautiful combinations that work well together.
                    </p>
                      </>
                    ) : (
                      <>
                        <h1 className="mb-4 font-bold" style={{ fontSize: `${headingSize}px`, lineHeight: 1.2 }}>
                          Design with beautiful typography
                        </h1>
                        <h2 className="mb-4" style={{ fontSize: `${subheadingSize}px`, fontWeight: 500, lineHeight: 1.4 }}>
                          Find the perfect font pairing for your next project
                        </h2>
                        <p className="mb-4" style={{ fontSize: `${bodySize}px`, lineHeight: 1.6 }}>
                          Typography is the art and technique of arranging type to make written language legible, readable,
                          and appealing when displayed. Good typography can create a strong visual hierarchy, provide
                          balance and set the product's overall tone.
                        </p>
                        <p className="mb-4" style={{ fontSize: `${bodySize}px`, lineHeight: 1.6 }}>
                          The right font pairing can elevate your design and help communicate your message effectively. This
                          tool helps you discover beautiful combinations that work well together.
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Font Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Heading Font</h3>
                      <Popover open={headingFontOpen} onOpenChange={setHeadingFontOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={headingFontOpen}
                            className="w-full justify-between mb-3"
                          >
                            {headingFont.name}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-full" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Search fonts..." 
                              className="h-9"
                              value={headingFontSearch}
                              onValueChange={setHeadingFontSearch}
                            />
                            <CommandList>
                              <CommandEmpty>No font found.</CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-y-auto">
                                {filteredHeadingFonts.map((font, index) => (
                                  <CommandItem
                                    key={`heading-${index}`}
                                    value={font.name}
                                    onSelect={(value) => {
                                      // Check if the font is already loaded
                                      const existingFont = uniqueHeadingFonts.find(f => f.name === value);
                                      if (existingFont) {
                                        setHeadingFont(existingFont);
                                      } else {
                                        // Load the font from Google Fonts if not already loaded
                                        const googleFont = googleFonts.find(f => f.family === value);
                                        if (googleFont) {
                                          // Show loading state
                                          setIsGenerating(true);
                                          
                                          // Load and inject the font
                                          loadAndInjectFont(googleFont).then(fontName => {
                                            // Create a new font object
                                            const newFont = { name: fontName, font: null };
                                            setHeadingFont(newFont);
                                            
                                            // Add to unique fonts if not already present
                                            if (!uniqueHeadingFonts.some(f => f.name === fontName)) {
                                              setUniqueHeadingFonts(prev => [...prev, newFont]);
                                            }
                                            
                                            setIsGenerating(false);
                                          });
                                        }
                                      }
                                      setHeadingFontOpen(false);
                                      setHeadingFontSearch("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        headingFont.name === font.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span style={{ fontFamily: `${font.name}, sans-serif` }}>
                              {font.name}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="flex items-center gap-2 mb-4">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          title="Copy Name"
                          onClick={() => copyFontName(headingFont.name)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          title="Download Font"
                          onClick={() => downloadFont(headingFont.name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Heading Size: {headingSize}px</Label>
                        <Slider
                          value={[headingSize]}
                          min={24}
                          max={72}
                          step={1}
                          onValueChange={(value) => setHeadingSize(value[0])}
                        />
                      </div>
                      <div className="space-y-2 mt-3">
                        <Label>Subheading Size: {subheadingSize}px</Label>
                        <Slider
                          value={[subheadingSize]}
                          min={16}
                          max={48}
                          step={1}
                          onValueChange={(value) => setSubheadingSize(value[0])}
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Body Font</h3>
                      <Popover open={bodyFontOpen} onOpenChange={setBodyFontOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={bodyFontOpen}
                            className="w-full justify-between mb-3"
                          >
                            {bodyFont.name}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-full" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Search fonts..." 
                              className="h-9"
                              value={bodyFontSearch}
                              onValueChange={setBodyFontSearch}
                            />
                            <CommandList>
                              <CommandEmpty>No font found.</CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-y-auto">
                                {filteredBodyFonts.map((font, index) => (
                                  <CommandItem
                                    key={`body-${index}`}
                                    value={font.name}
                                    onSelect={(value) => {
                                      // Check if the font is already loaded
                                      const existingFont = uniqueBodyFonts.find(f => f.name === value);
                                      if (existingFont) {
                                        setBodyFont(existingFont);
                                      } else {
                                        // Load the font from Google Fonts if not already loaded
                                        const googleFont = googleFonts.find(f => f.family === value);
                                        if (googleFont) {
                                          // Show loading state
                                          setIsGenerating(true);
                                          
                                          // Load and inject the font
                                          loadAndInjectFont(googleFont).then(fontName => {
                                            // Create a new font object
                                            const newFont = { name: fontName, font: null };
                                            setBodyFont(newFont);
                                            
                                            // Add to unique fonts if not already present
                                            if (!uniqueBodyFonts.some(f => f.name === fontName)) {
                                              setUniqueBodyFonts(prev => [...prev, newFont]);
                                            }
                                            
                                            setIsGenerating(false);
                                          });
                                        }
                                      }
                                      setBodyFontOpen(false);
                                      setBodyFontSearch("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        bodyFont.name === font.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span style={{ fontFamily: `${font.name}, sans-serif` }}>
                              {font.name}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="flex items-center gap-2 mb-4">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          title="Copy Name"
                          onClick={() => copyFontName(bodyFont.name)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          title="Download Font"
                          onClick={() => downloadFont(bodyFont.name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Body Size: {bodySize}px</Label>
                        <Slider
                          value={[bodySize]}
                          min={12}
                          max={24}
                          step={1}
                          onValueChange={(value) => setBodySize(value[0])}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Generate Pairing</h2>
                  <div className="space-y-6">
                    <div>
                      <Label className="mb-2 block">Similarity / Contrast</Label>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">Similar</span>
                        <Slider
                          value={[contrastValue]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={handleContrastChange}
                          className="flex-1"
                        />
                        <span className="text-sm">Contrast</span>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Font Category</Label>
                      <Select value={fontCategory} onValueChange={setFontCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Categories</SelectItem>
                          <SelectItem value="serif">Serif</SelectItem>
                          <SelectItem value="sans-serif">Sans Serif</SelectItem>
                          <SelectItem value="display">Display</SelectItem>
                          <SelectItem value="handwriting">Handwriting</SelectItem>
                          <SelectItem value="monospace">Monospace</SelectItem>
                          <SelectItem value="Professional">Professional</SelectItem>
                          <SelectItem value="Creative">Creative</SelectItem>
                          <SelectItem value="Playful">Playful</SelectItem>
                          <SelectItem value="Elegant">Elegant</SelectItem>
                          <SelectItem value="Modern">Modern</SelectItem>
                          <SelectItem value="Traditional">Traditional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={generatePairing} 
                      className="w-full" 
                      disabled={isGenerating || googleFonts.length === 0}
                    >
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate New Pairing
                        </>
                      )}
                    </Button>

                    <div>
                      <Label className="mb-2 block">Background Color</Label>
                      <div className="space-y-2">
                      <ColorPicker color={bgColor} onChange={setBgColor} />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2" 
                          onClick={resetBgColor}
                        >
                          Reset to Theme Default
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Button variant="outline" className="w-full">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share This Pairing
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">CSS Code</h2>
                    <Button variant="ghost" size="icon" title="Copy">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                    {`/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=${headingFont?.name ? headingFont.name.replace(/\s+/g, "+") : "Inter"}:wght@400;700&family=${bodyFont?.name ? bodyFont.name.replace(/\s+/g, "+") : "Open_Sans"}:wght@400;500&display=swap');

/* Apply fonts */
h1, h2, h3, h4, h5, h6 {
  font-family: '${headingFont?.name || "Inter"}', serif;
}

body, p, div {
  font-family: '${bodyFont?.name || "Open Sans"}', sans-serif;
  font-size: ${bodySize}px;
}

h1 {
  font-size: ${headingSize}px;
}

h2 {
  font-size: ${subheadingSize}px;
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>

          <section className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Curated Font Pairings</h2>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Modern">Modern</SelectItem>
                  <SelectItem value="Elegant">Elegant</SelectItem>
                  <SelectItem value="Creative">Creative</SelectItem>
                  <SelectItem value="Editorial">Editorial</SelectItem>
                  <SelectItem value="High Contrast">High Contrast</SelectItem>
                  <SelectItem value="Balanced">Balanced</SelectItem>
                  <SelectItem value="Harmonious">Harmonious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPairs.map((pair, index) => (
                <FontPairCard
                  key={`${pair.name}-${index}`}
                  name={pair.name}
                  headingFont={pair.heading}
                  bodyFont={pair.body}
                  category={pair.category}
                  onSelect={() => handleSelect(pair)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

