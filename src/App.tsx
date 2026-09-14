import { AnimatePresence } from 'motion/react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './state/authStore'
import { AdminProvider } from './state/adminStore'
import { NavegacionGuardiaProvider } from './state/navegacionGuardiaStore'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { RutaCategoria } from './routes/RutaCategoria'
import { TransicionPagina } from './components/TransicionPagina'
import { LoginPage } from './pages/auth/LoginPage'
import { RecoveryPage } from './pages/auth/RecoveryPage'
import { LockedOutPage } from './pages/auth/LockedOutPage'
import { SessionExpiredPage } from './pages/auth/SessionExpiredPage'
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage'
import { HomePage } from './pages/HomePage'
import { CategoryPlaceholderPage } from './pages/CategoryPlaceholderPage'
import { CuentasPage } from './pages/pw04/CuentasPage'
import { CrearCuentaPage } from './pages/pw04/CrearCuentaPage'
import { FichaCuentaPage } from './pages/pw04/FichaCuentaPage'
import { SolicitudesPage } from './pages/pw04/SolicitudesPage'
import { OperacionProvider } from './state/operacionStore'
import { UsuariosPage } from './pages/pw03/UsuariosPage'
import { FichaUsuarioPage } from './pages/pw03/FichaUsuarioPage'
import { MisionesPage } from './pages/pw05/MisionesPage'
import { MisionFormPage } from './pages/pw05/MisionFormPage'
import { DetalleMisionPage } from './pages/pw05/DetalleMisionPage'
import type { ReactNode } from 'react'

// Ruta de categoría: sesión + guard de la Matriz de Acceso ("ocultar no es autorizar").
function Categoria({ id, children }: { id: string; children: ReactNode }) {
  return (
    <ProtectedRoute>
      <RutaCategoria categoriaId={id}>{children}</RutaCategoria>
    </ProtectedRoute>
  )
}

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
        {/* PW-03 — Usuarios y ciclo de vida */}
        <Route path="/PW-03" element={<Categoria id="PW-03"><UsuariosPage /></Categoria>} />
        <Route path="/PW-03/usuario/:usuarioId" element={<Categoria id="PW-03"><FichaUsuarioPage /></Categoria>} />
        {/* PW-05 — Misiones */}
        <Route path="/PW-05" element={<Categoria id="PW-05"><MisionesPage /></Categoria>} />
        <Route path="/PW-05/nueva" element={<Categoria id="PW-05"><MisionFormPage /></Categoria>} />
        <Route path="/PW-05/mision/:misionId" element={<Categoria id="PW-05"><DetalleMisionPage /></Categoria>} />
        <Route path="/PW-05/mision/:misionId/editar" element={<Categoria id="PW-05"><MisionFormPage /></Categoria>} />
        {/* PW-04 — Roles y permisos. Rutas explícitas antes del comodín de categoría: React
            Router prioriza el segmento estático, así que /PW-04 nunca cae en el placeholder. */}
        <Route
          path="/PW-04"
          element={
            <ProtectedRoute>
              <RutaCategoria categoriaId="PW-04">
                <CuentasPage />
              </RutaCategoria>
            </ProtectedRoute>
          }
        />
        <Route
          path="/PW-04/nueva"
          element={
            <ProtectedRoute>
              <RutaCategoria categoriaId="PW-04">
                <CrearCuentaPage />
              </RutaCategoria>
            </ProtectedRoute>
          }
        />
        <Route
          path="/PW-04/solicitudes"
          element={
            <ProtectedRoute>
              <RutaCategoria categoriaId="PW-04">
                <SolicitudesPage />
              </RutaCategoria>
            </ProtectedRoute>
          }
        />
        <Route
          path="/PW-04/cuenta/:cuentaId"
          element={
            <ProtectedRoute>
              <RutaCategoria categoriaId="PW-04">
                <FichaCuentaPage />
              </RutaCategoria>
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
    <NavegacionGuardiaProvider>
      <AuthProvider>
        <AdminProvider>
          <OperacionProvider>
            <BrowserRouter>
              <RutasAnimadas />
            </BrowserRouter>
          </OperacionProvider>
        </AdminProvider>
      </AuthProvider>
    </NavegacionGuardiaProvider>
  )
}
