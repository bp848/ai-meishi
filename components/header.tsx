"use client"

import Link from "next/link"
import { CreditCard } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            AI Meishi
          </span>
        </Link>
      </div>
    </header>
  )
}
