import { AnimatePresence } from 'motion/react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './state/authStore'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { TransicionPagina } from './components/TransicionPagina'
import { LoginPage } from './pages/auth/LoginPage'
import { RecoveryPage } from './pages/auth/RecoveryPage'
import { LockedOutPage } from './pages/auth/LockedOutPage'
import { SessionExpiredPage } from './pages/auth/SessionExpiredPage'
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage'
import { HomePage } from './pages/HomePage'
import { CategoryPlaceholderPage } from './pages/CategoryPlaceholderPage'

// Envuelve las rutas del flujo de acceso en el mismo cruce de opacidad/posición que ya usa
// AuthLayout entre pasos — así ir de login a recuperar, a bloqueado, a sesión expirada o a sin
// permiso también cruza suave, en vez del corte instantáneo de siempre de React Router. Para
// que AnimatePresence pueda animar la SALIDA de la ruta vieja, <Routes> necesita su propia
// `location` "congelada" (no la del navegador, que ya cambió) — es el patrón estándar de
// react-router + motion para esto.
function RutasAnimadas() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="/login"
          element={
            <TransicionPagina>
              <LoginPage />
            </TransicionPagina>
          }
        />
        <Route
          path="/recuperar"
          element={
            <TransicionPagina>
              <RecoveryPage />
            </TransicionPagina>
          }
        />
        <Route
          path="/bloqueado"
          element={
            <TransicionPagina>
              <LockedOutPage />
            </TransicionPagina>
          }
        />
        <Route
          path="/sesion-expirada"
          element={
            <TransicionPagina>
              <SessionExpiredPage />
            </TransicionPagina>
          }
        />
        <Route
          path="/sin-permiso"
          element={
            <TransicionPagina>
              <AccessDeniedPage />
            </TransicionPagina>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:categoriaId"
          element={
            <ProtectedRoute>
              <CategoryPlaceholderPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RutasAnimadas />
      </BrowserRouter>
    </AuthProvider>
  )
}
