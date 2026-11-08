import { useState } from 'react'
import { cn } from '@/lib/cn'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  stacked?: boolean
}

const sizes = {
  sm: { icon: 'h-8 w-8', gap: 'gap-2', title: 'text-sm', subtitle: 'text-[9px]', badgeText: 'text-base' },
  md: { icon: 'h-11 w-11', gap: 'gap-2.5', title: 'text-base', subtitle: 'text-[10px]', badgeText: 'text-xl' },
  lg: { icon: 'h-20 w-20', gap: 'gap-3.5', title: 'text-2xl', subtitle: 'text-xs', badgeText: 'text-4xl' },
}

/** Arquivo do logo (coloque em `public/logo-localiza.png`). */
export const LOGO_LOCALIZA_URL = '/logo-localiza.png'

/** Selo da marca: o logo da Localiza, ou um "L" verde enquanto o arquivo não existe. */
export function LogoIcone({ className, textClassName }: { className?: string; textClassName?: string }) {
  const [semArquivo, setSemArquivo] = useState(false)
  if (semArquivo) {
    return (
      <div className={cn('shrink-0 flex items-center justify-center rounded-lg bg-primary font-black text-white shadow-md', className, textClassName)}>
        L
      </div>
    )
  }
  return (
    <img
      src={LOGO_LOCALIZA_URL}
      alt="Localiza"
      onError={() => setSemArquivo(true)}
      className={cn('shrink-0 object-contain rounded-lg', className)}
    />
  )
}

export function Logo({ className, showText = true, size = 'md', stacked = false }: LogoProps) {
  const s = sizes[size]
  return (
    <div className={cn(stacked ? 'flex flex-col items-center' : 'flex items-center min-w-0 w-full overflow-hidden', s.gap, className)}>
      <LogoIcone className={s.icon} textClassName={s.badgeText} />
      {showText && (
        <div className={cn('flex flex-col leading-tight min-w-0 flex-1 overflow-hidden max-w-full', stacked ? 'items-center text-center' : 'justify-center text-left')}>
          <p className={cn('font-bold tracking-wide text-foreground truncate block max-w-full', s.title)}>Localiza</p>
          <p className={cn('mt-0.5 font-medium uppercase tracking-wider text-secondary truncate block max-w-full', s.subtitle)}>
            Inventário de Caminhões
          </p>
        </div>
      )}
    </div>
  )
}
