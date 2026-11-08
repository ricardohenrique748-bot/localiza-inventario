import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/Header'
import { useAuth } from '@/contexts/AuthContext'
import { PatiosTab } from '@/pages/configuracoes/PatiosTab'
import { UsuariosTab } from '@/pages/configuracoes/UsuariosTab'
import { UserCheck, ShieldAlert, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const TABS = [
  { id: 'patios', label: 'Pátios', icon: MapPin },
  { id: 'usuarios', label: 'Usuários', icon: UserCheck },
] as const

type TabId = (typeof TABS)[number]['id']

/** Configurações da Localiza: pátios e usuários. Só administradores. */
export function Configuracoes() {
  const { perfil, perfilLoading } = useAuth()
  const isAdmin = perfil?.nivel === 'admin'
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as TabId | null
  const [tab, setTab] = useState<TabId>(() => (tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : 'patios'))

  if (perfilLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-secondary font-medium uppercase">Carregando configurações…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4 uppercase">
        <div className="h-16 w-16 rounded-2xl bg-status-danger/10 border border-status-danger/30 flex items-center justify-center text-status-danger">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-xl font-black text-foreground tracking-tight">Acesso Restrito</h2>
          <p className="text-xs text-secondary leading-relaxed">Só administradores acessam as configurações.</p>
        </div>
        <Button onClick={() => (window.location.href = '/')} variant="secondary" size="md" className="uppercase font-bold text-xs">
          Voltar ao Início
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" subtitle="Pátios e usuários do sistema" />

      <div className="grid grid-cols-2 p-1 rounded-2xl glass-bar gap-1">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/25 ring-1 ring-primary/40 font-bold'
                  : 'text-secondary hover:text-foreground hover:bg-white/5 font-medium'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-secondary'}`} />
              <span className="text-xs uppercase tracking-tight">{t.label}</span>
            </button>
          )
        })}
      </div>

      <div>
        {tab === 'patios' && <PatiosTab />}
        {tab === 'usuarios' && <UsuariosTab />}
      </div>
    </div>
  )
}
