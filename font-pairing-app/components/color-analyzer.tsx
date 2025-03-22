"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger,
  TooltipProvider 
} from "@/components/ui/tooltip";

interface ColorAnalysis {
  color: string;
  contrastWithWhite: number;
  contrastWithBlack: number;
  suggestedPairs: {
    color: string;
    contrast: number;
    role: string;
  }[];
  wcagStatus: {
    AANormal: boolean;
    AALarge: boolean;
    AAANormal: boolean;
    AAALarge: boolean;
  };
  harmonies?: {
    analogous: string[];
    triadic: string[];
    tetradic: string[];
    split: string[];
    monochromatic: string[];
  };
  role: 'primary' | 'secondary' | 'accent' | 'background' | 'text';
  usage: string[];
  contrastIssues: Array<{
    withColor: string;
    ratio: number;
    severity: 'critical' | 'moderate' | 'good';
  }>;
  suggestedPairings: Array<{
    color: string;
    role: string;
    purpose: string;
  }>;
}

interface PaletteAnalysis {
  overallScore: number;
  contrastRatios: Array<{
    color1: string;
    color2: string;
    ratio: number;
  }>;
  lowContrastPairs: Array<{
    color1: string;
    color2: string;
    ratio: number;
  }>;
}

interface AIColorSuggestion {
  color: string;
  confidence: number;
  rationale: string;
  expectedUsage: string[];
  contrastScores: {
    withExisting: { color: string; ratio: number; }[];
    withText: number;
    withBackground: number;
  };
}

interface ColorPairRecommendation {
  primaryColor: string;
  secondaryColor: string;
  purpose: string;
  contrastRatio: number;
  priority: number;
  example: string;
}

interface ColorImprovement {
  type: 'add' | 'replace';
  color: string;
  targetColor?: string;
  confidence: number;
  rationale: string;
  contrastScores: {
    withExisting: { color: string; ratio: number; }[];
    withText: number;
    withBackground: number;
  };
  impactScore: number;
}

interface UIPreviewProps {
  colors: string[];
  paletteAnalysis: Map<string, ColorAnalysis>;
  currentPaletteAnalysis: PaletteAnalysis | null;
  showImprovements: { [key: string]: boolean };
  toggleImprovements: (pairKey: string) => void;
  setColors: React.Dispatch<React.SetStateAction<string[]>>;
  selectedBackground: string | null;
  generatePaletteImprovements: (
    colors: string[],
    paletteAnalysis: Map<string, ColorAnalysis>,
    lowContrastPair: { color1: string; color2: string; ratio: number },
    selectedBackground: string | null
  ) => ColorImprovement[];
}

// Color utility functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 0;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (lightest + 0.05) / (darkest + 0.05);
}

// Function to adjust color to meet contrast requirements
function findAccessibleVariant(baseColor: string, targetContrast: number, isDarkening: boolean): string {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return baseColor;

  const step = isDarkening ? -1 : 1;
  let newColor = baseColor;
  let attempts = 0;
  const maxAttempts = 255;

  while (attempts < maxAttempts) {
    const contrast = getContrastRatio(newColor, isDarkening ? "#000000" : "#ffffff");
    if (contrast >= targetContrast) break;

    rgb.r = Math.max(0, Math.min(255, rgb.r + step));
    rgb.g = Math.max(0, Math.min(255, rgb.g + step));
    rgb.b = Math.max(0, Math.min(255, rgb.b + step));
    newColor = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
    attempts++;
  }

  return newColor;
}

// Function to generate suggested color pairs
function generateAccessiblePairs(baseColor: string): { color: string; contrast: number; role: string; }[] {
  const pairs = [];
  const rgb = hexToRgb(baseColor);
  if (!rgb) return pairs;

  // Generate a darker variant for AA compliance (4.5:1)
  const darkerAA = findAccessibleVariant(baseColor, 4.5, true);
  pairs.push({
    color: darkerAA,
    contrast: getContrastRatio(baseColor, darkerAA),
    role: "Text on Light Background"
  });

  // Generate a lighter variant for AA compliance
  const lighterAA = findAccessibleVariant(baseColor, 4.5, false);
  pairs.push({
    color: lighterAA,
    contrast: getContrastRatio(baseColor, lighterAA),
    role: "Text on Dark Background"
  });

  // Generate an accent color (complementary)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const complementaryHue = (hsl.h + 180) % 360;
  const complementary = hslToHex(complementaryHue, hsl.s, hsl.l);
  pairs.push({
    color: complementary,
    contrast: getContrastRatio(baseColor, complementary),
    role: "Accent Color"
  });

  return pairs;
}

// RGB to HSL conversion
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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
    h *= 60;
  }

  return { h, s, l };
}

// HSL to Hex conversion
function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  s = s / 100;
  l = l / 100;

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hue2rgb(p, q, (h / 360 + 1/3) % 1) * 255);
  const g = Math.round(hue2rgb(p, q, (h / 360) % 1) * 255);
  const b = Math.round(hue2rgb(p, q, (h / 360 - 1/3) % 1) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Add new color harmony utility functions
function getColorHarmony(baseColor: string): {
  analogous: string[];
  complementary: string[];
  triadic: string[];
  tetradic: string[];
  split: string[];
  monochromatic: string[];
} {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return {
    analogous: [],
    complementary: [],
    triadic: [],
    tetradic: [],
    split: [],
    monochromatic: []
  };

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  // Generate harmonious colors
  return {
    analogous: [
      hslToHex((hsl.h - 30 + 360) % 360, hsl.s * 100, hsl.l * 100),
      hslToHex((hsl.h + 30) % 360, hsl.s * 100, hsl.l * 100)
    ],
    complementary: [
      hslToHex((hsl.h + 180) % 360, hsl.s * 100, hsl.l * 100)
    ],
    triadic: [
      hslToHex((hsl.h + 120) % 360, hsl.s * 100, hsl.l * 100),
      hslToHex((hsl.h + 240) % 360, hsl.s * 100, hsl.l * 100)
    ],
    tetradic: [
      hslToHex((hsl.h + 90) % 360, hsl.s * 100, hsl.l * 100),
      hslToHex((hsl.h + 180) % 360, hsl.s * 100, hsl.l * 100),
      hslToHex((hsl.h + 270) % 360, hsl.s * 100, hsl.l * 100)
    ],
    split: [
      hslToHex((hsl.h + 150) % 360, hsl.s * 100, hsl.l * 100),
      hslToHex((hsl.h + 210) % 360, hsl.s * 100, hsl.l * 100)
    ],
    monochromatic: [
      hslToHex(hsl.h, hsl.s * 100, Math.max(20, hsl.l * 100 - 30)),
      hslToHex(hsl.h, Math.max(50, hsl.s * 100 - 20), hsl.l * 100),
      hslToHex(hsl.h, hsl.s * 100, Math.min(90, hsl.l * 100 + 30))
    ]
  };
}

// Add color role analysis
function analyzeColorRole(color: string, colors: string[]): string {
  const rgb = hexToRgb(color);
  if (!rgb) return "Unknown";
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  // Analyze color characteristics
  const isBright = hsl.l > 0.8;
  const isDark = hsl.l < 0.2;
  const isNeutral = hsl.s < 0.15;
  const isVibrant = hsl.s > 0.8;
  
  // Check contrast with other colors
  const hasGoodContrastWithLight = getContrastRatio(color, "#FFFFFF") >= 4.5;
  const hasGoodContrastWithDark = getContrastRatio(color, "#000000") >= 4.5;
  
  // Determine role based on characteristics
  if (isNeutral) {
    if (isBright) return "Background / Light Neutral";
    if (isDark) return "Text / Dark Neutral";
    return "Mid-tone Neutral";
  }
  
  if (isVibrant) {
    if (hasGoodContrastWithLight && hasGoodContrastWithDark) {
      return "Primary Action / Brand";
    }
    return "Accent / Highlight";
  }
  
  if (isBright) return "Light Shade / Background Variant";
  if (isDark) return "Dark Shade / Text";
  
  return "Mid-tone / Secondary";
}

function determineColorRole(color: string, hsl: { h: number; s: number; l: number }, allColors: string[]): ColorAnalysis['role'] {
  const { l: lightness, s: saturation } = hsl;
  
  // First, identify background colors (very light colors)
  if (lightness > 0.9) {
    return 'background';
  }
  
  // Then identify text colors (very dark colors)
  if (lightness < 0.2) {
    return 'text';
  }

  // For remaining colors, calculate their prominence score
  const prominenceScore = calculateProminenceScore(color, hsl, allColors);
  
  // If we don't have a primary color yet, the most prominent color becomes primary
  const existingPrimary = allColors.find(c => {
    const otherHsl = rgbToHsl(...Object.values(hexToRgb(c)!));
    const otherScore = calculateProminenceScore(c, otherHsl, allColors);
    return otherScore > prominenceScore;
  });

  // The most vibrant and contrasting color should be primary
  if (!existingPrimary && saturation > 0.5 && lightness >= 0.3 && lightness <= 0.7) {
    return 'primary';
  }

  // Colors with good saturation but not primary become accent
  if (saturation > 0.4) {
    return 'accent';
  }

  // Everything else is secondary
  return 'secondary';
}

// Helper function to calculate how prominent a color is
function calculateProminenceScore(color: string, hsl: { h: number; s: number; l: number }, allColors: string[]): number {
  let score = 0;
  
  // Vibrancy adds to prominence
  score += hsl.s * 2; // Saturation is important
  
  // Mid-range lightness is good for primary colors
  const lightnessScore = 1 - Math.abs(0.5 - hsl.l);
  score += lightnessScore;
  
  // Good contrast with other colors adds to prominence
  const contrastScores = allColors.map(otherColor => {
    if (otherColor === color) return 0;
    return getContrastRatio(color, otherColor);
  });
  
  const avgContrast = contrastScores.reduce((a, b) => a + b, 0) / contrastScores.length;
  score += avgContrast / 5; // Normalize contrast score
  
  return score;
}

function analyzeEntirePalette(colors: string[]): Map<string, ColorAnalysis> {
  const analysis = new Map<string, ColorAnalysis>();
  
  // First pass: Calculate prominence scores and basic analysis
  const colorScores = new Map<string, number>();
  colors.forEach(color => {
    const rgb = hexToRgb(color);
    if (!rgb) return;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const score = calculateProminenceScore(color, hsl, colors);
    colorScores.set(color, score);
  });

  // Sort colors by prominence score
  const sortedColors = [...colorScores.entries()]
    .sort((a, b) => b[1] - a[1]);

  // Second pass: Assign roles ensuring we have a primary color
  let hasPrimary = false;
  
  sortedColors.forEach(([color], index) => {
    const rgb = hexToRgb(color);
    if (!rgb) return;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    let role: ColorAnalysis['role'];
    
    if (!hasPrimary && index === 0) {
      // Force the most prominent color to be primary if no clear primary exists
      role = 'primary';
      hasPrimary = true;
    } else {
      role = determineColorRole(color, hsl, colors);
      if (role === 'primary') {
        hasPrimary = true;
      }
    }

    const usage = suggestColorUsage(color, role, colors);
    const contrastIssues = colors
      .filter(c => c !== color)
      .map(otherColor => ({
        withColor: otherColor,
        ratio: getContrastRatio(color, otherColor),
        severity: getContrastSeverity(color, otherColor)
      }))
      .filter(issue => issue.severity !== 'good');
    
    analysis.set(color, {
      color,
      contrastWithWhite: getContrastRatio(color, "#ffffff"),
      contrastWithBlack: getContrastRatio(color, "#000000"),
      suggestedPairs: generateAccessiblePairs(color),
      wcagStatus: {
        AANormal: Math.max(getContrastRatio(color, "#ffffff"), getContrastRatio(color, "#000000")) >= 4.5,
        AALarge: Math.max(getContrastRatio(color, "#ffffff"), getContrastRatio(color, "#000000")) >= 3,
        AAANormal: Math.max(getContrastRatio(color, "#ffffff"), getContrastRatio(color, "#000000")) >= 7,
        AAALarge: Math.max(getContrastRatio(color, "#ffffff"), getContrastRatio(color, "#000000")) >= 4.5,
      },
      role,
      usage,
      contrastIssues,
      suggestedPairings: [],
      harmonies: getColorHarmony(color)
    });
  });

  // Third pass: If we still don't have a primary color, promote the most suitable accent
  if (!hasPrimary) {
    const suitableForPrimary = Array.from(analysis.entries())
      .find(([_, data]) => 
        data.role === 'accent' && 
        data.wcagStatus.AANormal && 
        data.contrastIssues.length === 0
      );
    
    if (suitableForPrimary) {
      const [color, data] = suitableForPrimary;
      data.role = 'primary';
      analysis.set(color, data);
    }
  }
  
  return analysis;
}

function suggestColorUsage(color: string, role: ColorAnalysis['role'], allColors: string[]): string[] {
  const usage: string[] = [];
  const contrastWithWhite = getContrastRatio(color, "#ffffff");
  const contrastWithBlack = getContrastRatio(color, "#000000");
  
  switch (role) {
    case 'primary':
      usage.push('Main brand color');
      if (contrastWithWhite >= 4.5) usage.push('Button text on light backgrounds');
      if (contrastWithBlack >= 4.5) usage.push('Button text on dark backgrounds');
      break;
    case 'background':
      usage.push('Page background');
      usage.push('Card background');
      if (contrastWithBlack >= 4.5) usage.push('Light mode container');
      break;
    case 'text':
      if (contrastWithWhite >= 4.5) usage.push('Text on light backgrounds');
      if (contrastWithBlack >= 4.5) usage.push('Text on dark backgrounds');
      break;
    // ... more cases
  }
  
  return usage;
}

function getContrastSeverity(color1: string, color2: string): 'critical' | 'moderate' | 'good' {
  const ratio = getContrastRatio(color1, color2);
  if (ratio < 3) return 'critical';
  if (ratio < 4.5) return 'moderate';
  return 'good';
}

function suggestColorPairings(
  color: string,
  analysis: ColorAnalysis,
  allColors: string[],
  paletteAnalysis: Map<string, ColorAnalysis>
): Array<{ color: string; role: string; purpose: string }> {
  // Get AI suggestions first
  const aiSuggestions = generateAISuggestions(color, analysis, allColors, paletteAnalysis);
  const pairings: Array<{ color: string; role: string; purpose: string }> = [];
  
  // Use AI suggestions that meet our contrast requirements
  aiSuggestions.forEach(suggestion => {
    // Only use suggestions that have good contrast with ALL existing colors
    const hasGoodContrastWithAll = allColors.every(existingColor => 
      getContrastRatio(suggestion.color, existingColor) >= 4.5
    );
    
    if (hasGoodContrastWithAll && suggestion.confidence > 0.7) {
      pairings.push({
        color: suggestion.color,
        role: suggestion.expectedUsage[0],
        purpose: suggestion.rationale
      });
    }
  });

  // If we don't have enough high-quality AI suggestions, generate additional ones
  if (pairings.length < 3) {
    const baseColor = allColors[0];
    const harmony = getColorHarmony(baseColor);
    
    // Generate and validate harmonious colors
    const validateAndAddColor = (candidateColor: string, role: string, purpose: string) => {
      const hasGoodContrastWithAll = allColors.every(existingColor => 
        getContrastRatio(candidateColor, existingColor) >= 4.5
      );
      
      if (hasGoodContrastWithAll) {
        pairings.push({ color: candidateColor, role, purpose });
      } else {
        // Try to adjust the color to meet contrast requirements
        const adjustedColor = findAccessibleVariant(
          candidateColor,
          4.5,
          getLuminance(hexToRgb(candidateColor)!.r, hexToRgb(candidateColor)!.g, hexToRgb(candidateColor)!.b) > 0.5
        );
        
        if (allColors.every(existingColor => getContrastRatio(adjustedColor, existingColor) >= 4.5)) {
          pairings.push({ color: adjustedColor, role, purpose });
        }
      }
    };

    // Add harmonious colors that meet contrast requirements
    harmony.complementary.forEach(color => 
      validateAndAddColor(color, "Complementary", "Strong visual contrast while maintaining harmony")
    );
    
    harmony.analogous.forEach(color => 
      validateAndAddColor(color, "Analogous", "Subtle variation that maintains visual harmony")
    );
    
    harmony.monochromatic.forEach(color => 
      validateAndAddColor(color, "Monochromatic", "Consistent theme with different intensities")
    );
  }

  return pairings.slice(0, 5); // Return top 5 suggestions
}

function generateAISuggestions(
  color: string,
  analysis: ColorAnalysis,
  allColors: string[],
  paletteAnalysis: Map<string, ColorAnalysis>
): AIColorSuggestion[] {
  const suggestions: AIColorSuggestion[] = [];
  const rgb = hexToRgb(color);
  if (!rgb) return suggestions;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  // Enhanced scoring function for suggestions
  const evaluateSuggestion = (suggested: string): number => {
    let score = 0;
    
    // Contrast evaluation (highest priority)
    const contrastScores = allColors.map(existing => getContrastRatio(suggested, existing));
    const minContrast = Math.min(...contrastScores);
    score += minContrast >= 4.5 ? 3 : minContrast >= 3 ? 1 : 0;
    
    // Color harmony evaluation
    const harmony = getColorHarmony(suggested);
    const harmonious = allColors.some(existing => 
      harmony.analogous.includes(existing) || 
      harmony.complementary.includes(existing)
    );
    score += harmonious ? 2 : 0;
    
    // Role compatibility
    const suggestedHsl = rgbToHsl(...Object.values(hexToRgb(suggested)!));
    const roleCompatibility = Math.abs(suggestedHsl.l - hsl.l) < 0.2 ? 1 : 0;
    score += roleCompatibility;
    
    return score;
  };
  
  // Generate sophisticated variations
  const generateVariations = () => {
    const variations: Array<{ color: string; purpose: string }> = [];
    
    // Contrast-based variations
    for (let l = 10; l <= 90; l += 10) {
      const newColor = hslToHex(hsl.h, hsl.s * 100, l);
      variations.push({
        color: newColor,
        purpose: l < hsl.l * 100 ? 'Darker accessible variant' : 'Lighter accessible variant'
      });
    }
    
    // Harmony-based variations
    const harmony = getColorHarmony(color);
    harmony.analogous.forEach(analogous => {
      variations.push({
        color: analogous,
        purpose: 'Harmonious companion'
      });
    });
    
    harmony.complementary.forEach(complementary => {
      variations.push({
        color: complementary,
        purpose: 'High-impact contrast color'
      });
    });
    
    // Saturation variations
    for (let s = 20; s <= 100; s += 20) {
      const newColor = hslToHex(hsl.h, s, hsl.l * 100);
      variations.push({
        color: newColor,
        purpose: s < hsl.s * 100 ? 'Muted variant' : 'Vibrant variant'
      });
    }
    
    return variations;
  };
  
  // Process and filter variations
  const variations = generateVariations();
  variations.forEach(variation => {
    const score = evaluateSuggestion(variation.color);
    if (score >= 3) { // Only include high-quality suggestions
      const contrastScores = {
        withExisting: allColors.map(existing => ({
          color: existing,
          ratio: getContrastRatio(variation.color, existing)
        })),
        withText: getContrastRatio(variation.color, '#000000'),
        withBackground: getContrastRatio(variation.color, '#FFFFFF')
      };
      
      suggestions.push({
        color: variation.color,
        confidence: score / 6, // Normalize to 0-1
        rationale: `AI-optimized ${variation.purpose.toLowerCase()} that ensures WCAG compliance and maintains harmony`,
        expectedUsage: suggestColorUsage(variation.color, analysis.role, allColors),
        contrastScores
      });
    }
  });
  
  // Sort by confidence and ensure no duplicate colors
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .filter((suggestion, index, self) => 
      index === self.findIndex(s => s.color === suggestion.color)
    );
}

function ColorSuggestionCard({ suggestion, onApply }: {
  suggestion: AIColorSuggestion;
  onApply: (color: string) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <div
          className="w-16 h-16 rounded-lg border"
          style={{ backgroundColor: suggestion.color }}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="font-medium">{suggestion.color}</div>
            <div className="text-sm text-muted-foreground">
              {(suggestion.confidence * 100).toFixed(0)}% confidence
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {suggestion.rationale}
          </p>
          <div className="mt-2">
            <Label className="text-xs">Suggested Usage:</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {suggestion.expectedUsage.map((usage, i) => (
                <Badge key={`${suggestion.color}-usage-${i}`} variant="secondary" className="text-xs">
                  {usage}
                </Badge>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Contrast Scores:</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {suggestion.contrastScores.withExisting.map((score, i) => (
                <div key={`${suggestion.color}-score-${i}`} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-3 h-3 rounded-sm border"
                    style={{ backgroundColor: score.color }}
                  />
                  <span className={score.ratio >= 4.5 ? 'text-green-600' : 'text-red-600'}>
                    {score.ratio.toFixed(1)}:1
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Button
            className="w-full mt-3"
            size="sm"
            onClick={() => onApply(suggestion.color)}
          >
            Apply This Color
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Function to generate color enhancements based on type
function generateEnhancements(baseColor: string, type: 'contrast' | 'harmony' | 'shades'): Array<{
  color: string;
  name: string;
  description: string;
}> {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return [];
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const results: Array<{ color: string; name: string; description: string; }> = [];

  switch (type) {
    case 'contrast':
      // Generate higher contrast variations
      const darkerVariant = findAccessibleVariant(baseColor, 4.5, true);
      const lighterVariant = findAccessibleVariant(baseColor, 4.5, false);
      
      results.push({
        color: darkerVariant,
        name: 'Darker Variant',
        description: 'Higher contrast for text on light backgrounds'
      });
      
      results.push({
        color: lighterVariant,
        name: 'Lighter Variant',
        description: 'Higher contrast for text on dark backgrounds'
      });
      break;

    case 'harmony':
      // Generate harmonious colors
      const harmony = getColorHarmony(baseColor);
      
      harmony.analogous.forEach((color, i) => {
        results.push({
          color,
          name: `Analogous ${i + 1}`,
          description: 'Colors adjacent on the color wheel'
        });
      });
      
      harmony.complementary.forEach(color => {
        results.push({
          color,
          name: 'Complementary',
          description: 'Opposite on the color wheel for maximum contrast'
        });
      });
      break;

    case 'shades':
      // Generate monochromatic variations
      for (let l = 20; l <= 80; l += 20) {
        const shade = hslToHex(hsl.h, hsl.s * 100, l);
        results.push({
          color: shade,
          name: l < hsl.l * 100 ? 'Darker Shade' : 'Lighter Shade',
          description: `${l}% lightness variation`
        });
      }
      break;
  }

  return results;
}

function generateColorPairRecommendations(colors: string[], analysis: Map<string, ColorAnalysis>): ColorPairRecommendation[] {
  const recommendations: ColorPairRecommendation[] = [];
  
  // Get all possible pairs
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const color1 = colors[i];
      const color2 = colors[j];
      const contrast = getContrastRatio(color1, color2);
      
      // Only consider pairs with good contrast
      if (contrast >= 4.5) {
        const color1Analysis = analysis.get(color1);
        const color2Analysis = analysis.get(color2);
        
        if (color1Analysis && color2Analysis) {
          // Score this pair based on various factors
          let priority = 0;
          priority += contrast >= 7 ? 2 : 1; // Higher contrast gets priority
          priority += color1Analysis.wcagStatus.AAANormal ? 1 : 0;
          priority += color2Analysis.wcagStatus.AAANormal ? 1 : 0;
          
          // Check if colors are harmonious
          const harmony = getColorHarmony(color1);
          if (harmony.complementary.includes(color2) || 
              harmony.analogous.includes(color2)) {
            priority += 1;
          }
          
          // Suggest usage based on properties
          const color1Luminance = getLuminance(
            hexToRgb(color1)!.r,
            hexToRgb(color1)!.g,
            hexToRgb(color1)!.b
          );
          const color2Luminance = getLuminance(
            hexToRgb(color2)!.r,
            hexToRgb(color2)!.g,
            hexToRgb(color2)!.b
          );
          
          // Primary CTAs and Important UI Elements
          if (contrast >= 7) {
            recommendations.push({
              primaryColor: color1Luminance > color2Luminance ? color2 : color1,
              secondaryColor: color1Luminance > color2Luminance ? color1 : color2,
              purpose: "Primary Call-to-Action",
              contrastRatio: contrast,
              priority: priority + 3,
              example: "Buttons, Important Links"
            });
          }
          
          // Text and Background
          if (contrast >= 4.5) {
            recommendations.push({
              primaryColor: color1Luminance > color2Luminance ? color1 : color2,
              secondaryColor: color1Luminance > color2Luminance ? color2 : color1,
              purpose: "Content Sections",
              contrastRatio: contrast,
              priority: priority + 2,
              example: "Text Content, Cards, Sections"
            });
          }
          
          // Navigation and Headers
          if (contrast >= 4.5) {
            recommendations.push({
              primaryColor: color1,
              secondaryColor: color2,
              purpose: "Navigation Elements",
              contrastRatio: contrast,
              priority: priority + 1,
              example: "Navigation Bars, Headers"
            });
          }
          
          // Accent Elements
          if (contrast >= 4.5) {
            recommendations.push({
              primaryColor: color2,
              secondaryColor: color1,
              purpose: "Accent Elements",
              contrastRatio: contrast,
              priority: priority,
              example: "Icons, Borders, Highlights"
            });
          }
        }
      }
    }
  }
  
  // Sort by priority and contrast ratio
  return recommendations.sort((a, b) => 
    b.priority === a.priority ? 
      b.contrastRatio - a.contrastRatio : 
      b.priority - a.priority
  );
}

function analyzeColorImpact(
  newColor: string,
  existingColors: string[],
  paletteAnalysis: Map<string, ColorAnalysis>
): {
  overallImpact: number;
  improvedContrasts: number;
  maintainsHarmony: boolean;
  newContrastIssues: number;
} {
  let improvedContrasts = 0;
  let newContrastIssues = 0;
  const existingContrastIssues = existingColors.flatMap((color1, i) =>
    existingColors.slice(i + 1).map(color2 => ({
      colors: [color1, color2],
      ratio: getContrastRatio(color1, color2)
    }))
  ).filter(pair => pair.ratio < 4.5).length;

  // Check contrast with all existing colors
  existingColors.forEach(existingColor => {
    const contrast = getContrastRatio(newColor, existingColor);
    if (contrast >= 4.5) improvedContrasts++;
    if (contrast < 3) newContrastIssues++;
  });

  // Check color harmony
  const maintainsHarmony = existingColors.some(existingColor => {
    const harmony = getColorHarmony(existingColor);
    return harmony.analogous.includes(newColor) ||
           harmony.complementary.includes(newColor) ||
           harmony.monochromatic.includes(newColor);
  });

  const overallImpact = (improvedContrasts * 2) + 
                       (maintainsHarmony ? 3 : 0) - 
                       (newContrastIssues * 3);

  return {
    overallImpact,
    improvedContrasts,
    maintainsHarmony,
    newContrastIssues
  };
}

function generatePaletteImprovements(
  colors: string[],
  paletteAnalysis: Map<string, ColorAnalysis>,
  lowContrastPair: { color1: string; color2: string; ratio: number },
  selectedBackground: string | null
): ColorImprovement[] {
  const improvements: ColorImprovement[] = [];
  
  // Function to evaluate a potential new color
  const evaluateColor = (
    candidateColor: string,
    type: 'add' | 'replace',
    targetColor?: string
  ): ColorImprovement | null => {
    const testColors = type === 'add' 
      ? [...colors, candidateColor]
      : colors.map(c => c === targetColor ? candidateColor : c);

    const impact = analyzeColorImpact(candidateColor, colors, paletteAnalysis);
    
    // If we have a background color, ensure good contrast with it
    if (selectedBackground) {
      const bgContrast = getContrastRatio(candidateColor, selectedBackground);
      if (bgContrast < 4.5) return null;
    }

    // Don't suggest colors that would create new contrast issues
    if (impact.newContrastIssues > 0) return null;

    // Calculate confidence based on various factors
    let confidence = (
      (impact.improvedContrasts / colors.length) * 0.4 +
      (impact.maintainsHarmony ? 0.3 : 0) +
      (impact.overallImpact > 0 ? 0.3 : 0)
    );

    // Boost confidence if it improves contrast with background
    if (selectedBackground) {
      const bgContrast = getContrastRatio(candidateColor, selectedBackground);
      if (bgContrast >= 7) confidence += 0.2;
      else if (bgContrast >= 4.5) confidence += 0.1;
    }

    // Only suggest improvements with good confidence
    if (confidence < 0.5) return null;

    return {
      type,
      color: candidateColor,
      targetColor,
      confidence,
      rationale: type === 'add'
        ? "This color enhances the palette's contrast while maintaining harmony"
        : "This replacement improves contrast issues while preserving the palette's balance",
      contrastScores: {
        withExisting: colors.map(c => ({
          color: c,
          ratio: getContrastRatio(candidateColor, c)
        })),
        withText: getContrastRatio(candidateColor, '#000000'),
        withBackground: selectedBackground 
          ? getContrastRatio(candidateColor, selectedBackground)
          : getContrastRatio(candidateColor, '#FFFFFF')
      },
      impactScore: impact.overallImpact
    };
  };

  // Generate potential improvements
  const { color1, color2 } = lowContrastPair;
  const harmony1 = getColorHarmony(color1);
  const harmony2 = getColorHarmony(color2);

  // Try adding harmonious colors first
  [...harmony1.complementary, ...harmony1.analogous, ...harmony2.complementary, ...harmony2.analogous]
    .filter(c => !colors.includes(c))
    .forEach(harmoniousColor => {
      const improvement = evaluateColor(harmoniousColor, 'add');
      if (improvement) improvements.push(improvement);
    });

  // Only suggest replacements if adding new colors doesn't solve the issues
  if (improvements.length < 2) {
    // Try replacing the color that has more contrast issues
    const color1Issues = Array.from(paletteAnalysis.get(color1)?.contrastIssues || []).length;
    const color2Issues = Array.from(paletteAnalysis.get(color2)?.contrastIssues || []).length;
    
    // Don't replace the background color
    const colorToReplace = selectedBackground === color1 ? color2 :
                          selectedBackground === color2 ? color1 :
                          color1Issues > color2Issues ? color1 : color2;

    const variations = [
      findAccessibleVariant(colorToReplace, 4.5, true),
      findAccessibleVariant(colorToReplace, 4.5, false),
      ...getColorHarmony(colorToReplace).complementary
    ];

    variations.forEach(variant => {
      const improvement = evaluateColor(variant, 'replace', colorToReplace);
      if (improvement) improvements.push(improvement);
    });
  }

  // Sort by impact score and confidence
  return improvements
    .sort((a, b) => 
      (b.impactScore * b.confidence) - (a.impactScore * a.confidence)
    )
    .slice(0, 4);
}

function UIPreview({ 
  colors, 
  paletteAnalysis, 
  currentPaletteAnalysis,
  showImprovements,
  toggleImprovements,
  setColors,
  selectedBackground,
  generatePaletteImprovements
}: UIPreviewProps) {
  if (colors.length < 2) return null;

  // Enhanced color selection logic
  const findBestColorPair = (purpose: 'text' | 'button' | 'accent' | 'navigation', preferredMinContrast: number = 4.5) => {
    type ColorPairScore = {
      background: string;
      foreground: string;
      contrast: number;
      score: number;
    };

    // If we have a selected background and it's appropriate for the purpose, prioritize it
    if (selectedBackground && ['text', 'button', 'navigation'].includes(purpose)) {
      const bestForeground = colors
        .filter(c => c !== selectedBackground)
        .map(color => ({
          color,
          contrast: getContrastRatio(selectedBackground, color),
          analysis: paletteAnalysis.get(color)
        }))
        .sort((a, b) => b.contrast - a.contrast)[0];

      if (bestForeground && bestForeground.contrast >= preferredMinContrast) {
        return {
          background: selectedBackground,
          foreground: bestForeground.color,
          contrast: bestForeground.contrast,
          score: bestForeground.contrast >= 7 ? 5 : 4
        };
      }
    }

    let bestPair: ColorPairScore = {
      background: colors[0],
      foreground: colors[1],
      contrast: getContrastRatio(colors[0], colors[1]),
      score: 0
    };

    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < colors.length; j++) {
        if (i === j) continue;

        const bg = colors[i];
        const fg = colors[j];
        const contrast = getContrastRatio(bg, fg);
        let score = 0;

        // Base score from contrast
        if (contrast >= preferredMinContrast) {
          score += 2;
        } else if (contrast >= 3) {
          score += 1;
        }

        // Additional scoring based on purpose
        const bgAnalysis = paletteAnalysis.get(bg);
        const fgAnalysis = paletteAnalysis.get(fg);

        if (bgAnalysis && fgAnalysis) {
          switch (purpose) {
            case 'text':
              if (fgAnalysis.role === 'text') score += 2;
              if (bgAnalysis.role === 'background') score += 2;
              if (contrast >= 7) score += 1;
              break;

            case 'button':
              if (fgAnalysis.role === 'primary' || fgAnalysis.role === 'accent') score += 2;
              if (contrast >= 4.5) score += 1;
              break;

            case 'accent':
              if (fgAnalysis.role === 'accent') score += 2;
              if (contrast >= 3 && contrast < 4.5) score += 1;
              break;

            case 'navigation':
              if (contrast >= 4.5 && contrast < 7) score += 1;
              if (bgAnalysis.role === 'background' || bgAnalysis.role === 'primary') score += 1;
              break;
          }
        }

        if (score > bestPair.score || (score === bestPair.score && contrast > bestPair.contrast)) {
          bestPair = { background: bg, foreground: fg, contrast, score };
        }
      }
    }

    return bestPair;
  };

  // Get optimal color pairs for different purposes
  const textPair = findBestColorPair('text', 7);
  const buttonPair = findBestColorPair('button', 4.5);
  const accentPair = findBestColorPair('accent', 3);
  const navPair = findBestColorPair('navigation', 4.5);

  // Find a muted background color
  const getMutedBackground = () => {
    if (selectedBackground) return selectedBackground;
    
    const bgColor = colors.find(color => {
      const analysis = paletteAnalysis.get(color);
      return analysis?.role === 'background';
    }) || textPair.background;
    return bgColor;
  };

  const mutedBg = getMutedBackground();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle>UI Preview</CardTitle>
        <CardDescription>
          {selectedBackground ? 
            `Preview with ${selectedBackground} as background` : 
            'Test your colors in realistic UI scenarios'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {/* Navigation Bar */}
          <div 
            className="p-4"
            style={{ backgroundColor: selectedBackground || navPair.background }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div 
                  className="text-xl font-bold"
                  style={{ color: navPair.foreground }}
                >
                  Brand Logo
                </div>
                <nav 
                  className="hidden md:flex items-center gap-6 text-sm"
                  style={{ color: navPair.foreground }}
                >
                  <a className="font-medium hover:opacity-80">Products</a>
                  <a className="hover:opacity-80">Features</a>
                  <a className="hover:opacity-80">Pricing</a>
                  <a className="hover:opacity-80">About</a>
                </nav>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="hidden md:flex"
                  style={{ color: buttonPair.foreground }}
                >
                  Log in
                </Button>
                <Button
                  style={{
                    backgroundColor: buttonPair.foreground,
                    color: buttonPair.background
                  }}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div 
            className="p-8"
            style={{ backgroundColor: selectedBackground || mutedBg }}
          >
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h1 
                className="text-4xl font-bold"
                style={{ color: textPair.foreground }}
              >
                Welcome to Our Platform
              </h1>
              <p 
                className="text-lg"
                style={{ color: textPair.foreground }}
              >
                Experience how your colors work with different text sizes and weights. 
                Good contrast ensures readability across all content.
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  size="lg"
                  style={{
                    backgroundColor: buttonPair.foreground,
                    color: buttonPair.background
                  }}
                >
                  Primary Action
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  style={{
                    borderColor: buttonPair.foreground,
                    color: buttonPair.foreground
                  }}
                >
                  Secondary Action
                </Button>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
            {/* Feature Card */}
            <div 
              className="p-6"
              style={{ backgroundColor: selectedBackground || textPair.background }}
            >
              <div 
                className="w-10 h-10 rounded-full mb-4 flex items-center justify-center"
                style={{ 
                  backgroundColor: accentPair.background,
                  color: accentPair.foreground
                }}
              >
                ★
              </div>
              <h3 
                className="text-xl font-semibold mb-2"
                style={{ color: textPair.foreground }}
              >
                Feature Highlight
              </h3>
              <p 
                className="mb-4 text-sm"
                style={{ color: textPair.foreground }}
              >
                Test how your colors work with different content types and hierarchies.
                This text should be easily readable.
              </p>
              <Button
                variant="ghost"
                className="text-sm"
                style={{ color: buttonPair.foreground }}
              >
                Learn more →
              </Button>
            </div>

            {/* Form Card */}
            <div 
              className="p-6"
              style={{ backgroundColor: selectedBackground || textPair.background }}
            >
              <form className="space-y-4">
                <div>
                  <Label
                    style={{ color: textPair.foreground }}
                  >
                    Email Address
                  </Label>
                  <Input 
                    className="mt-1"
                    placeholder="Enter your email"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: accentPair.foreground,
                      color: textPair.foreground
                    }}
                  />
                </div>
                <div>
                  <Label
                    style={{ color: textPair.foreground }}
                  >
                    Message
                  </Label>
                  <textarea 
                    className="mt-1 w-full rounded-md border p-2 min-h-[80px]"
                    placeholder="Your message here"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: accentPair.foreground,
                      color: textPair.foreground
                    }}
                  />
                </div>
                <Button
                  className="w-full"
                  style={{
                    backgroundColor: buttonPair.foreground,
                    color: buttonPair.background
                  }}
                >
                  Submit Form
                </Button>
              </form>
            </div>
          </div>

          {/* Alert Examples */}
          <div 
            className="p-4 space-y-3"
            style={{ backgroundColor: selectedBackground || mutedBg }}
          >
            {/* Success Alert */}
            <div 
              className="rounded border flex items-center gap-3 p-3"
              style={{ 
                backgroundColor: accentPair.background,
                borderColor: accentPair.foreground
              }}
            >
              <div 
                className="text-sm flex-1"
                style={{ color: accentPair.foreground }}
              >
                Success! This is how alerts and notifications will appear.
              </div>
              <Button
                variant="ghost"
                size="sm"
                style={{ color: accentPair.foreground }}
              >
                Action
              </Button>
            </div>

            {/* Info Alert */}
            <div 
              className="rounded border flex items-center gap-3 p-3"
              style={{ 
                backgroundColor: mutedBg,
                borderColor: textPair.foreground
              }}
            >
              <div 
                className="text-sm flex-1"
                style={{ color: textPair.foreground }}
              >
                This is an informational message with different styling.
              </div>
              <Button
                variant="outline"
                size="sm"
                style={{ 
                  borderColor: textPair.foreground,
                  color: textPair.foreground
                }}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add these default color swatches after the interfaces
const DEFAULT_COLOR_SWATCHES = [
  '#0F172A', // Slate 900
  '#1E293B', // Slate 800
  '#334155', // Slate 700
  '#475569', // Slate 600
  '#64748B', // Slate 500
  '#E2E8F0', // Slate 200
  '#F1F5F9', // Slate 100
  '#F8FAFC', // Slate 50
  '#0EA5E9', // Sky 500
  '#06B6D4', // Cyan 500
  '#10B981', // Emerald 500
  '#84CC16', // Lime 500
  '#EAB308', // Yellow 500
  '#F97316', // Orange 500
  '#EF4444', // Red 500
  '#EC4899', // Pink 500
];

export default function ColorAnalyzer() {
  const [colors, setColors] = useState<string[]>(['#0F172A', '#E2E8F0']);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [hexInputs, setHexInputs] = useState<string[]>(['#0F172A', '#E2E8F0']);
  const [paletteAnalysis, setPaletteAnalysis] = useState<Map<string, ColorAnalysis>>(new Map());
  const [currentPaletteAnalysis, setCurrentPaletteAnalysis] = useState<PaletteAnalysis | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate'>('analyze');

  // Update hex validation to be more flexible
  const isValidHex = (color: string) => {
    // Remove # if present
    const hex = color.startsWith('#') ? color.slice(1) : color;
    
    // Check if it's a valid 6-digit hex
    return /^[0-9A-Fa-f]{6}$/.test(hex);
  };

  // Update hex input for a specific swatch
  const updateHexInput = (index: number, value: string) => {
    // Always update the hex input
    const newHexInputs = [...hexInputs];
    newHexInputs[index] = value.toUpperCase();
    setHexInputs(newHexInputs);

    // Try to format the hex value
    let formattedHex = value.startsWith('#') ? value : `#${value}`;
    formattedHex = formattedHex.toUpperCase();

    // Update colors array even with partial input
    const newColors = [...colors];
    if (value.length >= 3) { // Update once we have at least 3 characters
      // If we have a 3-digit hex, expand it to 6 digits
      if (value.length === 3 || value.length === 4) {
        const hex = value.replace('#', '');
        formattedHex = `#${hex.split('').map(c => c + c).join('')}`;
      }
      newColors[index] = formattedHex;
      setColors(newColors);
    }

    // Only run full analysis when we have a valid 6-digit hex
    if (isValidHex(value)) {
      analyzePalette(newColors);
    }
  };

  // Handle color selection from picker or swatches
  const handleColorSelection = (index: number, color: string) => {
    const formattedColor = color.toUpperCase();
    const newColors = [...colors];
    newColors[index] = formattedColor;
    setColors(newColors);
    
    const newHexInputs = [...hexInputs];
    newHexInputs[index] = formattedColor;
    setHexInputs(newHexInputs);
    
    analyzePalette(newColors);
  };

  // Initial analysis
  useEffect(() => {
    analyzePalette();
  }, []);

  // Function to analyze the palette
  const analyzePalette = (colorsToAnalyze: string[] = colors) => {
    if (!colorsToAnalyze[0] || !colorsToAnalyze[1]) return;
    
    const analysis = analyzeEntirePalette(colorsToAnalyze);
    setPaletteAnalysis(analysis);

    const ratio = getContrastRatio(colorsToAnalyze[0], colorsToAnalyze[1]);
    const pair = {
      color1: colorsToAnalyze[0],
      color2: colorsToAnalyze[1],
      ratio
    };
    
    const contrastRatios = [pair];
    const lowContrastPairs = [];
    let severityPenalty = 0;
    
    if (ratio < 4.5) {
      lowContrastPairs.push(pair);
      if (ratio < 2) severityPenalty += 30;
      else if (ratio < 3) severityPenalty += 20;
      else severityPenalty += 10;
    }

    const overallScore = Math.max(0, Math.min(100, 100 - severityPenalty));
    
    setCurrentPaletteAnalysis({
      overallScore,
      contrastRatios,
      lowContrastPairs
    });
  };

  return (
    <div className="min-h-screen">
      <main>
        <div className="container py-6">
          {activeTab === 'generate' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Color Palettes</CardTitle>
                  <CardDescription>
                    Create harmonious color combinations automatically
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Generate Palettes content */}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'analyze' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Color Analyzer</CardTitle>
                    <CardDescription>Analyze the accessibility and contrast of your color combination</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Color Selection Section */}
                    <div className="grid grid-cols-2 gap-4">
                      {[0, 1].map((index) => (
                        <div key={index} className="space-y-2">
                          <Label>Color {index + 1}</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <div
                                className="h-20 rounded-lg border cursor-pointer transition-all hover:ring-2 hover:ring-primary flex items-center justify-center relative"
                                style={{
                                  backgroundColor: colors[index],
                                }}
                              >
                                <code className="text-sm font-mono absolute bottom-2 text-center px-2 py-1 rounded bg-black/50 text-white">
                                  {colors[index]}
                                </code>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4">
                              <div className="space-y-4">
                                {/* Default Swatches */}
                                <div className="grid grid-cols-8 gap-2">
                                  {DEFAULT_COLOR_SWATCHES.map((color) => (
                                    <div
                                      key={color}
                                      className="w-8 h-8 rounded-lg border cursor-pointer transition-all hover:ring-2 hover:ring-primary"
                                      style={{ backgroundColor: color }}
                                      onClick={() => handleColorSelection(index, color)}
                                      title={color}
                                    />
                                  ))}
                                </div>

                                {/* Color Picker */}
                                <div>
                                  <input
                                    type="color"
                                    value={colors[index]}
                                    onChange={(e) => handleColorSelection(index, e.target.value)}
                                    className="w-full h-10 cursor-pointer rounded"
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Input
                            value={hexInputs[index]}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9A-Fa-f#]/g, '').slice(0, 7);
                              updateHexInput(index, value);
                            }}
                            placeholder="Enter hex code (e.g., #FF0000)"
                            className="font-mono uppercase"
                            maxLength={7}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Analysis Results */}
                    {currentPaletteAnalysis && (
                      <div className="space-y-6">
                        {/* Analysis Card */}
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle>Analysis Results</CardTitle>
                              <div className="text-2xl font-bold">
                                {currentPaletteAnalysis.overallScore}/100
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {/* Contrast Ratio */}
                              <div className="flex items-center justify-between">
                                <div className="text-sm">Contrast Ratio</div>
                                <div className="font-mono">
                                  {currentPaletteAnalysis.contrastRatios[0].ratio.toFixed(2)}:1
                                </div>
                              </div>
                              
                              {/* WCAG Compliance */}
                              <div className="space-y-2">
                                <div className="text-sm">WCAG Compliance</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                                    <span className="text-sm">AA (4.5:1)</span>
                                    <Badge variant={currentPaletteAnalysis.contrastRatios[0].ratio >= 4.5 ? "success" : "destructive"}>
                                      {currentPaletteAnalysis.contrastRatios[0].ratio >= 4.5 ? "Pass" : "Fail"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                                    <span className="text-sm">AAA (7:1)</span>
                                    <Badge variant={currentPaletteAnalysis.contrastRatios[0].ratio >= 7 ? "success" : "destructive"}>
                                      {currentPaletteAnalysis.contrastRatios[0].ratio >= 7 ? "Pass" : "Fail"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Color Balance & Usage Card */}
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle>Color Balance & Usage</CardTitle>
                              <Badge variant="outline">Smart Recommendations</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-6">
                              {/* Text Color Usage */}
                              <div className="space-y-3">
                                <div className="font-medium">Text Color Usage</div>
                                {Array.from(paletteAnalysis.entries())
                                  .filter(([_, analysis]) => 
                                    analysis.contrastWithWhite >= 4.5 || analysis.contrastWithBlack >= 4.5
                                  )
                                  .map(([color, analysis]) => (
                                    <div key={color} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                                      <div className="w-8 h-8 rounded border" style={{ backgroundColor: color }} />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <code className="text-xs">{color}</code>
                                          <Badge variant="outline" className="text-xs">
                                            {analysis.contrastWithWhite >= 4.5 ? 'Light Background' : 'Dark Background'}
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Best for: {analysis.contrastWithWhite >= 4.5 ? 
                                            'Text on light backgrounds' : 
                                            'Text on dark backgrounds'}
                                        </div>
                                      </div>
                                      <Badge 
                                        variant={analysis.wcagStatus.AANormal ? "success" : "warning"}
                                        className="ml-2"
                                      >
                                        {Math.max(analysis.contrastWithWhite, analysis.contrastWithBlack).toFixed(1)}:1
                                      </Badge>
                                    </div>
                                  ))}
                              </div>

                              {/* Palette Balance */}
                              <div className="space-y-3">
                                <div className="font-medium">Palette Balance</div>
                                {currentPaletteAnalysis?.lowContrastPairs?.length === 0 ? (
                                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                                    <Badge variant="success">Well Balanced!</Badge>
                                    <p className="text-sm text-muted-foreground">
                                      Your color palette has good contrast and balance.
                                    </p>
                                  </div>
                                ) : (
                                  currentPaletteAnalysis?.lowContrastPairs?.map((pair, index) => {
                                    const improvements = generatePaletteImprovements(colors, paletteAnalysis, pair, selectedBackground);
                                    return (
                                      <div key={index} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <div className="text-sm text-muted-foreground">
                                            Balance issue between:
                                            <div className="flex items-center gap-2 mt-1">
                                              <div className="w-6 h-6 rounded border" style={{ backgroundColor: pair.color1 }} />
                                              <code className="text-xs">{pair.color1}</code>
                                              <span>and</span>
                                              <div className="w-6 h-6 rounded border" style={{ backgroundColor: pair.color2 }} />
                                              <code className="text-xs">{pair.color2}</code>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: UI Preview */}
              <div className="lg:sticky lg:top-[8.5rem]">
                {colors.length >= 2 && (
                  <UIPreview 
                    colors={colors}
                    paletteAnalysis={paletteAnalysis}
                    currentPaletteAnalysis={currentPaletteAnalysis}
                    showImprovements={{}}
                    toggleImprovements={() => {}}
                    setColors={setColors}
                    selectedBackground={selectedBackground}
                    generatePaletteImprovements={generatePaletteImprovements}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 