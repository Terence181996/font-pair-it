"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
import { Copy, Download, Share2, Smartphone, Monitor, RefreshCw, Check, ChevronsUpDown, Search, Moon, Sun, X } from "lucide-react"
import FontPairCard from "@/components/font-pair-card"
import ColorPicker from "@/components/color-picker"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useTheme } from "next-themes"
import dynamic from "next/dynamic"

// Dynamically import html2canvas to avoid SSR issues
const Html2Canvas = dynamic(() => import("html2canvas"), { ssr: false })

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

// Convert a GoogleFontItem to our internal font format
const convertGoogleFontToInternal = (font: GoogleFontItem): { name: string, font: any } => {
  return {
    name: font.family,
    font: null // We'll rely on dynamic loading
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
  const [isSharing, setIsSharing] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  
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
  
  // Keep theme for background color only
  const { theme } = useTheme()
  
  // Reset background color based on theme
  const resetBgColor = () => {
    localStorage.removeItem('userSelectedBgColor')
    setBgColor(theme === 'dark' ? '#1e1e1e' : '#ffffff')
  }
  
  // Set initial background color only once when component mounts, not on theme change
  useEffect(() => {
    if (isMounted && !localStorage.getItem('userSelectedBgColor')) {
      resetBgColor()
    }
  }, [isMounted])
  
  // Store user color selection in localStorage
  useEffect(() => {
    if (isMounted && bgColor) {
      localStorage.setItem('userSelectedBgColor', bgColor)
    }
  }, [bgColor, isMounted])
  
  // Load saved color from localStorage on mount
  useEffect(() => {
    if (isMounted) {
      const savedColor = localStorage.getItem('userSelectedBgColor')
      if (savedColor) {
        setBgColor(savedColor)
      } else {
        resetBgColor()
      }
    }
  }, [isMounted])
  
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
  
  // Scroll to the preview section
  const scrollToPreview = () => {
    if (!isMounted) return;
    
    // Use the ref instead of getElementById for better React integration
    if (previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Select a font pair card
  const selectFontPair = (pair: FontPair) => {
    setHeadingFont(pair.heading);
    setBodyFont(pair.body);
    
    // Scroll to preview section
    scrollToPreview();
  };

  // Generate a new font pairing
  const generateNewPairing = async () => {
    if (!googleFonts || googleFonts.length === 0 || isGenerating) return;
    setIsGenerating(true);
    
    try {
      const newPair = await generateFontPairing(
        googleFonts, 
        contrastValue,
        headingFont?.name,
        bodyFont?.name
      );
      
      if (newPair) {
        const newHeadingFont = convertGoogleFontToInternal(newPair.heading);
        const newBodyFont = convertGoogleFontToInternal(newPair.body);
        
        setHeadingFont(newHeadingFont);
        setBodyFont(newBodyFont);
        
        // Scroll to preview
        scrollToPreview();
      }
    } catch (error) {
      console.error("Error generating font pairing:", error);
    } finally {
      setIsGenerating(false);
    }
  };

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
    const contrast = calculateContrastYIQ(bgColor)
    
    // Simplified color logic
    if (contrast === "dark") {
      return textType === "heading" ? "#ffffff" : "#e1e1e1"
    }
    return textType === "heading" ? "#000000" : "#1a1a1a"
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
        toast({
          title: "Font name copied",
          description: `"${fontName}" has been copied to clipboard.`,
        });
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast({
          title: "Copy failed",
          description: "Could not copy font name to clipboard.",
          variant: "destructive"
        });
      });
  };

  // Add state for share dialog
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [sharePreviewHTML, setSharePreviewHTML] = useState<string>("")
  
  // Function to share font pairing
  const captureAndShareScreenshot = () => {
    if (!previewRef.current || !isMounted) return
    
    try {
      setIsSharing(true)
      
      // Create an info element with font details
      const fontDetailsHtml = `
        <div style="padding: 16px; margin-top: 16px; font-family: sans-serif; background-color: ${bgColor}; color: ${getTextColor(bgColor, "body")}; border-radius: 4px; border-top: 1px solid #e2e8f0;">
          <div style="margin-bottom: 8px"><strong>Heading:</strong> ${headingFont.name} (${headingSize}px)</div>
          <div style="margin-bottom: 8px"><strong>Body:</strong> ${bodyFont.name} (${bodySize}px)</div>
          <div><strong>Background:</strong> ${bgColor}</div>
        </div>
      `;
      
      // Get the content from the preview section
      const previewContent = previewRef.current.outerHTML;
      
      // Combine content for the modal
      const combinedHTML = `
        <div style="max-width: 100%; margin: 0 auto; background-color: ${bgColor};">
          ${previewContent}
          ${fontDetailsHtml}
        </div>
      `;
      
      // Set the HTML for the dialog
      setSharePreviewHTML(combinedHTML);
      
      // Open the share dialog
      setShareDialogOpen(true);
      
      // Show success message
      toast({
        title: "Font pairing ready to share",
        description: "Take a screenshot of this preview or use the buttons below to share.",
      });
      
    } catch (error) {
      console.error('Error sharing preview:', error);
      toast({
        title: "Sharing failed",
        description: "There was an error creating the shareable view. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  }
  
  // Function to copy CSS code
  const copyCSSCode = () => {
    const cssCode = `/* Import fonts */
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
}`;

    navigator.clipboard.writeText(cssCode)
      .then(() => {
        toast({
          title: "CSS copied",
          description: "CSS code has been copied to clipboard.",
        });
      })
      .catch(err => {
        console.error('Failed to copy CSS:', err);
        toast({
          title: "Copy failed",
          description: "Could not copy CSS to clipboard.",
          variant: "destructive"
        });
      });
  };
  
  // Function to download as PNG - simplified version without using canvas API
  const downloadAsPNG = async () => {
    try {
      // Get the HTML content from the preview
      const content = document.getElementById('share-preview-content')?.innerHTML;
      
      if (!content) {
        throw new Error('Preview content not found');
      }
      
      // Create a new window to display printable version
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast({
          title: "Popup blocked",
          description: "Please allow popups to save your font pairing.",
          variant: "destructive"
        });
        return;
      }
      
      // Write HTML with proper fonts to the new window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Font Pairing: ${headingFont.name} & ${bodyFont.name}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=${headingFont.name.replace(/\s+/g, "+")}:wght@400;700&family=${bodyFont.name.replace(/\s+/g, "+")}:wght@400;500&display=swap" rel="stylesheet">
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                background-color: ${bgColor};
                color: ${getTextColor(bgColor, "body")};
              }
              .container { 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px; 
              }
              @media print { 
                body { 
                  -webkit-print-color-adjust: exact; 
                  color-adjust: exact; 
                } 
              }
              .footer {
                margin-top: 20px;
                border-top: 1px solid #ddd;
                padding-top: 10px;
                font-family: sans-serif;
                font-size: 14px;
              }
              .btn {
                background: #0070f3;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 15px;
                font-family: sans-serif;
              }
              h1, h2, h3 {
                font-family: '${headingFont.name}', serif;
              }
              p, div {
                font-family: '${bodyFont.name}', sans-serif;
              }
            </style>
          </head>
          <body>
            <div class="container">
              ${content}
              <div class="footer">
                <p><strong>Heading Font:</strong> ${headingFont.name} (${headingSize}px)</p>
                <p><strong>Body Font:</strong> ${bodyFont.name} (${bodySize}px)</p>
                <p><strong>Background:</strong> ${bgColor}</p>
                <button class="btn" onclick="window.print()">Save as PDF/Print</button>
              </div>
            </div>
            <script>
              document.title = "Font Pairing: ${headingFont.name} & ${bodyFont.name}";
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      toast({
        title: "Shareable view created",
        description: "Use Print/Save as PDF to save the font pairing.",
      });
    } catch (error) {
      console.error('Error creating shareable view:', error);
      toast({
        title: "Share failed",
        description: "Please try a different method to share your font pairing.",
        variant: "destructive"
      });
    }
  };
  
  // Add state for copy indicators
  const [fontInfoCopied, setFontInfoCopied] = useState(false);
  
  // Function to copy font information
  const copyFontInfo = () => {
    const fontInfo = `Heading Font: ${headingFont.name} (${headingSize}px)
Body Font: ${bodyFont.name} (${bodySize}px)
Background Color: ${bgColor}

CSS:
@import url('https://fonts.googleapis.com/css2?family=${headingFont.name.replace(/\s+/g, "+")}:wght@400;700&family=${bodyFont.name.replace(/\s+/g, "+")}:wght@400;500&display=swap');

h1, h2, h3, h4, h5, h6 {
  font-family: '${headingFont.name}', serif;
}

body, p, div {
  font-family: '${bodyFont.name}', sans-serif;
}`;

    navigator.clipboard.writeText(fontInfo)
      .then(() => {
        // Show copied indicator
        setFontInfoCopied(true);
        
        // Reset after 2 seconds
        setTimeout(() => {
          setFontInfoCopied(false);
        }, 2000);
        
        toast({
          title: "Information copied",
          description: "Font pairing details copied to clipboard.",
        });
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast({
          title: "Copy failed",
          description: "Could not copy to clipboard.",
          variant: "destructive"
        });
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
                    ref={previewRef}
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
                      onClick={generateNewPairing} 
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
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={captureAndShareScreenshot}
                        disabled={isSharing}
                      >
                        {isSharing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Preparing...
                          </>
                        ) : (
                          <>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share This Pairing
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">CSS Code</h2>
                    <Button variant="ghost" size="icon" title="Copy" onClick={copyCSSCode}>
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
                  onSelect={() => selectFontPair(pair)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
      
      {/* Add the share dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Font Pairing: {headingFont.name} & {bodyFont.name}
            </DialogTitle>
            <DialogDescription>
              Take a screenshot of this preview or use the buttons below to share.
            </DialogDescription>
          </DialogHeader>
          
          <div 
            className="mt-4 rounded-md overflow-hidden" 
            style={{ backgroundColor: bgColor }}
            dangerouslySetInnerHTML={{ __html: sharePreviewHTML }}
            id="share-preview-content"
          />
          
          <DialogFooter className="flex justify-between items-center gap-4 mt-4">
            <Button variant="outline" onClick={copyFontInfo}>
              {fontInfoCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Font Info
                </>
              )}
            </Button>
            <Button onClick={downloadAsPNG}>
              <Download className="h-4 w-4 mr-2" />
              Print/Save as PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

