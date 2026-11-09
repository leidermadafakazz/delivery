export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '$ 0'
  }

  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numeric)) {
    return '$ 0'
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numeric)
}

