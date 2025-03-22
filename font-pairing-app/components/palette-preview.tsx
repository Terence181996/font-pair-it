"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PalettePreviewProps {
  colors: string[];
  onColorRoleChange?: (newColors: string[]) => void;
}

interface ColorScheme {
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
  background: string;
  surface: string;
  text: {
    onPrimary: string;
    onSecondary: string;
    onTertiary: string;
    onAccent: string;
    onBackground: string;
    onSurface: string;
  };
}

// Function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Function to calculate relative luminance
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Function to calculate contrast ratio between two colors
function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(hexToRgb(color1).r, hexToRgb(color1).g, hexToRgb(color1).b);
  const l2 = getLuminance(hexToRgb(color2).r, hexToRgb(color2).g, hexToRgb(color2).b);
  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (lightest + 0.05) / (darkest + 0.05);
}

// Function to get accessible text color
function getAccessibleTextColor(bgColor: string): string {
  const whiteContrast = getContrastRatio(bgColor, "#ffffff");
  const blackContrast = getContrastRatio(bgColor, "#000000");
  
  // WCAG Level AA requires contrast ratio of at least 4.5:1 for normal text
  // If neither white nor black meets this, we'll use the one with better contrast
  return whiteContrast >= 4.5 || whiteContrast > blackContrast ? "#ffffff" : "#000000";
}

// Function to get a color with sufficient contrast
function getContrastingColor(bgColor: string, minContrast: number = 4.5): string {
  const baseTextColor = getAccessibleTextColor(bgColor);
  if (getContrastRatio(bgColor, baseTextColor) >= minContrast) {
    return baseTextColor;
  }

  // If base colors don't provide enough contrast, adjust the text color
  const rgb = hexToRgb(baseTextColor);
  const step = baseTextColor === "#ffffff" ? -1 : 1;
  let newColor = baseTextColor;

  // Adjust the color until we get sufficient contrast
  while (getContrastRatio(bgColor, newColor) < minContrast) {
    rgb.r = Math.max(0, Math.min(255, rgb.r + step));
    rgb.g = Math.max(0, Math.min(255, rgb.g + step));
    rgb.b = Math.max(0, Math.min(255, rgb.b + step));
    newColor = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
  }

  return newColor;
}

// Function to analyze color properties
function analyzeColor(color: string) {
  const rgb = hexToRgb(color);
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  return {
    luminance,
    saturation: hsl.s,
    hue: hsl.h,
    isVibrant: hsl.s > 0.5,
    isDark: luminance < 0.5,
    isNeutral: hsl.s < 0.15,
  };
}

// Function to convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h, s, l };
}

// Function to suggest color roles
function suggestColorRoles(colors: string[]) {
  const analyses = colors.map((color, index) => ({
    ...analyzeColor(color),
    originalIndex: index,
  }));

  // Find the most suitable primary color (vibrant, good contrast potential)
  const primaryIndex = analyses.reduce((best, current, idx) => {
    const score = (current.isVibrant ? 2 : 0) + 
                 (current.saturation * 1.5) + 
                 (current.isDark ? 1 : 0);
    return score > best.score ? { score, index: idx } : best;
  }, { score: -1, index: 0 }).index;

  // Find accent (most vibrant after primary)
  const accentIndex = analyses.reduce((best, current, idx) => {
    if (idx === primaryIndex) return best;
    const score = (current.isVibrant ? 2 : 0) + (current.saturation * 1.5);
    return score > best.score ? { score, index: idx } : best;
  }, { score: -1, index: 0 }).index;

  // Find background (least saturated, lighter)
  const backgroundIndex = analyses.reduce((best, current, idx) => {
    if (idx === primaryIndex || idx === accentIndex) return best;
    const score = (current.isNeutral ? 2 : 0) + (!current.isDark ? 1.5 : 0);
    return score > best.score ? { score, index: idx } : best;
  }, { score: -1, index: 0 }).index;

  return {
    suggestedPrimary: colors[primaryIndex],
    suggestedRoles: {
      primary: primaryIndex,
      accent: accentIndex,
      background: backgroundIndex,
    }
  };
}

function PalettePreview({ colors, onColorRoleChange }: PalettePreviewProps) {
  const [template, setTemplate] = useState<"website" | "mobile">("website");
  const [primaryColorIndex, setPrimaryColorIndex] = useState<number>(0);
  
  // Analyze colors and get suggestions
  const { suggestedRoles } = suggestColorRoles(colors);

  // Reorganize colors based on selected primary
  const organizeColors = (primaryIdx: number) => {
    const newColors = [...colors];
    // Move selected color to primary position
    [newColors[0], newColors[primaryIdx]] = [newColors[primaryIdx], newColors[0]];
    
    // Analyze remaining colors for best roles
    const remainingColors = newColors.slice(1);
    const remainingAnalysis = suggestColorRoles(remainingColors);
    
    // Organize remaining colors based on their properties
    const organized = [
      newColors[0], // Keep selected primary
      ...remainingColors
    ];

    return organized;
  };

  // Handle primary color selection
  const handlePrimarySelection = (index: number) => {
    if (index === primaryColorIndex) return;
    setPrimaryColorIndex(index);
    const newColors = organizeColors(index);
    onColorRoleChange?.(newColors);
  };

  // Intelligently assign colors based on their properties and relationships
  const colorScheme: ColorScheme = {
    primary: colors[0] || "#1a1a1a",
    secondary: colors[1] || "#f0f0f0",
    tertiary: colors[2] || "#e0e0e0",
    accent: colors[3] || "#ff4081",
    background: colors.length >= 5 ? colors[4] : "#ffffff",
    surface: colors.length >= 5 ? colors[4] : "#ffffff",
    text: {
      onPrimary: getContrastingColor(colors[0] || "#1a1a1a"),
      onSecondary: getContrastingColor(colors[1] || "#f0f0f0"),
      onTertiary: getContrastingColor(colors[2] || "#e0e0e0"),
      onAccent: getContrastingColor(colors[3] || "#ff4081"),
      onBackground: getContrastingColor(colors.length >= 5 ? colors[4] : "#ffffff"),
      onSurface: getContrastingColor(colors.length >= 5 ? colors[4] : "#ffffff"),
    },
  };

  const WebsiteTemplate = () => (
    <div className="w-full aspect-video bg-white rounded-lg overflow-hidden shadow-lg">
      {/* Header */}
      <div style={{ backgroundColor: colorScheme.primary }} className="h-16 px-6 flex items-center justify-between">
        <div style={{ color: colorScheme.text.onPrimary }} className="font-bold text-xl">Brand</div>
        <div className="flex gap-6">
          {["Home", "Products", "About", "Contact"].map((item) => (
            <div 
              key={item} 
              style={{ color: colorScheme.text.onPrimary }} 
              className={cn(
                "cursor-pointer transition-all",
                item === "Home" ? "opacity-100" : "opacity-80 hover:opacity-100"
              )}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      {/* Hero Section */}
      <div style={{ backgroundColor: colorScheme.secondary }} className="h-48 p-6 flex items-center">
        <div className="max-w-md">
          <h1 style={{ color: colorScheme.text.onSecondary }} className="text-3xl font-bold mb-2">
            Welcome to Our Site
          </h1>
          <p style={{ color: colorScheme.text.onSecondary }} className="mb-4 opacity-90">
            Experience the perfect blend of design and functionality.
          </p>
          <div className="flex gap-3">
            <button
              style={{ 
                backgroundColor: colorScheme.accent,
                color: colorScheme.text.onAccent,
              }}
              className="px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </button>
            <button
              style={{ 
                backgroundColor: 'transparent',
                color: colorScheme.text.onSecondary,
                border: `2px solid ${colorScheme.text.onSecondary}`
              }}
              className="px-6 py-2 rounded-md font-medium hover:opacity-80 transition-opacity"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
      {/* Content Section */}
      <div style={{ backgroundColor: colorScheme.background }} className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ 
                backgroundColor: i === 2 ? colorScheme.tertiary : colorScheme.surface,
                border: `1px solid ${colorScheme.secondary}`
              }}
              className="p-4 rounded-lg"
            >
              <div 
                style={{ backgroundColor: colorScheme.accent }} 
                className="w-8 h-8 rounded-full mb-3"
              />
              <h3 
                style={{ 
                  color: i === 2 ? colorScheme.text.onTertiary : colorScheme.text.onSurface 
                }} 
                className="font-semibold mb-2"
              >
                Feature {i}
              </h3>
              <p 
                style={{ 
                  color: i === 2 ? colorScheme.text.onTertiary : colorScheme.text.onSurface 
                }} 
                className="text-sm opacity-90"
              >
                Showcase your key features and benefits here.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const MobileTemplate = () => (
    <div className="w-[320px] h-[640px] bg-white rounded-lg overflow-hidden shadow-lg mx-auto">
      {/* Mobile Header */}
      <div style={{ backgroundColor: colorScheme.primary }} className="h-16 px-4 flex items-center justify-between">
        <div style={{ color: colorScheme.text.onPrimary }} className="font-bold text-xl">Brand</div>
        <div style={{ color: colorScheme.text.onPrimary }} className="text-xl">⋮</div>
      </div>
      {/* Mobile Content */}
      <div style={{ backgroundColor: colorScheme.background }} className="h-full">
        {/* Hero Card */}
        <div 
          style={{ backgroundColor: colorScheme.secondary }}
          className="p-6"
        >
          <h1 style={{ color: colorScheme.text.onSecondary }} className="text-2xl font-bold mb-2">
            Welcome
          </h1>
          <p style={{ color: colorScheme.text.onSecondary }} className="text-sm mb-4 opacity-90">
            Discover amazing features in our app.
          </p>
          <button
            style={{ 
              backgroundColor: colorScheme.accent,
              color: colorScheme.text.onAccent
            }}
            className="w-full py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
        </div>
        {/* Feature Cards */}
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ 
                backgroundColor: colorScheme.surface,
                borderLeft: `4px solid ${i === 2 ? colorScheme.accent : colorScheme.tertiary}`
              }}
              className="p-4 rounded-lg shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div 
                  style={{ 
                    backgroundColor: i === 2 ? colorScheme.accent : colorScheme.primary,
                    color: i === 2 ? colorScheme.text.onAccent : colorScheme.text.onPrimary,
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                >
                  {i}
                </div>
                <div>
                  <h3 style={{ color: colorScheme.text.onSurface }} className="font-medium">
                    Feature {i}
                  </h3>
                  <p style={{ color: colorScheme.text.onSurface }} className="text-sm opacity-90">
                    Quick description
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Mobile Navigation */}
      <div 
        style={{ backgroundColor: colorScheme.primary }} 
        className="h-16 mt-auto flex items-center justify-around"
      >
        {[
          { icon: "🏠", label: "Home" },
          { icon: "🔍", label: "Search" },
          { icon: "💡", label: "Explore" },
          { icon: "👤", label: "Profile" }
        ].map((item, i) => (
          <div 
            key={item.label}
            className="flex flex-col items-center"
          >
            <div style={{ color: colorScheme.text.onPrimary }} className="text-xl">
              {item.icon}
            </div>
            <div 
              style={{ color: colorScheme.text.onPrimary }} 
              className={cn(
                "text-xs mt-1",
                i === 0 ? "opacity-100" : "opacity-70"
              )}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-medium mb-2">Color Roles</h3>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color, index) => (
                <button
                  key={color}
                  onClick={() => handlePrimarySelection(index)}
                  className={cn(
                    "w-12 h-12 rounded-lg transition-all relative",
                    "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2",
                    index === primaryColorIndex && "ring-2 ring-offset-2 ring-blue-500",
                    index === suggestedRoles.primary && "!ring-2 !ring-green-500 !ring-offset-2"
                  )}
                  style={{ backgroundColor: color }}
                  title={index === suggestedRoles.primary ? "Suggested Primary Color" : `Set as Primary Color`}
                >
                  {index === suggestedRoles.primary && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1 rounded-full">
                      ★
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-medium">Preview Template</h3>
            <Select value={template} onValueChange={(value: "website" | "mobile") => setTemplate(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website Template</SelectItem>
                <SelectItem value="mobile">Mobile App Template</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg">
          {template === "website" ? <WebsiteTemplate /> : <MobileTemplate />}
        </div>
        <div className="text-sm text-muted-foreground">
          <h4 className="font-medium mb-2">Color Usage Guide:</h4>
          <ul className="space-y-1">
            <li>• Primary: Main brand color (headers, key elements) - Click colors above to change</li>
            <li>• Secondary: Supporting color (sections, backgrounds)</li>
            <li>• Tertiary: Additional supporting color (alternate sections)</li>
            <li>• Accent: Call-to-action and highlights</li>
            <li>• Text: Automatically adjusted for WCAG AA compliance (4.5:1 contrast ratio)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default PalettePreview; 