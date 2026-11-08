export function up(value: string): string
export function up(value: string | null | undefined): string | null
export function up(value?: string | null): string | null {
  if (!value) return value ?? null
  return value.trim().toUpperCase()
}

/** Remove acentos (á → a, ç → c). */
export function removerAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036F]/g, "")
}
