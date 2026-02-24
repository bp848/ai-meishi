import { create } from "zustand"
import type { CardFields, CardFieldKey } from "./types"
import { DEFAULT_CARD_FIELDS } from "./types"

/** A saved business card (created from a template) */
export interface SavedCard {
  id: string
  templateId: string
  templateCompany: string
  fields: CardFields
  createdAt: number
  updatedAt: number
}

interface CardStoreState {
  cards: SavedCard[]
  addCard: (templateId: string, templateCompany: string, fields: CardFields) => SavedCard
  updateCard: (id: string, fields: Partial<CardFields>) => void
  removeCard: (id: string) => void
  getById: (id: string) => SavedCard | undefined
}

function loadCards(): SavedCard[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("ai-meishi-cards")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCards(cards: SavedCard[]) {
  if (typeof window === "undefined") return
  localStorage.setItem("ai-meishi-cards", JSON.stringify(cards))
}

export const useCardStore = create<CardStoreState>((set, get) => ({
  cards: loadCards(),

  addCard: (templateId, templateCompany, fields) => {
    const newCard: SavedCard = {
      id: crypto.randomUUID(),
      templateId,
      templateCompany,
      fields: { ...fields },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const updated = [newCard, ...get().cards]
    saveCards(updated)
    set({ cards: updated })
    return newCard
  },

  updateCard: (id, fields) => {
    const updated = get().cards.map((c) =>
      c.id === id
        ? { ...c, fields: { ...c.fields, ...fields }, updatedAt: Date.now() }
        : c
    )
    saveCards(updated)
    set({ cards: updated })
  },

  removeCard: (id) => {
    const updated = get().cards.filter((c) => c.id !== id)
    saveCards(updated)
    set({ cards: updated })
  },

  getById: (id) => get().cards.find((c) => c.id === id),
}))
