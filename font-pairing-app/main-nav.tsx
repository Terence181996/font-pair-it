"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between w-full px-6 py-3">
      <div className="flex items-center space-x-6">
        <Link href="/" className="text-xl font-bold">
          Font & Color Explorer
        </Link>
        <nav className="flex items-center space-x-6">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/" 
                ? "text-primary font-bold"
                : "text-muted-foreground"
            )}
          >
            Font Pairing
          </Link>
          <Link
            href="/color-palette"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/color-palette"
                ? "text-primary font-bold"
                : "text-muted-foreground"
            )}
          >
            Color Palette
          </Link>
        </nav>
      </div>
    </div>
  );
} 