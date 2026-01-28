import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { StoreProvider } from './context/StoreContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AdminLogin } from './pages/admin/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminProducts } from './pages/admin/Products';
import { AdminOrders } from './pages/admin/Orders';
import { AdminCustomers } from './pages/admin/Customers';
import { SuperAdminLogin } from './pages/superadmin/Login';
import { SuperAdminDashboard } from './pages/superadmin/Dashboard';
import { SuperAdminStores } from './pages/superadmin/Stores';
import { LandingPage } from './pages/LandingPage';

// Store Layout wrapper
function StoreLayout() {
  return (
    <StoreProvider>
      <Routes>
        <Route
          index
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="carrinho"
          element={
            <Layout hideCartButton>
              <CartPage />
            </Layout>
          }
        />
        <Route
          path="checkout"
          element={
            <Layout hideCartButton>
              <CheckoutPage />
            </Layout>
          }
        />
      </Routes>
    </StoreProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Super Admin routes */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/stores" element={<SuperAdminStores />} />

          {/* Store routes (with slug) */}
          <Route path="/:slug/*" element={<StoreLayout />} />

          {/* Legacy admin routes - redirect */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
        </Routes>
        <Toaster position="top-right" />
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
