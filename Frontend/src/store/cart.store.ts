import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CartBusiness, CartItem } from '../types/orders'
import type { ProductSummary } from '../types/catalog'

interface AddItemResult {
  replacedBusiness: boolean
  quantity: number
}

interface CartState {
  business: CartBusiness | null
  items: CartItem[]
  addItem: (
    business: CartBusiness,
    product: ProductSummary,
    quantity: number,
  ) => AddItemResult
  setQuantity: (productId: number, quantity: number) => void
  removeItem: (productId: number) => void
  clear: () => void
}

const MAX_QUANTITY = 99

function clampQuantity(quantity: number, stock: number | null): number {
  const limit = stock === null ? MAX_QUANTITY : Math.min(stock, MAX_QUANTITY)

  return Math.max(0, Math.min(Math.trunc(quantity), limit))
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      business: null,
      items: [],

      addItem(business, product, quantity) {
        const current = get()
        const replacedBusiness = current.business?.id !== business.id
        const baseItems = replacedBusiness ? [] : current.items
        const stock = product.stock ?? null
        const existing = baseItems.find((item) => item.productId === product.id)
        const requested = (existing?.quantity ?? 0) + Math.max(1, quantity)
        const nextQuantity = clampQuantity(requested, stock)

        if (nextQuantity <= 0) {
          return { replacedBusiness, quantity: 0 }
        }

        const items = existing
          ? baseItems.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: nextQuantity }
                : item,
            )
          : [
              ...baseItems,
              {
                productId: product.id,
                name: product.name,
                price: Number(product.price),
                imageUrl: product.imageUrl,
                quantity: nextQuantity,
                stock,
              },
            ]

        set({ business, items })

        return { replacedBusiness, quantity: nextQuantity }
      },

      setQuantity(productId, quantity) {
        const items = get().items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: clampQuantity(quantity, item.stock) }
            : item,
        )

        set({ items: items.filter((item) => item.quantity > 0) })
      },

      removeItem(productId) {
        const items = get().items.filter((item) => item.productId !== productId)

        set({
          items,
          business: items.length === 0 ? null : get().business,
        })
      },

      clear() {
        set({ business: null, items: [] })
      },
    }),
    {
      name: 'fastdelivery-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ business: state.business, items: state.items }),
    },
  ),
)

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0)
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0)
}
