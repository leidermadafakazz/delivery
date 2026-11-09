import { useEffect } from 'react'
import { Bike, Building2, ReceiptText, ShieldCheck } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { PublicOnly, RequireAuth, RequireRole } from './components/RouteGuards'
import { PageLoader } from './components/ui/PageLoader'
import { CatalogPage } from './pages/CatalogPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { StoreDetailPage } from './pages/StoreDetailPage'
import { useAuthStore } from './store/auth.store'

function App() {
  const initialized = useAuthStore((state) => state.initialized)
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  if (!initialized) {
    return <PageLoader />
  }

  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/panel" replace />} />
          <Route path="/panel" element={<DashboardPage />} />
          <Route path="/perfil" element={<ProfilePage />} />

          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/catalogo/:id" element={<StoreDetailPage />} />

          <Route element={<RequireRole roles={['CLIENT']} />}>
            <Route
              path="/pedidos"
              element={
                <ComingSoonPage
                  title="Mis pedidos"
                  description="Consulta el historial y el estado de tus pedidos en tiempo real."
                  phase="Fase 3"
                  icon={ReceiptText}
                  features={[
                    'Historial de pedidos con su estado actual.',
                    'Detalle de productos, totales y dirección de entrega.',
                    'Cancelación de pedidos pendientes.',
                  ]}
                />
              }
            />
          </Route>

          <Route element={<RequireRole roles={['BUSINESS']} />}>
            <Route
              path="/empresa"
              element={
                <ComingSoonPage
                  title="Mi empresa"
                  description="Administra tu negocio, tu catálogo y los pedidos recibidos."
                  phase="Fase 4"
                  icon={Building2}
                  features={[
                    'Datos del negocio y estado de aprobación.',
                    'Gestión de categorías y productos.',
                    'Pedidos entrantes y cambio de estado.',
                  ]}
                />
              }
            />
          </Route>

          <Route element={<RequireRole roles={['DELIVERY']} />}>
            <Route
              path="/domiciliario"
              element={
                <ComingSoonPage
                  title="Domicilios"
                  description="Toma pedidos listos para entregar y registra cada entrega."
                  phase="Fase 4"
                  icon={Bike}
                  features={[
                    'Pedidos disponibles para recoger.',
                    'Detalle de la entrega y datos del cliente.',
                    'Historial de entregas completadas.',
                  ]}
                />
              }
            />
          </Route>

          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route
              path="/admin"
              element={
                <ComingSoonPage
                  title="Administración"
                  description="Aprueba solicitudes de empresa y domiciliario, y supervisa la operación."
                  phase="Fase 5"
                  icon={ShieldCheck}
                  features={[
                    'Aprobación o rechazo de solicitudes.',
                    'Gestión de usuarios y sus roles.',
                    'Supervisión de pedidos y reportes.',
                  ]}
                />
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
