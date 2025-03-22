"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
      <div className="container mx-auto h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link 
            href="/" 
            className="text-xl font-bold transition-colors hover:text-primary"
          >
            Font & Color Explorer
          </Link>
          <div className="flex items-center space-x-6">
            <Link 
              href="/" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === "/" ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              Font Pairing
            </Link>
            <Link 
              href="/color-palette" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === "/color-palette" ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              Color Palette
            </Link>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </nav>
  );
} 