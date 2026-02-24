"use client"

import { Header } from "@/components/header"
import { ToastContainer } from "@/components/toast-container"
import Link from "next/link"
import {
  FilePlus,
  Search,
  PenTool,
  FolderOpen,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const SECTIONS = [
  {
    href: "/templates/register",
    icon: FilePlus,
    title: "テンプレート登録",
    description:
      "名刺のPDF・IDML・画像をインポートしてテンプレートとして登録。AIが自動でフィールドを抽出します。",
    color: "text-blue-600 bg-blue-50",
  },
  {
    href: "/templates/search",
    icon: Search,
    title: "名刺テンプレート検索",
    description:
      "登録済みのテンプレートを会社名やキーワードで検索。すぐに名刺作成に使えます。",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    href: "/cards/create",
    icon: PenTool,
    title: "名刺作成",
    description:
      "テンプレートを選んで個人情報を入力。リアルタイムプレビューでPDF出力まで。",
    color: "text-violet-600 bg-violet-50",
  },
  {
    href: "/cards/manage",
    icon: FolderOpen,
    title: "作成管理",
    description:
      "作成した名刺の一覧管理。再編集・PDF再出力・履歴確認ができます。",
    color: "text-amber-600 bg-amber-50",
  },
] as const

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            AI名刺管理システム
          </h1>
          <p className="mt-4 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
            テンプレート登録から名刺作成・管理まで。AIが名刺情報を自動解析します。
          </p>
        </div>

        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
          {SECTIONS.map(({ href, icon: Icon, title, description, color }) => (
            <Link key={href} href={href}>
              <Card className="group h-full cursor-pointer border transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-lg ${color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {title}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}
