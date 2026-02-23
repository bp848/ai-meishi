"use client"

import type { CardFields, CardFieldKey } from "@/lib/types"
import { CARD_FIELD_LABELS } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  User,
  Briefcase,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const FIELD_ICONS: Record<CardFieldKey, LucideIcon> = {
  company: Building2,
  name: User,
  title: Briefcase,
  email: Mail,
  phone: Phone,
  address: MapPin,
  website: Globe,
}

const FIELD_ORDER: CardFieldKey[] = [
  "company",
  "name",
  "title",
  "email",
  "phone",
  "address",
  "website",
]

interface FieldEditorProps {
  fields: CardFields
  onFieldChange: (key: CardFieldKey, value: string) => void
}

export function FieldEditor({ fields, onFieldChange }: FieldEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-muted-foreground">
        フィールド編集
      </p>
      <div className="flex flex-col gap-3">
        {FIELD_ORDER.map((key) => {
          const Icon = FIELD_ICONS[key]
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <Label
                htmlFor={`field-${key}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                {CARD_FIELD_LABELS[key]}
              </Label>
              <Input
                id={`field-${key}`}
                type={key === "email" ? "email" : key === "website" ? "url" : "text"}
                value={fields[key]}
                onChange={(e) => onFieldChange(key, e.target.value)}
                placeholder={CARD_FIELD_LABELS[key]}
                className="h-9 text-sm"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
