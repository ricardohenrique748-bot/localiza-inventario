import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, KeyRound, UserPlus, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Label, FieldError, Select } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useUsuarios, criarUsuario, atualizarUsuario, excluirUsuario, resetarSenha } from '@/hooks/useUsuarios'
import type { Usuario } from '@/lib/types'

const novoSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome'),
  email: z.string().trim().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo de 6 caracteres'),
  telefone: z.string().optional(),
  nivel: z.enum(['admin', 'usuario']),
})

const edicaoSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome'),
  telefone: z.string().optional(),
  nivel: z.enum(['admin', 'usuario']),
})

type NovoValues = z.infer<typeof novoSchema>
type EdicaoValues = z.infer<typeof edicaoSchema>

const ROTULO_NIVEL: Record<string, string> = { admin: 'Administrador', usuario: 'Operador' }

/**
 * Usuários do sistema da Localiza. Dois perfis:
 * Administrador (tudo) e Operador (pátio: dashboard, movimentações, entrada/saída).
 */
export function UsuariosTab() {
  const { perfil } = useAuth()
  const { usuarios, loading, error, refetch } = useUsuarios()
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const avisar = (tipo: 'ok' | 'erro', texto: string) => {
    setMensagem({ tipo, texto })
    setTimeout(() => setMensagem(null), 8000)
  }

  async function handleExcluir(u: Usuario) {
    if (u.id === perfil?.id) return avisar('erro', 'Você não pode excluir o próprio usuário.')
    if (!confirm(`Excluir o usuário ${u.nome}? Essa ação não pode ser desfeita.`)) return
    try {
      await excluirUsuario(u.id)
      await refetch()
      avisar('ok', 'Usuário excluído.')
    } catch (err) {
      avisar('erro', err instanceof Error ? err.message : 'Não foi possível excluir.')
    }
  }

  async function handleResetSenha(u: Usuario) {
    if (!confirm(`Redefinir a senha de ${u.nome} para uma senha temporária?`)) return
    try {
      const senha = await resetarSenha(u.id)
      avisar('ok', `Senha de ${u.nome} redefinida para: ${senha} (ele troca no próximo acesso).`)
    } catch (err) {
      avisar('erro', err instanceof Error ? err.message : 'Não foi possível redefinir a senha.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black uppercase text-foreground">Usuários</h2>
          <p className="text-xs text-secondary">Administrador acessa tudo; Operador usa o pátio (entradas, saídas e movimentações).</p>
        </div>
        <Button type="button" size="md" onClick={() => setCriando(true)}>
          <UserPlus className="h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      {mensagem && (
        <p
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            mensagem.tipo === 'ok' ? 'bg-status-success/10 text-status-success' : 'bg-status-danger/10 text-status-danger'
          }`}
        >
          {mensagem.texto}
        </p>
      )}
      {error && <p className="text-sm text-status-danger">{error}</p>}

      <Card className="divide-y divide-border/10 overflow-hidden p-0">
        {loading ? (
          <p className="p-5 text-sm text-secondary">Carregando…</p>
        ) : usuarios.length === 0 ? (
          <p className="p-5 text-sm text-secondary">Nenhum usuário cadastrado.</p>
        ) : (
          usuarios.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-bold text-primary">
                {u.foto_url ? <img src={u.foto_url} alt="" className="h-full w-full object-cover" /> : u.nome.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{u.nome}</p>
                <p className="truncate text-xs text-secondary">
                  {u.email}
                  {u.telefone ? ` · ${u.telefone}` : ''}
                </p>
              </div>
              <Badge tone={u.nivel === 'admin' ? 'warning' : 'neutral'}>{ROTULO_NIVEL[u.nivel] ?? u.nivel}</Badge>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" title="Editar" onClick={() => setEditando(u)} className="rounded-lg p-2 text-secondary hover:bg-overlay/5 hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" title="Redefinir senha" onClick={() => handleResetSenha(u)} className="rounded-lg p-2 text-secondary hover:bg-overlay/5 hover:text-foreground">
                  <KeyRound className="h-4 w-4" />
                </button>
                <button type="button" title="Excluir" onClick={() => handleExcluir(u)} className="rounded-lg p-2 text-secondary hover:bg-overlay/5 hover:text-status-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      {criando && (
        <Modal titulo="Novo usuário" onClose={() => setCriando(false)}>
          <NovoUsuarioForm
            onCancel={() => setCriando(false)}
            onSalvo={async () => {
              setCriando(false)
              await refetch()
              avisar('ok', 'Usuário criado. Ele troca a senha no primeiro acesso.')
            }}
          />
        </Modal>
      )}

      {editando && (
        <Modal titulo={`Editar — ${editando.nome}`} onClose={() => setEditando(null)}>
          <EditarUsuarioForm
            usuario={editando}
            proprioUsuario={editando.id === perfil?.id}
            onCancel={() => setEditando(null)}
            onSalvo={async () => {
              setEditando(null)
              await refetch()
              avisar('ok', 'Usuário atualizado.')
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{titulo}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </Card>
    </div>
  )
}

function NovoUsuarioForm({ onCancel, onSalvo }: { onCancel: () => void; onSalvo: () => void | Promise<void> }) {
  const [erro, setErro] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NovoValues>({ resolver: zodResolver(novoSchema), defaultValues: { nivel: 'usuario' } })

  async function onSubmit(values: NovoValues) {
    setErro(null)
    try {
      await criarUsuario({ ...values, email: values.email.toLowerCase() })
      await onSalvo()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível criar o usuário.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...register('nome')} />
        <FieldError message={errors.nome?.message} />
      </div>
      <div>
        <Label htmlFor="email">E-mail *</Label>
        <Input id="email" type="email" placeholder="usuario@localiza.com" {...register('email')} />
        <FieldError message={errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="senha">Senha inicial *</Label>
        <Input id="senha" type="text" placeholder="mínimo 6 caracteres" {...register('senha')} />
        <FieldError message={errors.senha?.message} />
      </div>
      <div>
        <Label htmlFor="telefone">Telefone</Label>
        <Input id="telefone" {...register('telefone')} />
      </div>
      <div>
        <Label htmlFor="nivel">Perfil *</Label>
        <Select id="nivel" {...register('nivel')}>
          <option value="usuario">Operador</option>
          <option value="admin">Administrador</option>
        </Select>
      </div>
      {erro && <p className="text-sm text-status-danger">{erro}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="md" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="md" disabled={isSubmitting}>
          {isSubmitting ? 'Criando…' : 'Criar usuário'}
        </Button>
      </div>
    </form>
  )
}

function EditarUsuarioForm({
  usuario,
  proprioUsuario,
  onCancel,
  onSalvo,
}: {
  usuario: Usuario
  proprioUsuario: boolean
  onCancel: () => void
  onSalvo: () => void | Promise<void>
}) {
  const [erro, setErro] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EdicaoValues>({
    resolver: zodResolver(edicaoSchema),
    defaultValues: { nome: usuario.nome, telefone: usuario.telefone ?? '', nivel: usuario.nivel },
  })

  async function onSubmit(values: EdicaoValues) {
    setErro(null)
    try {
      await atualizarUsuario(usuario.id, values)
      await onSalvo()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-xs text-secondary">{usuario.email}</p>
      <div>
        <Label htmlFor="edit-nome">Nome *</Label>
        <Input id="edit-nome" {...register('nome')} />
        <FieldError message={errors.nome?.message} />
      </div>
      <div>
        <Label htmlFor="edit-telefone">Telefone</Label>
        <Input id="edit-telefone" {...register('telefone')} />
      </div>
      <div>
        <Label htmlFor="edit-nivel">Perfil *</Label>
        {/* Admin não rebaixa a si mesmo (evita ficar sem ninguém para administrar). */}
        {proprioUsuario ? (
          <>
            <input type="hidden" {...register('nivel')} />
            <p className="text-sm text-foreground">{ROTULO_NIVEL[usuario.nivel]} (você)</p>
          </>
        ) : (
          <Select id="edit-nivel" {...register('nivel')}>
            <option value="usuario">Operador</option>
            <option value="admin">Administrador</option>
          </Select>
        )}
      </div>
      {erro && <p className="text-sm text-status-danger">{erro}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="md" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="md" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
