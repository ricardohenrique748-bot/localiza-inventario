import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SplashScreen } from '@capacitor/splash-screen'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { EmpresaProvider } from '@/contexts/EmpresaContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { Login } from '@/pages/Login'
import { OrbitSplash, ORBIT_SPLASH_MS } from '@/components/OrbitSplash'
import { isNativeApp } from '@/lib/isNativeApp'

const TrocarSenha = lazy(() => import('@/pages/TrocarSenha').then((m) => ({ default: m.TrocarSenha })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Movimentacoes = lazy(() => import('@/pages/Movimentacoes').then((m) => ({ default: m.Movimentacoes })))
const RegistrarEntrada = lazy(() =>
  import('@/pages/RegistrarEntrada').then((m) => ({ default: m.RegistrarEntrada })),
)
const VeiculoDetalhe = lazy(() => import('@/pages/VeiculoDetalhe').then((m) => ({ default: m.VeiculoDetalhe })))
const Configuracoes = lazy(() => import('@/pages/Configuracoes').then((m) => ({ default: m.Configuracoes })))

/**
 * Telas do menu. Depois que o app abre, elas são baixadas uma a uma quando o
 * navegador está ocioso — assim o primeiro clique no menu não espera o download.
 */
const PRE_CARREGAR_TELAS: (() => Promise<unknown>)[] = [
  () => import('@/pages/Dashboard'),
  () => import('@/pages/Movimentacoes'),
  () => import('@/pages/RegistrarEntrada'),
  () => import('@/pages/VeiculoDetalhe'),
  () => import('@/pages/Configuracoes'),
]

function quandoOcioso(fn: () => void) {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 3000 })
  else setTimeout(fn, 300)
}

function usePreCarregarTelas(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    let cancelado = false
    let i = 0
    const proxima = () => {
      if (cancelado || i >= PRE_CARREGAR_TELAS.length) return
      const carregar = PRE_CARREGAR_TELAS[i++]
      carregar()
        .catch(() => {}) // falhou (offline etc.): a tela carrega normal no clique
        .finally(() => quandoOcioso(proxima))
    }
    const t = setTimeout(() => quandoOcioso(proxima), 2000)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [ativo])
}

function PaginaCarregando() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary/30 border-t-primary" />
    </div>
  )
}

export default function App() {
  const [booting, setBooting] = useState(() => isNativeApp())

  useEffect(() => {
    if (!isNativeApp()) return
    SplashScreen.hide()
    const timer = setTimeout(() => setBooting(false), ORBIT_SPLASH_MS)
    return () => clearTimeout(timer)
  }, [])

  usePreCarregarTelas(!booting)

  if (booting) {
    return <OrbitSplash />
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <EmpresaProvider>
            <Suspense fallback={<PaginaCarregando />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/trocar-senha"
                  element={
                    <ProtectedRoute>
                      <TrocarSenha />
                    </ProtectedRoute>
                  }
                />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/movimentacoes" element={<Movimentacoes />} />
                  <Route path="/movimentacoes/nova" element={<RegistrarEntrada />} />
                  <Route path="/veiculos/:id" element={<VeiculoDetalhe />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                </Route>
              </Routes>
            </Suspense>
          </EmpresaProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
