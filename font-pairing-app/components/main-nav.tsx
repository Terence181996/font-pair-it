"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { ColorSettings } from "@/components/color-settings";

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-16 items-center justify-between px-4">
      <nav className="flex items-center space-x-6">
        <Link 
          href="/" 
          className={cn(
            "text-sm transition-colors hover:text-primary",
            pathname === "/" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Font Pairing
        </Link>
        <Link 
          href="/color-palette" 
          className={cn(
            "text-sm transition-colors hover:text-primary",
            pathname === "/color-palette" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Color Palette
        </Link>
      </nav>
      <div className="flex items-center space-x-2">
        <ColorSettings />
        <ThemeToggle />
      </div>
    </div>
  );
} 