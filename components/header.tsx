"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CreditCard, FilePlus, Search, PenTool, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/templates/register", label: "テンプレート登録", icon: FilePlus },
  { href: "/templates/search", label: "テンプレート検索", icon: Search },
  { href: "/cards/create", label: "名刺作成", icon: PenTool },
  { href: "/cards/manage", label: "作成管理", icon: FolderOpen },
] as const

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <CreditCard className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            AI Meishi
          </span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
