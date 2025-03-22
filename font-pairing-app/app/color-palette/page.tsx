"use client";

import { useState, useRef } from "react";
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Dynamically import components with NoSSR
const PalettePreview = dynamic(() => import('@/components/palette-preview'), {
  ssr: false,
  loading: () => <div>Loading preview...</div>
});

const ColorAnalyzer = dynamic(() => import('@/components/color-analyzer'), {
  ssr: false,
  loading: () => <div>Loading analyzer...</div>
});

interface ColorPalette {
  colors: string[];
  name: string;
  reason: string;
  accessibility?: {
    wcag2: {
      normal: number;
      large: number;
    };
  };
  roles?: {
    [key: string]: number;  // Maps role names to color indices
  };
}

export default function ColorPalettePage() {
  const [prompt, setPrompt] = useState("");
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  const [colorCount, setColorCount] = useState<string>("5");
  const [previewScale, setPreviewScale] = useState<number>(1);
  const lastQueryRef = useRef<string>("");

  const generatePalette = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description for your color palette");
      return;
    }

    setLoading(true);
    try {
      console.log('Sending request to generate palette...');
      const isNewQuery = lastQueryRef.current !== prompt.trim();
      lastQueryRef.current = prompt.trim();

      const response = await fetch("/api/generate-palette", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          count: isNewQuery ? 10 : 5, // Number of palettes to generate
          colorsPerPalette: parseInt(colorCount) // Number of colors in each palette
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate color palette");
      }

      if (!data.palettes || !Array.isArray(data.palettes)) {
        throw new Error("Invalid response format");
      }

      console.log('Received palettes:', data.palettes);
      setPalettes(prev => {
        // If it's a new query, reset the palettes
        if (isNewQuery) {
          setSelectedPalette(data.palettes[0]);
          return data.palettes;
        }
        // Otherwise, add new palettes at the beginning
        return [...data.palettes, ...prev];
      });
      
      toast.success(isNewQuery ? "Color palettes generated successfully!" : "More palettes generated!");
    } catch (error) {
      console.error("Error generating palette:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate color palette. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleColorRoleChange = (newColors: string[], roles?: { [key: string]: number }) => {
    if (!selectedPalette) return;
    
    const updatedPalette = {
      ...selectedPalette,
      colors: newColors,
      roles: roles,
    };
    setSelectedPalette(updatedPalette);

    setPalettes(prev => prev.map(p => 
      p === selectedPalette ? updatedPalette : p
    ));
  };

  const handleDeletePalette = (paletteToDelete: ColorPalette) => {
    setPalettes(prev => prev.filter(p => p !== paletteToDelete));
    if (selectedPalette === paletteToDelete) {
      setSelectedPalette(palettes[0] || null);
    }
    toast.success("Palette removed");
  };

  const handleDuplicatePalette = (paletteToDuplicate: ColorPalette) => {
    const duplicatedPalette = {
      ...paletteToDuplicate,
      name: `${paletteToDuplicate.name} (Copy)`,
    };
    setPalettes(prev => [duplicatedPalette, ...prev]);
    toast.success("Palette duplicated");
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto pt-8">
        <Tabs defaultValue="generate" className="space-y-6">
          <div className="sticky top-16 z-40 bg-background">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate Palettes</TabsTrigger>
              <TabsTrigger value="analyze">Analyze Colors</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="generate" className="space-y-6">
            <div className="sticky top-0 z-10 bg-background pb-4 border-b">
              <Card>
                <CardHeader>
                  <CardTitle>Color Palette Generator</CardTitle>
                  <CardDescription>
                    Describe your needs in natural language and get AI-generated color palettes. 
                    For digital projects (websites, apps), include keywords like "digital" or "web" to get WCAG accessibility scores.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="colorCount" className="text-sm font-medium mb-2 block">
                        Number of Colors in Palette
                      </Label>
                      <Select 
                        value={colorCount} 
                        onValueChange={setColorCount}
                      >
                        <SelectTrigger id="colorCount" className="w-[180px]">
                          <SelectValue placeholder="Select color count" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Colors (Minimal)</SelectItem>
                          <SelectItem value="4">4 Colors (Basic)</SelectItem>
                          <SelectItem value="5">5 Colors (Standard)</SelectItem>
                          <SelectItem value="6">6 Colors (Extended)</SelectItem>
                          <SelectItem value="7">7 Colors (Complex)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-1">
                        {colorCount === "3" ? "Perfect for minimal designs with clear hierarchy" :
                         colorCount === "4" ? "Good for basic websites with accent colors" :
                         colorCount === "5" ? "Standard choice for most web projects" :
                         colorCount === "6" ? "Extended palette for richer designs" :
                         "Complex palette for detailed color systems"}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="prompt" className="text-sm font-medium mb-2 block">
                        Describe Your Color Palette
                      </Label>
                      <Textarea
                        id="prompt"
                        placeholder="e.g., I need a warm and inviting color scheme for a coffee shop website..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[100px]"
                        spellCheck={false}
                        data-ms-editor={false}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={generatePalette} 
                    disabled={loading || !prompt.trim()}
                    className="w-full"
                  >
                    {loading ? "Generating..." : palettes.length > 0 && lastQueryRef.current === prompt.trim() 
                      ? "Generate More Palettes" 
                      : "Generate Palettes"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="container mx-auto">
              {palettes.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    {palettes.map((palette, index) => (
                      <Card 
                        key={index}
                        className={`transition-all ${selectedPalette === palette ? 'ring-2 ring-primary' : 'hover:shadow-lg'}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-semibold">{palette.name}</h3>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicatePalette(palette);
                                }}
                                className="h-8 w-8"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                                  <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.44A1.5 1.5 0 008.378 6H4.5z" />
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePalette(palette);
                                }}
                                className="h-8 w-8 text-destructive"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                </svg>
                              </Button>
                            </div>
                          </div>
                          <div 
                            className="flex flex-wrap gap-4 mb-4 cursor-pointer"
                            onClick={() => setSelectedPalette(palette)}
                          >
                            {palette.colors.map((color, colorIndex) => (
                              <div
                                key={colorIndex}
                                className="relative group cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(color);
                                  toast.success(`Copied ${color} to clipboard`);
                                }}
                              >
                                <div
                                  className="w-24 h-24 rounded-lg shadow-md transition-transform transform hover:scale-105"
                                  style={{ backgroundColor: color }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-lg">
                                  <span className="text-white font-mono">{color}</span>
                                </div>
                                <div className="mt-2 text-center text-sm text-muted-foreground">
                                  {colorIndex === 0 ? "Primary" :
                                   colorIndex === 1 ? "Secondary" :
                                   colorIndex === 2 ? "Tertiary" :
                                   colorIndex === 3 ? "Accent" :
                                   colorIndex === 4 ? "Background" :
                                   colorIndex === 5 ? "Surface" : "Extra"}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-base mb-2">{palette.reason}</p>
                          {palette.accessibility && (
                            <div className="text-sm text-muted-foreground mt-4 p-4 bg-muted rounded-lg">
                              <p className="font-medium mb-2">WCAG 2.1 Contrast Scores:</p>
                              <ul className="list-disc list-inside space-y-1">
                                <li>Normal Text: {palette.accessibility.wcag2.normal}</li>
                                <li>Large Text: {palette.accessibility.wcag2.large}</li>
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="lg:sticky lg:top-[calc(6rem+1px)] h-fit space-y-4">
                    {selectedPalette && (
                      <>
                        <Card className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <Label>Preview Scale</Label>
                            <Select 
                              value={previewScale.toString()} 
                              onValueChange={(value) => setPreviewScale(Number(value))}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0.75">75%</SelectItem>
                                <SelectItem value="1">100%</SelectItem>
                                <SelectItem value="1.25">125%</SelectItem>
                                <SelectItem value="1.5">150%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
                            <PalettePreview 
                              colors={selectedPalette.colors} 
                              onColorRoleChange={handleColorRoleChange}
                              roles={selectedPalette.roles}
                            />
                          </div>
                        </Card>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analyze">
            <ColorAnalyzer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 