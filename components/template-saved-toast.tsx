"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Building2 } from "lucide-react"

interface TemplateSavedToastProps {
  companyName: string
  show: boolean
}

export function TemplateSavedToast({ companyName, show }: TemplateSavedToastProps) {
  const { success } = useToast()

  useEffect(() => {
    if (show && companyName) {
      success(
        "テンプレートを保存しました",
        `${companyName}のテンプレートを保存しました。次回から選択して新しい名刺を作成できます。`
      )
    }
  }, [show, companyName, success])

  return null
}
