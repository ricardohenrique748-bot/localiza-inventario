import { useCallback, useEffect, useState } from 'react'
import { supabase, FOTOS_BUCKET } from '@/lib/supabase'
import { up } from '@/lib/text'
import { comPrefixoEmpresa } from '@/lib/tenant'
import { useAuth } from '@/contexts/AuthContext'
import type { NivelUsuario, Usuario } from '@/lib/types'

export function useUsuarios() {
  const { perfil } = useAuth()
  const companyId = perfil?.company_id
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const { data, error } = await supabase.from('usuarios').select('*').eq('company_id', companyId).order('nome')
    if (error) setError(error.message)
    else setUsuarios((data ?? []) as Usuario[])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { usuarios, loading, error, refetch }
}

export async function uploadFotoUsuario(file: File, userId: string): Promise<string> {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = comPrefixoEmpresa(`usuarios/${userId}-${Date.now()}.${ext}`)
    const { error } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (!error) {
      return supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path).data.publicUrl
    }
  } catch (err) {
    console.warn('Falha no storage, convertendo em dataURL:', err)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface CriarUsuarioInput {
  nome: string
  email: string
  senha: string
  telefone?: string
  nivel?: NivelUsuario
}

async function mensagemErroFuncao(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: Response }).context
  if (context && typeof context.json === 'function') {
    const body = await context.json().catch(() => null)
    if (body?.error) return body.error
  }
  return error instanceof Error ? error.message : fallback
}

export async function criarUsuario(input: CriarUsuarioInput) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const { data, error } = await supabase.functions.invoke('create-usuario', {
    body: { ...input, nome: up(input.nome) },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (error) {
    throw new Error(await mensagemErroFuncao(error, 'Não foi possível criar o usuário.'))
  }

  return data as Usuario
}

export async function excluirUsuario(id: string) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const { error } = await supabase.functions.invoke('delete-usuario', {
    body: { id },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (error) {
    throw new Error(await mensagemErroFuncao(error, 'Não foi possível excluir o usuário.'))
  }
}

interface AtualizarUsuarioInput {
  nome: string
  telefone?: string
  nivel: NivelUsuario
  foto_url?: string | null
}

export async function atualizarUsuario(id: string, input: AtualizarUsuarioInput) {
  const payload: Record<string, unknown> = {
    nome: up(input.nome),
    telefone: input.telefone || null,
    nivel: input.nivel,
  }
  if (input.foto_url !== undefined) payload.foto_url = input.foto_url
  const { data, error } = await supabase.from('usuarios').update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Usuario
}

export async function resetarSenha(id: string, senha?: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const { data, error } = await supabase.functions.invoke('reset-senha', {
    body: { id, senha: senha || '123456' },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (error) {
    throw new Error(await mensagemErroFuncao(error, 'Não foi possível resetar a senha.'))
  }
  const body = data as { senhaTemporaria?: string }
  if (!body?.senhaTemporaria) throw new Error('Senha temporária não retornada.')
  return body.senhaTemporaria
}
