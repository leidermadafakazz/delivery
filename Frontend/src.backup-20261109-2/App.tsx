import { useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { PublicOnly, RequireAuth, RequireRole } from './components/RouteGuards'
import { PageLoader } from './components/ui/PageLoader'
import { BusinessCatalogPage } from './pages/BusinessCatalogPage'
import { BusinessOrdersPage } from './pages/BusinessOrdersPage'
import { CartPage } from './pages/CartPage'
import { CatalogPage } from './pages/CatalogPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { DashboardPage } from './pages/DashboardPage'
import { DeliveryPage } from './pages/DeliveryPage'
import { LoginPage } from './pages/LoginPage'
import { MyOrdersPage } from './pages/MyOrdersPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
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
            <Route path="/carrito" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/pedidos" element={<MyOrdersPage />} />
            <Route path="/pedidos/:id" element={<OrderDetailPage />} />
          </Route>

          <Route element={<RequireRole roles={['BUSINESS']} />}>
            <Route path="/empresa" element={<BusinessOrdersPage />} />
            <Route path="/empresa/catalogo" element={<BusinessCatalogPage />} />
          </Route>

          <Route element={<RequireRole roles={['DELIVERY']} />}>
            <Route path="/domiciliario" element={<DeliveryPage />} />
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
