"use client"

import type { CardFields } from "@/lib/types"
import { Building2, Globe, Mail, MapPin, Phone } from "lucide-react"

interface BusinessCardPreviewProps {
  fields: CardFields
}

export function BusinessCardPreview({ fields }: BusinessCardPreviewProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground">
        プレビュー
      </p>
      <div
        id="card-preview"
        className="relative overflow-hidden rounded-lg border bg-white shadow-md"
        style={{ aspectRatio: "91 / 55" }}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-6">
          {/* Top section: Company */}
          <div className="flex items-center gap-2">
            {fields.company && (
              <>
                <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground md:text-sm">
                  {fields.company}
                </span>
              </>
            )}
          </div>

          {/* Center: Name and title */}
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-wide text-foreground md:text-2xl">
              {fields.name || "氏名"}
            </h2>
            {fields.title && (
              <p className="text-xs text-muted-foreground md:text-sm">
                {fields.title}
              </p>
            )}
          </div>

          {/* Bottom: Contact details */}
          <div className="flex flex-col gap-1">
            {fields.email && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="text-[10px] md:text-xs">{fields.email}</span>
              </div>
            )}
            {fields.phone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="text-[10px] md:text-xs">{fields.phone}</span>
              </div>
            )}
            {fields.address && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="text-[10px] md:text-xs">{fields.address}</span>
              </div>
            )}
            {fields.website && (
              <div className="flex items-center gap-1.5 text-primary">
                <Globe className="h-3 w-3 shrink-0" />
                <span className="text-[10px] md:text-xs">{fields.website}</span>
              </div>
            )}
          </div>
        </div>
        {/* Decorative accent */}
        <div className="absolute right-0 top-0 h-full w-1.5 bg-primary" />
      </div>
    </div>
  )
}
