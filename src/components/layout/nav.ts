import { LayoutDashboard, ArrowLeftRight, PlusCircle, Settings } from 'lucide-react'

/** Menu do sistema da Localiza: só o Inventário de Caminhões (pátio). */
export const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight, end: false },
  { to: '/movimentacoes/nova', label: 'Registrar entrada', icon: PlusCircle, end: true },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, end: false },
] as const

export type NavItem = (typeof navItems)[number]
