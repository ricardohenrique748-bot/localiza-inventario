import { LogoMarca } from '@/components/ui/Logo'

export const BRAND_SPLASH_MS = 1300

/** Tela de boas-vindas no visual do banner da Localiza Seminovos Pesados. */
export function BrandSplash() {
  return (
    <div className="relative min-h-svh flex items-center justify-center bg-[#04662C] overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/[0.06] blur-3xl animate-blob" />
        <div
          className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-[#FC8226]/10 blur-3xl animate-blob"
          style={{ animationDelay: '2s' }}
        />
      </div>
      <div className="relative flex flex-col items-center animate-scale-in">
        <LogoMarca className="w-64 max-w-[75vw]" />
        <span className="my-5 h-px w-32 bg-white/70" />
        <p className="font-display text-4xl font-semibold tracking-tight">Pesados</p>
      </div>
    </div>
  )
}
