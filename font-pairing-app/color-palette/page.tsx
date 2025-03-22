"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorPaletteDisplay } from "@/components/color-palette/ColorPaletteDisplay";
import { ManualColorTester } from "@/components/color-palette/ManualColorTester";
import { toast } from "sonner";

interface ColorPalette {
  colors: string[];
  reason: string;
  accessibility: {
    wcag2: {
      normal: number;
      large: number;
    };
  };
}

export default function ColorPalettePage() {
  const [prompt, setPrompt] = useState("");
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [loading, setLoading] = useState(false);

  const generatePalette = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description for your color palette");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generate-palette", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate color palette");
      }

      const data = await response.json();
      setPalettes(data.palettes);
    } catch (error) {
      console.error("Error generating palette:", error);
      toast.error("Failed to generate color palette. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Color Palette Generator</CardTitle>
          <CardDescription>
            Describe your needs in natural language and get AI-generated color palettes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., I need a warm and inviting color scheme for a coffee shop website..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
          />
          <Button 
            onClick={generatePalette} 
            disabled={loading || !prompt}
            className="w-full"
          >
            {loading ? "Generating..." : "Generate Palettes"}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="generated" className="w-full">
        <TabsList>
          <TabsTrigger value="generated">Generated Palettes</TabsTrigger>
          <TabsTrigger value="manual">Manual Testing</TabsTrigger>
        </TabsList>
        <TabsContent value="generated">
          {palettes.length > 0 && (
            <div className="space-y-6">
              {palettes.map((palette, index) => (
                <ColorPaletteDisplay 
                  key={index}
                  palette={palette}
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="manual">
          <ManualColorTester />
        </TabsContent>
      </Tabs>
    </div>
  );
} 