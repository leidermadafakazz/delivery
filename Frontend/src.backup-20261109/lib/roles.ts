import type { Role } from '../types/auth'

export const ROLE_LABELS: Record<Role, string> = {
  CLIENT: 'Cliente',
  BUSINESS: 'Empresa',
  DELIVERY: 'Domiciliario',
  ADMIN: 'Administrador',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  CLIENT: 'Pide productos y sigue tus entregas.',
  BUSINESS: 'Gestiona tu catálogo y los pedidos recibidos.',
  DELIVERY: 'Toma pedidos listos y registra tus entregas.',
  ADMIN: 'Aprueba solicitudes y supervisa la operación.',
}

const ROLE_PRIORITY: Role[] = ['ADMIN', 'BUSINESS', 'DELIVERY', 'CLIENT']

export function getPrimaryRole(roles: Role[]): Role {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? 'CLIENT'
}
