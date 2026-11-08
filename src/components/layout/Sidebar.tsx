import { useState, useRef, type ChangeEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, Camera } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import { navItems } from './nav'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/cn'
import { uploadFotoUsuario, atualizarUsuario } from '@/hooks/useUsuarios'
import { RecortarFotoModal } from '@/components/RecortarFotoModal'

export function Sidebar() {
  const { signOut, user, perfil, perfilLoading, refetchPerfil } = useAuth()
  const isAdmin = !perfilLoading && perfil?.nivel === 'admin'

  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const [arquivoParaRecortar, setArquivoParaRecortar] = useState<File | null>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)

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
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <aside className="hidden md:sticky md:top-3 md:m-3 md:flex md:h-[calc(100svh-1.5rem)] md:w-64 md:shrink-0 md:flex-col md:self-start md:overflow-hidden md:rounded-2xl glass-bar">
      <div className="flex h-14 items-center px-3 border-b border-border/[0.06]">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-2">
        <p className="px-2 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-secondary/60">
          Inventário de Caminhões
        </p>
        <div className="space-y-1.5">
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg border-l-2 py-2.5 pl-3 pr-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-foreground font-semibold'
                    : 'border-transparent text-secondary hover:bg-overlay/5 hover:text-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="uppercase">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-border/[0.06] p-2">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-overlay/5">
          <button
            type="button"
            onClick={() => perfil && fotoInputRef.current?.click()}
            disabled={!perfil || enviandoFoto}
            aria-label="Alterar foto de perfil"
            title={perfil ? 'Alterar foto de perfil' : undefined}
            className="group relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-[11px] font-semibold text-primary disabled:cursor-default"
          >
            {perfil?.foto_url ? <img src={perfil.foto_url} alt="" className="h-full w-full object-cover" /> : initials}
            {perfil && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className={cn('h-3.5 w-3.5 text-white', enviandoFoto && 'animate-pulse')} />
              </span>
            )}
          </button>
          <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoPerfilChange} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">{user?.email}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
              Online
            </p>
          </div>
          <ThemeToggleButton />
          <button
            onClick={() => signOut()}
            aria-label="Sair"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-overlay/10 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
        {erroFoto && <p className="mt-1 px-1.5 text-[11px] font-medium text-status-danger">{erroFoto}</p>}
      </div>

      {arquivoParaRecortar && (
        <RecortarFotoModal
          arquivo={arquivoParaRecortar}
          onCancelar={() => setArquivoParaRecortar(null)}
          onConfirmar={handleFotoRecortada}
        />
      )}
    </aside>
  )
}
