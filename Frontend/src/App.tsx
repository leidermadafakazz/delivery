import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { PublicOnly, RequireAuth, RequireRole } from './components/RouteGuards'
import { PageLoader } from './components/ui/PageLoader'
import { AdminPage } from './pages/AdminPage'
import { AdminProfileChangesPage } from './pages/AdminProfileChangesPage'
import { BusinessApplicationPage } from './pages/BusinessApplicationPage'
import { BusinessCatalogPage } from './pages/BusinessCatalogPage'
import { BusinessOrdersPage } from './pages/BusinessOrdersPage'
import { CartPage } from './pages/CartPage'
import { CatalogPage } from './pages/CatalogPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { DashboardPage } from './pages/DashboardPage'
import { DeliveryApplicationPage } from './pages/DeliveryApplicationPage'
import { DeliveryPage } from './pages/DeliveryPage'
import { EditProfilePage } from './pages/EditProfilePage'
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
          <Route path="/perfil/editar" element={<EditProfilePage />} />

          <Route path="/solicitud/empresa" element={<BusinessApplicationPage />} />
          <Route
            path="/solicitud/domiciliario"
            element={<DeliveryApplicationPage />}
          />

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
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/perfiles" element={<AdminProfileChangesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
