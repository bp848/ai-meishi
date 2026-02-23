"use client"

import { Header } from "@/components/header"
import { UploadSection } from "@/components/upload-section"
import { TemplateSelector } from "@/components/template-selector"
import { ToastContainer } from "@/components/toast-container"
import { CreditCard, ScanSearch, FileText } from "lucide-react"

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-card p-6 text-center shadow-sm border">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            AI名刺解析
          </h1>
          <p className="mt-4 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
            名刺画像をアップロードするだけで、AIが自動で情報を読み取り。
            テンプレート編集からPDF出力まで、ワンストップで対応。
          </p>
        </div>

        <UploadSection />

        <TemplateSelector />

        <section className="mt-16 grid w-full max-w-3xl gap-6 md:grid-cols-3">
          <FeatureItem
            icon={<ScanSearch className="h-6 w-6" />}
            title="AI自動解析"
            description="名刺画像をアップロードするだけで、会社名・氏名・連絡先などを自動抽出"
          />
          <FeatureItem
            icon={<CreditCard className="h-6 w-6" />}
            title="テンプレート編集"
            description="抽出した情報をリアルタイムプレビューで確認しながら自由に編集"
          />
          <FeatureItem
            icon={<FileText className="h-6 w-6" />}
            title="PDF出力"
            description="編集した名刺をそのままPDFとしてダウンロード。印刷にも対応"
          />
        </section>
      </main>
      <ToastContainer />
    </div>
  )
}
