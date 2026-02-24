"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { ToastContainer } from "@/components/toast-container"
import { useCardStore, type SavedCard } from "@/lib/card-store"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Building2,
  Download,
  Edit,
  FolderOpen,
  PenTool,
  Search,
  Trash2,
  User,
} from "lucide-react"

export default function CardManagePage() {
  const { cards, removeCard } = useCardStore()
  const { success } = useToast()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return cards
    const q = query.toLowerCase()
    return cards.filter(
      (c) =>
        c.fields.name.toLowerCase().includes(q) ||
        c.fields.company.toLowerCase().includes(q) ||
        c.templateCompany.toLowerCase().includes(q)
    )
  }, [cards, query])

  const handleRemove = (card: SavedCard) => {
    removeCard(card.id)
    success("削除完了", `${card.fields.name || "名刺"} を削除しました`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">作成管理</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                作成済み {cards.length} 件の名刺
              </p>
            </div>
            <Link href="/cards/create">
              <Button size="sm">
                <PenTool className="mr-1.5 h-4 w-4" />
                新規作成
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="氏名・会社名で検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Card list */}
          {filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                {cards.length === 0 ? (
                  <>
                    <FolderOpen className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        作成した名刺がまだありません
                      </p>
                      <p className="text-sm text-muted-foreground">
                        テンプレートから名刺を作成しましょう
                      </p>
                    </div>
                    <Link href="/cards/create">
                      <Button>
                        <PenTool className="mr-2 h-4 w-4" />
                        名刺を作成
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Search className="h-10 w-10 text-muted-foreground" />
                    <p className="font-medium text-foreground">
                      「{query}」に一致する名刺はありません
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  onRemove={() => handleRemove(card)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}

function CardRow({
  card,
  onRemove,
}: {
  card: SavedCard
  onRemove: () => void
}) {
  return (
    <Card className="group transition-colors hover:border-primary/30">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <User className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {card.fields.name || "（氏名未設定）"}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {card.templateCompany || card.fields.company}
            </span>
            {card.fields.title && (
              <span className="truncate">/ {card.fields.title}</span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            作成: {new Date(card.createdAt).toLocaleDateString("ja-JP")}{" "}
            {card.updatedAt !== card.createdAt &&
              `(更新: ${new Date(card.updatedAt).toLocaleDateString("ja-JP")})`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/cards/create?edit=${card.id}`}>
            <Button size="sm" variant="outline" className="h-8">
              <Edit className="mr-1 h-3.5 w-3.5" />
              編集
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
