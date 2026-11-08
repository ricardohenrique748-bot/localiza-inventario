import type { Usuario } from '@/lib/types'

/**
 * Perfis do sistema da Localiza:
 *  - admin: tudo, inclusive Configurações (pátios e usuários) e editar/excluir lançamentos;
 *  - operador: dashboard, movimentações e registro de entrada/saída.
 */
export function isAdminUsuario(usuario?: Partial<Usuario> | null): boolean {
  return usuario?.nivel === 'admin'
}
