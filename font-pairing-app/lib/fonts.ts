import { NextFont } from 'next/dist/compiled/@next/font'

export interface FontInfo {
  name: string
  font: NextFont
}

export interface GoogleFontItem {
  family: string
  variants: string[]
  subsets: string[]
  category: string
  version?: string
  lastModified?: string
  files?: Record<string, string>
}

const loadedFonts = new Set<string>()
const fontCache = new Map<string, GoogleFontItem>()

// Safely check if we're in browser
const isBrowser = () => typeof window !== 'undefined'

// Font categories for better classification
export const fontCategories = {
  serif: ['serif'],
  sansSerif: ['sans-serif'],
  display: ['display'],
  handwriting: ['handwriting'],
  monospace: ['monospace'],
}

// Font pairing rules for intelligent pairing
export const fontPairingRules = {
  // Good heading + body combinations
  combinations: [
    { heading: ['display', 'serif'], body: ['sans-serif'] },
    { heading: ['sans-serif'], body: ['serif'] },
    { heading: ['serif'], body: ['sans-serif'] },
    { heading: ['serif'], body: ['serif'] },
    { heading: ['sans-serif'], body: ['sans-serif'] },
    { heading: ['display'], body: ['serif', 'sans-serif'] },
  ],
  
  // Contrast levels (0-100)
  contrastLevels: {
    // Fonts with high contrast between each other (70-100)
    highContrast: [
      { heading: ['display', 'serif'], body: ['sans-serif'] },
      { heading: ['serif'], body: ['sans-serif'] },
      { heading: ['monospace'], body: ['serif', 'sans-serif', 'display'] },
      { heading: ['handwriting'], body: ['sans-serif'] },
    ],
    
    // Medium contrast (40-70)
    mediumContrast: [
      { heading: ['sans-serif'], body: ['serif'] },
      { heading: ['display'], body: ['serif'] },
      { heading: ['serif'], body: ['serif'] },
    ],
    
    // Low contrast (0-40)
    lowContrast: [
      { heading: ['sans-serif'], body: ['sans-serif'] },
      { heading: ['serif'], body: ['serif'] },
    ],
  },
}

// Function to categorize a font based on its Google Font category
export const categorizeFont = (font: GoogleFontItem): string => {
  if (!font || !font.category) return 'sans-serif';
  
  switch (font.category.toLowerCase()) {
    case 'serif':
      return 'serif';
    case 'sans-serif':
      return 'sans-serif';
    case 'display':
      return 'display';
    case 'handwriting':
      return 'handwriting';
    case 'monospace':
      return 'monospace';
    default:
      return 'sans-serif';
  }
}

// Calculate contrast level between two fonts
export const calculateFontContrast = (headingFont: GoogleFontItem, bodyFont: GoogleFontItem): number => {
  if (!headingFont || !bodyFont) return 50;
  
  const headingCategory = categorizeFont(headingFont);
  const bodyCategory = categorizeFont(bodyFont);
  
  // Same font = minimum contrast
  if (headingFont.family === bodyFont.family) return 0;
  
  // Same category = low contrast
  if (headingCategory === bodyCategory) {
    return Math.min(30 + Math.random() * 15, 40);
  }
  
  // Check if this combo is in high contrast rules
  const isHighContrast = fontPairingRules.contrastLevels.highContrast.some(rule => 
    rule.heading.includes(headingCategory) && rule.body.includes(bodyCategory)
  );
  
  if (isHighContrast) {
    return 70 + Math.random() * 30;
  }
  
  // Check if this combo is in medium contrast rules
  const isMediumContrast = fontPairingRules.contrastLevels.mediumContrast.some(rule => 
    rule.heading.includes(headingCategory) && rule.body.includes(bodyCategory)
  );
  
  if (isMediumContrast) {
    return 40 + Math.random() * 30;
  }
  
  // Default to a medium-ish contrast
  return 35 + Math.random() * 40;
}

// Create an intelligent font pairing based on a heading font
export const findMatchingBodyFont = (
  headingFont: GoogleFontItem, 
  allFonts: GoogleFontItem[], 
  contrastLevel: number
): GoogleFontItem | null => {
  if (!headingFont || !allFonts || allFonts.length === 0) {
    return null;
  }
  
  const headingCategory = categorizeFont(headingFont);
  
  // Determine which contrast rule set to use
  let targetRules;
  if (contrastLevel >= 70) {
    targetRules = fontPairingRules.contrastLevels.highContrast;
  } else if (contrastLevel >= 40) {
    targetRules = fontPairingRules.contrastLevels.mediumContrast;
  } else {
    targetRules = fontPairingRules.contrastLevels.lowContrast;
  }
  
  // Find rules that match our heading category
  const matchingRules = targetRules.filter(rule => rule.heading.includes(headingCategory));
  
  if (matchingRules.length === 0) {
    // Fallback to any rule with the right contrast level
    targetRules = fontPairingRules.contrastLevels.mediumContrast;
  }
  
  // Get potential body font categories from rules
  const potentialBodyCategories = new Set<string>();
  
  targetRules.forEach(rule => {
    if (rule.heading.includes(headingCategory)) {
      rule.body.forEach(cat => potentialBodyCategories.add(cat));
    }
  });
  
  // If no specific categories were found, use all categories
  if (potentialBodyCategories.size === 0) {
    ['serif', 'sans-serif', 'display', 'monospace'].forEach(cat => 
      potentialBodyCategories.add(cat)
    );
  }
  
  // Filter fonts to only keep those in our target categories
  const candidateFonts = allFonts.filter(font => {
    const category = categorizeFont(font);
    return potentialBodyCategories.has(category) && font.family !== headingFont.family;
  });
  
  // Calculate contrast for each candidate
  const scoredFonts = candidateFonts.map(font => {
    const actualContrast = calculateFontContrast(headingFont, font);
    const score = Math.abs(actualContrast - contrastLevel);
    return { font, score };
  });
  
  // Sort by closest match to desired contrast
  scoredFonts.sort((a, b) => a.score - b.score);
  
  // Return one of the best 5 matches (for variety)
  const topN = Math.min(5, scoredFonts.length);
  const randomIndex = Math.floor(Math.random() * topN);
  return scoredFonts[randomIndex]?.font || candidateFonts[0];
}

// Generate a complete font pairing based on contrast
export const generateFontPairing = async (
  allFonts: GoogleFontItem[], 
  contrastLevel: number,
  currentHeadingFont?: string,
  currentBodyFont?: string
): Promise<{ heading: GoogleFontItem; body: GoogleFontItem; name: string } | null> => {
  if (!allFonts || allFonts.length === 0) {
    return null;
  }
  
  // Filter to fonts with latin subset (most compatible)
  const compatibleFonts = allFonts.filter(font => 
    font.subsets && font.subsets.includes('latin')
  );
  
  // Choose categories based on contrast level
  let headingCategories: string[];
  
  if (contrastLevel >= 70) {
    headingCategories = ['display', 'serif'];
  } else if (contrastLevel >= 40) {
    headingCategories = ['serif', 'sans-serif', 'display'];
  } else {
    headingCategories = ['sans-serif', 'serif'];
  }
  
  // Filter potential heading fonts
  const potentialHeadings = compatibleFonts.filter(font => {
    const category = categorizeFont(font);
    return headingCategories.includes(category);
  });
  
  // Ensure we don't reuse the current fonts
  const filteredHeadings = potentialHeadings.filter(font => 
    font.family !== currentHeadingFont && font.family !== currentBodyFont
  );
  
  // Select random heading font from possibilities
  const randomIndex = Math.floor(Math.random() * filteredHeadings.length);
  const headingFont = filteredHeadings[randomIndex] || potentialHeadings[0];
  
  // Find matching body font
  const bodyFont = findMatchingBodyFont(headingFont, compatibleFonts, contrastLevel);
  
  // Generate a name for this pairing
  const headingCategory = categorizeFont(headingFont);
  const bodyCategory = categorizeFont(bodyFont);
  
  let name = '';
  
  if (contrastLevel >= 70) {
    name = 'High Contrast';
  } else if (contrastLevel >= 40) {
    name = 'Balanced';
  } else {
    name = 'Harmonious';
  }
  
  // Add category info
  if (headingCategory === 'display') {
    name += ' Display';
  } else if (headingCategory === 'serif') {
    name += ' Serif';
  } else if (headingCategory === 'sans-serif') {
    name += ' Sans';
  }
  
  // Return the pairing
  return {
    heading: headingFont,
    body: bodyFont,
    name: `${name} Pairing`
  };
}

// Function to fetch all available Google Fonts
export const fetchAllGoogleFonts = async () => {
  if (!isBrowser()) return []
  
  const API_KEY = process.env.GOOGLE_FONTS_API_KEY
  if (!API_KEY) {
    console.warn('Google Fonts API key is not configured')
    return []
  }

  try {
    // Check localStorage cache first
    const cachedFonts = localStorage.getItem('google_fonts_list')
    if (cachedFonts) {
      try {
        const parsed = JSON.parse(cachedFonts)
        const cacheTime = localStorage.getItem('google_fonts_cache_time')
        
        // Use cache if it's less than 24 hours old
        if (cacheTime && (Date.now() - parseInt(cacheTime)) < 24 * 60 * 60 * 1000) {
          return parsed
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }
    
    // Fetch fresh data
    const response = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
    )
    
    if (!response.ok) {
      console.warn(`Failed to load fonts: ${response.statusText}`)
      return []
    }

    const data = await response.json()
    const fonts = data.items || []
    
    // Cache the results
    try {
      localStorage.setItem('google_fonts_list', JSON.stringify(fonts))
      localStorage.setItem('google_fonts_cache_time', Date.now().toString())
    } catch (e) {
      // localStorage might be full or disabled
      console.warn('Could not cache Google Fonts list:', e)
    }
    
    return fonts
  } catch (error) {
    console.error('Error fetching Google Fonts:', error)
    return []
  }
}

export const loadGoogleFont = async (fontFamily: string) => {
  if (!isBrowser()) return null
  
  // Check if we already have this font in cache
  if (fontCache.has(fontFamily)) {
    return fontCache.get(fontFamily)
  }
  
  const API_KEY = process.env.GOOGLE_FONTS_API_KEY
  if (!API_KEY) {
    console.warn('Google Fonts API key is not configured')
    return null
  }

  try {
    // Try to get from local storage first
    const cachedFont = localStorage.getItem(`google_font_${fontFamily}`)
    if (cachedFont) {
      try {
        const parsed = JSON.parse(cachedFont)
        fontCache.set(fontFamily, parsed)
        return parsed
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }
    
    // Fetch from API
    const response = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&family=${encodeURIComponent(fontFamily)}`
    )
    
    if (!response.ok) {
      console.warn(`Failed to load font information: ${response.statusText}`)
      return null
    }

    const data = await response.json()
    if (!data.items || data.items.length === 0) {
      console.warn(`Font family "${fontFamily}" not found`)
      return null
    }
    
    // Cache the font info
    const fontData = data.items[0]
    fontCache.set(fontFamily, fontData)
    
    try {
      localStorage.setItem(`google_font_${fontFamily}`, JSON.stringify(fontData))
    } catch (e) {
      // localStorage might be full or disabled
    }
    
    return fontData
  } catch (error) {
    console.error(`Error loading font "${fontFamily}":`, error)
    return null
  }
}

export const getFontUrl = (fontFamily: string, weights = [300, 400, 500, 700]) => {
  const weightStr = weights.join(';')
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@${weightStr}&display=swap`
}

export const injectGoogleFont = (fontFamily: string) => {
  // Skip if font is already loaded or we're on the server
  if (loadedFonts.has(fontFamily) || !isBrowser()) {
    return
  }

  try {
    // Use a safer approach to add the font that won't cause hydration issues
    const linkId = `google-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`
    
    // Check if the link already exists
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link')
      link.id = linkId
      link.href = getFontUrl(fontFamily)
      link.rel = 'stylesheet'
      link.setAttribute('data-font', fontFamily)
      
      // Use a safer way to add the link
      if (document.readyState === 'complete') {
        // If document is already loaded, add link directly
        document.head.appendChild(link)
      } else {
        // Otherwise wait for DOM content to be loaded
        window.addEventListener('DOMContentLoaded', () => {
          document.head.appendChild(link)
        })
      }
      
      loadedFonts.add(fontFamily)
    }
  } catch (error) {
    console.error(`Error injecting font "${fontFamily}":`, error)
  }
}

export const loadAndInjectFont = async (fontInput: GoogleFontItem | string) => {
  // Skip if not in browser
  if (!isBrowser()) {
    return fontInput instanceof Object ? fontInput.family : fontInput
  }
  
  try {
    let fontFamily: string

    // Handle both string and GoogleFontItem inputs
    if (typeof fontInput === 'string') {
      fontFamily = fontInput
    } else if (fontInput && typeof fontInput === 'object' && fontInput.family) {
      fontFamily = fontInput.family
    } else {
      console.error('Invalid font input:', fontInput)
      return fontInput instanceof Object ? fontInput.family : 'Inter'
    }

    // Skip if font is already loaded
    if (loadedFonts.has(fontFamily)) {
      return fontFamily
    }

    // First check if the font exists
    const fontData = await loadGoogleFont(fontFamily)
    if (fontData) {
      injectGoogleFont(fontFamily)
      return fontFamily
    }
    
    return fontFamily
  } catch (error) {
    console.error(`Error loading and injecting font:`, error)
    return fontInput instanceof Object ? fontInput.family : (typeof fontInput === 'string' ? fontInput : 'Inter')
  }
}

// Function to download a font from Google Fonts
export const downloadFont = async (fontFamily: string): Promise<boolean> => {
  try {
    // Get font data first
    const fontData = await loadGoogleFont(fontFamily);
    if (!fontData) {
      console.error(`Could not load font data for "${fontFamily}"`);
      return false;
    }
    
    // Get all available font files and weights
    const files = fontData.files || {};
    
    // Validate we have at least one file
    const fileEntries = Object.entries(files);
    if (fileEntries.length === 0) {
      console.error(`No font files available for "${fontFamily}"`);
      return false;
    }
    
    // Create a hidden link to trigger the download
    const link = document.createElement('a');
    
    // Use regular weight if available, otherwise first available weight
    const regularWeight = files['regular'] || files['400'] || fileEntries[0][1];
    
    // Prepare the download
    link.href = regularWeight;
    link.download = `${fontFamily.replace(/\s+/g, '-').toLowerCase()}.ttf`;
    link.style.display = 'none';
    
    // Append to body, trigger download, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error(`Error downloading font "${fontFamily}":`, error);
    return false;
  }
}; 