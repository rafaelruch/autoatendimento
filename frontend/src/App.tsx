import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { StoreProvider } from './context/StoreContext';
import { ScannerProvider } from './context/ScannerContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { AdminLogin } from './pages/admin/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminProducts } from './pages/admin/Products';
import { AdminOrders } from './pages/admin/Orders';
import { AdminCustomers } from './pages/admin/Customers';
import { AdminReports } from './pages/admin/Reports';
import { SuperAdminLogin } from './pages/superadmin/Login';
import { SuperAdminDashboard } from './pages/superadmin/Dashboard';
import { SuperAdminStores } from './pages/superadmin/Stores';
import { LandingPage } from './pages/LandingPage';

// Store Layout wrapper
function StoreLayout() {
  return (
    <StoreProvider>
      <ScannerProvider>
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
        <Route
          path="pagamento/sucesso"
          element={
            <Layout hideCartButton>
              <PaymentSuccess />
            </Layout>
          }
        />
        <Route
          path="pagamento/falha"
          element={
            <Layout hideCartButton>
              <PaymentSuccess />
            </Layout>
          }
        />
        <Route
          path="pagamento/pendente"
          element={
            <Layout hideCartButton>
              <PaymentSuccess />
            </Layout>
          }
        />
        </Routes>
      </ScannerProvider>
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
          <Route path="/admin/reports" element={<AdminReports />} />
        </Routes>
        <Toaster position="top-right" />
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
