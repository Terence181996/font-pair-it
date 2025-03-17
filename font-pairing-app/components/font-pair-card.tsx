"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { loadAndInjectFont } from "@/lib/fonts"

interface FontPairCardProps {
  name: string
  headingFont: {
    font: any
    name: string
  }
  bodyFont: {
    font: any
    name: string
  }
  category: string
  onSelect: () => void
}

export default function FontPairCard({ name, headingFont, bodyFont, category, onSelect }: FontPairCardProps) {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Safe mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const loadFonts = async () => {
      try {
        await Promise.all([
          loadAndInjectFont(headingFont.name),
          loadAndInjectFont(bodyFont.name)
        ]);
        setFontsLoaded(true);
      } catch (error) {
        console.error("Error loading fonts:", error);
      }
    };
    
    loadFonts();
  }, [headingFont.name, bodyFont.name, isMounted]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-medium text-lg">{name}</h3>
          <Badge variant="secondary">{category}</Badge>
        </div>
        <div className="h-[160px] overflow-hidden border rounded-md p-4 mb-4">
          {isMounted ? (
            <>
              <h4
                className="mb-2 font-bold"
                style={{
                  fontFamily: `${headingFont.name}, sans-serif`,
                  fontSize: "24px",
                  lineHeight: 1.2,
                }}
              >
                {headingFont.name}
              </h4>
              <p
                style={{
                  fontFamily: `${bodyFont.name}, sans-serif`,
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                {bodyFont.name} - The quick brown fox jumps over the lazy dog. Typography is the art and technique of
                arranging type to make written language legible and appealing.
              </p>
            </>
          ) : (
            <>
              <h4 className="mb-2 font-bold" style={{ fontSize: "24px", lineHeight: 1.2 }}>
                {headingFont.name}
              </h4>
              <p style={{ fontSize: "14px", lineHeight: 1.6 }}>
                {bodyFont.name} - The quick brown fox jumps over the lazy dog...
              </p>
            </>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Heading: {headingFont.name}</span>
            <span>Body: {bodyFont.name}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 px-6 py-3">
        <Button onClick={onSelect} variant="default" className="w-full font-semibold">
          Apply This Pairing
        </Button>
      </CardFooter>
    </Card>
  )
}

