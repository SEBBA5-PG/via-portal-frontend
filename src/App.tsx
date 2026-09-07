import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './state/authStore'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './pages/auth/LoginPage'
import { RecoveryPage } from './pages/auth/RecoveryPage'
import { LockedOutPage } from './pages/auth/LockedOutPage'
import { SessionExpiredPage } from './pages/auth/SessionExpiredPage'
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage'
import { HomePage } from './pages/HomePage'
import { CategoryPlaceholderPage } from './pages/CategoryPlaceholderPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar" element={<RecoveryPage />} />
          <Route path="/bloqueado" element={<LockedOutPage />} />
          <Route path="/sesion-expirada" element={<SessionExpiredPage />} />
          <Route path="/sin-permiso" element={<AccessDeniedPage />} />
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
      </BrowserRouter>
    </AuthProvider>
  )
}
