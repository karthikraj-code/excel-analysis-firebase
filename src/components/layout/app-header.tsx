"use client";

import { Glasses } from "lucide-react";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Glasses className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Data Lens
          </span>
        </Link>
        {/* Future navigation items can go here */}
      </div>
    </header>
  );
}
