import { useState, useRef, type ChangeEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, Camera, ChevronLeft } from 'lucide-react'
import { LogoIcone } from '@/components/ui/Logo'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import { navItems } from './nav'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import { uploadFotoUsuario, atualizarUsuario } from '@/hooks/useUsuarios'
import { RecortarFotoModal } from '@/components/RecortarFotoModal'

const RECOLHIDO_KEY = 'localiza_menu_recolhido'

function lerRecolhido() {
  try {
    return localStorage.getItem(RECOLHIDO_KEY) === '1'
  } catch {
    return false
  }
}

/** Divisória fina que some nas pontas, como no layout de referência. */
function Divisoria({ className }: { className?: string }) {
  return <div className={cn('h-px bg-gradient-to-r from-transparent via-border/15 to-transparent', className)} />
}

export function Sidebar() {
  const { signOut, user, perfil, perfilLoading, refetchPerfil } = useAuth()
  const isAdmin = !perfilLoading && perfil?.nivel === 'admin'

  const [recolhido, setRecolhido] = useState(lerRecolhido)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [arquivoParaRecortar, setArquivoParaRecortar] = useState<File | null>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  function alternarRecolhido() {
    setRecolhido((atual) => {
      const novo = !atual
      try {
        localStorage.setItem(RECOLHIDO_KEY, novo ? '1' : '0')
      } catch {
        /* sem storage: só não lembra na próxima visita */
      }
      return novo
    })
  }

  function handleFotoPerfilChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !perfil) return
    setErroFoto(null)
    setArquivoParaRecortar(file)
  }

  async function handleFotoRecortada(arquivoRecortado: File) {
    setArquivoParaRecortar(null)
    if (!perfil) return
    setEnviandoFoto(true)
    try {
      const fotoUrl = await uploadFotoUsuario(arquivoRecortado, perfil.id)
      await atualizarUsuario(perfil.id, {
        nome: perfil.nome,
        nivel: perfil.nivel,
        telefone: perfil.telefone || undefined,
        foto_url: fotoUrl,
      })
      await refetchPerfil()
    } catch (err) {
      console.error('Erro ao atualizar foto de perfil:', err)
      setErroFoto(err instanceof Error ? err.message : 'Não foi possível salvar a foto de perfil.')
      setTimeout(() => setErroFoto(null), 8000)
    } finally {
      setEnviandoFoto(false)
    }
  }

  // Configurações (usuários e pátios) só para admin.
  const itens = navItems.filter((item) => item.to !== '/configuracoes' || isAdmin)
  const initials = (perfil?.nome || user?.email || '?').slice(0, 2).toUpperCase()

  return (
    <div
      className={cn(
        'relative hidden md:sticky md:top-3 md:m-3 md:block md:h-[calc(100svh-1.5rem)] md:shrink-0 md:self-start transition-[width] duration-300 ease-out',
        recolhido ? 'md:w-[76px]' : 'md:w-64',
      )}
    >
      <aside className="flex h-full flex-col overflow-hidden rounded-[28px] glass-bar">
        {/* Cabeçalho: símbolo + "Menu" */}
        <div className={cn('flex h-[72px] shrink-0 items-center', recolhido ? 'justify-center' : 'gap-3 px-5')}>
          <LogoIcone className="h-9 w-9 rounded-xl" textClassName="text-lg" />
          {!recolhido && (
            <div className="min-w-0 leading-tight">
              <p className="font-display text-lg font-bold tracking-tight text-foreground">Menu</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-accent">Localiza Pesados</p>
            </div>
          )}
        </div>
        <Divisoria className="mx-4" />

        <nav className={cn('flex-1 overflow-y-auto py-5', recolhido ? 'px-0' : 'px-3')}>
          {!recolhido && (
            <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-wider text-secondary/60">
              Inventário de Caminhões
            </p>
          )}
          <div className={cn('flex flex-col', recolhido ? 'items-center gap-3' : 'gap-1.5')}>
            {itens.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={recolhido ? item.label : undefined}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center text-sm font-medium transition-all duration-200',
                    recolhido
                      ? 'h-11 w-11 justify-center rounded-full'
                      : 'h-11 gap-3 rounded-full px-4',
                    isActive
                      ? recolhido
                        ? 'bg-surface text-primary shadow-[0_6px_18px_-6px_rgb(0_0_0/0.35)] ring-1 ring-border/10'
                        : 'bg-primary text-white shadow-[0_8px_20px_-8px_rgb(var(--color-primary)/0.8)]'
                      : 'text-secondary hover:bg-surface hover:text-foreground hover:shadow-[0_6px_18px_-8px_rgb(0_0_0/0.3)]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    {!recolhido && <span className="flex-1 truncate">{item.label}</span>}
                    {!recolhido && isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <Divisoria className="mx-4" />
        {/* Rodapé: usuário, tema e sair */}
        <div className={cn('shrink-0 p-3', recolhido && 'flex flex-col items-center gap-2.5')}>
          <div className={cn(recolhido ? 'flex flex-col items-center gap-2.5' : 'flex items-center gap-2.5 rounded-2xl px-1.5 py-1.5')}>
            <button
              type="button"
              onClick={() => perfil && fotoInputRef.current?.click()}
              disabled={!perfil || enviandoFoto}
              aria-label="Alterar foto de perfil"
              title={perfil ? 'Alterar foto de perfil' : undefined}
              className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-[11px] font-semibold text-primary disabled:cursor-default"
            >
              {perfil?.foto_url ? <img src={perfil.foto_url} alt="" className="h-full w-full object-cover" /> : initials}
              {perfil && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className={cn('h-3.5 w-3.5 text-white', enviandoFoto && 'animate-pulse')} />
                </span>
              )}
            </button>
            <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoPerfilChange} />
            {!recolhido && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{perfil?.nome || user?.email}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
                  Online
                </p>
              </div>
            )}
            <ThemeToggleButton className="rounded-full" />
            <button
              onClick={() => signOut()}
              aria-label="Sair"
              title="Sair"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          {erroFoto && !recolhido && <p className="mt-1 px-1.5 text-[11px] font-medium text-status-danger">{erroFoto}</p>}
        </div>
      </aside>

      {/* Alça para recolher/expandir, na borda do menu */}
      <button
        type="button"
        onClick={alternarRecolhido}
        aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
        title={recolhido ? 'Expandir menu' : 'Recolher menu'}
        className="absolute -right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/10 bg-surface text-secondary shadow-md transition-colors hover:text-primary"
      >
        <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', recolhido && 'rotate-180')} />
      </button>

      {arquivoParaRecortar && (
        <RecortarFotoModal
          arquivo={arquivoParaRecortar}
          onCancelar={() => setArquivoParaRecortar(null)}
          onConfirmar={handleFotoRecortada}
        />
      )}
    </div>
  )
}
