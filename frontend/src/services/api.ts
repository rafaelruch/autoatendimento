import axios from 'axios';
import type {
  Product,
  Order,
  AuthResponse,
  DashboardData,
  Store,
  PaymentOptions,
  PointPaymentResult,
  PaymentProvider,
  Customer,
  CustomerListResponse,
  CustomerStats,
  FinancialReport,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Stores (public)
export const getActiveStores = () => api.get<Store[]>('/stores');
export const getStore = (slug: string) => api.get<Store>(`/stores/${slug}`);
export const getStoreProducts = (slug: string) =>
  api.get<Product[]>(`/stores/${slug}/products`);

// Products (legacy)
export const getProducts = () => api.get<Product[]>('/products');
export const getProduct = (id: string) => api.get<Product>(`/products/${id}`);
export const getProductByBarcode = (barcode: string, storeId: string) =>
  api.get<Product>(`/products/barcode/${barcode}/${storeId}`);

// Orders
export const createOrder = (
  items: { productId: string; quantity: number }[],
  storeId: string
) => api.post<Order>('/orders', { items, storeId });
export const getOrder = (id: string) => api.get<Order>(`/orders/${id}`);

// Payments
export const createPaymentPreference = (orderId: string, provider?: PaymentProvider) =>
  api.post<{
    preferenceId: string;
    initPoint: string;
    qrCode?: string;
    qrCodeBase64?: string;
  }>('/payments/create-preference', { orderId, provider });

export const getPaymentStatus = (paymentId: string) =>
  api.get<{ status: string; paymentProvider?: PaymentProvider; pointPayment?: boolean }>(
    `/payments/status/${paymentId}`
  );

export const getPaymentOptions = (storeId: string) =>
  api.get<PaymentOptions>(`/payments/options/${storeId}`);

// Point (Maquininha) Payments
export const createPointPayment = (orderId: string, provider?: PaymentProvider) =>
  api.post<PointPaymentResult>('/payments/point/create', { orderId, provider });

export const getPointPaymentStatus = (paymentIntentId: string, storeId: string) =>
  api.get<{ status: string; paymentIntentId: string }>(
    `/payments/point/status/${paymentIntentId}?storeId=${storeId}`
  );

export const cancelPointPayment = (paymentIntentId: string, storeId: string) =>
  api.delete(`/payments/point/cancel/${paymentIntentId}`, { data: { storeId } });

export const listPointDevices = (storeId: string) =>
  api.get<{ devices: Array<{ id: string; operating_mode: string }> }>(
    `/payments/devices/${storeId}`
  );

// Auth
export const login = (email: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { email, password });

// Admin - Products
export const adminCreateProduct = (data: Partial<Product>) =>
  api.post<Product>('/admin/products', data);
export const adminUpdateProduct = (id: string, data: Partial<Product>) =>
  api.put<Product>(`/admin/products/${id}`, data);
export const adminDeleteProduct = (id: string) =>
  api.delete(`/admin/products/${id}`);
export const adminUploadProductImage = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post<{ imageUrl: string }>(`/admin/products/${id}/image`, formData);
};

// Admin - Product Import/Export
export const adminExportProducts = (storeId: string) => {
  const token = localStorage.getItem('admin_token');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  window.open(`${baseUrl}/admin/products/export/${storeId}?token=${token}`, '_blank');
};

export const adminDownloadProductTemplate = () => {
  const token = localStorage.getItem('admin_token');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  window.open(`${baseUrl}/admin/products/template?token=${token}`, '_blank');
};

export interface ImportResult {
  success: boolean;
  message: string;
  created: number;
  updated: number;
  errors: string[];
}

export const adminImportProducts = (storeId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<ImportResult>(`/admin/products/import/${storeId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Admin - Orders
export const adminGetOrders = () => api.get<Order[]>('/admin/orders');

// Admin - Dashboard
export const adminGetDashboard = () => api.get<DashboardData>('/admin/dashboard');

// Super Admin - Stores
export const superadminGetStores = () => api.get<Store[]>('/superadmin/stores');
export const superadminCreateStore = (data: Partial<Store> & {
  adminEmail?: string;
  adminPassword?: string;
  adminName?: string;
}) =>
  api.post<Store>('/superadmin/stores', data);
export const superadminUpdateStore = (id: string, data: Partial<Store>) =>
  api.put<Store>(`/superadmin/stores/${id}`, data);
export const superadminDeleteStore = (id: string) =>
  api.delete(`/superadmin/stores/${id}`);

// Super Admin - Users (per store)
export interface StoreUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export const superadminGetStoreUsers = (storeId: string) =>
  api.get<StoreUser[]>(`/superadmin/stores/${storeId}/users`);
export const superadminCreateStoreUser = (storeId: string, data: { email: string; password: string; name: string }) =>
  api.post<StoreUser>(`/superadmin/stores/${storeId}/users`, data);
export const superadminUpdateStoreUser = (userId: string, data: { email?: string; password?: string; name?: string }) =>
  api.put<StoreUser>(`/superadmin/users/${userId}`, data);
export const superadminDeleteStoreUser = (userId: string) =>
  api.delete(`/superadmin/users/${userId}`);

// Upload
export const uploadLogo = (file: File) => {
  const formData = new FormData();
  formData.append('logo', file);
  return api.post<{ url: string }>('/upload/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadCustomerPhoto = (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post<{ url: string }>('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Admin - Customers
export const adminGetCustomers = (
  storeId: string,
  params?: { search?: string; condominium?: string; active?: boolean; page?: number; limit?: number }
) => {
  const queryParams = new URLSearchParams({ storeId });
  if (params?.search) queryParams.append('search', params.search);
  if (params?.condominium) queryParams.append('condominium', params.condominium);
  if (params?.active !== undefined) queryParams.append('active', String(params.active));
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  return api.get<CustomerListResponse>(`/customers?${queryParams}`);
};

export const adminGetCustomer = (id: string, storeId: string) =>
  api.get<Customer>(`/customers/${id}?storeId=${storeId}`);

export const adminGetCustomerByCpf = (cpf: string, storeId: string) =>
  api.get<Customer>(`/customers/cpf/${cpf}?storeId=${storeId}`);

export const adminCreateCustomer = (data: Partial<Customer> & { storeId: string }) =>
  api.post<Customer>(`/customers?storeId=${data.storeId}`, data);

export const adminUpdateCustomer = (id: string, storeId: string, data: Partial<Customer>) =>
  api.put<Customer>(`/customers/${id}?storeId=${storeId}`, data);

export const adminDeleteCustomer = (id: string, storeId: string, permanent?: boolean) =>
  api.delete(`/customers/${id}?storeId=${storeId}${permanent ? '&permanent=true' : ''}`);

export const adminGetCustomerCondominiums = (storeId: string) =>
  api.get<Array<{ name: string; count: number }>>(`/customers/condominiums?storeId=${storeId}`);

export const adminGetCustomerStats = (storeId: string) =>
  api.get<CustomerStats>(`/customers/stats?storeId=${storeId}`);

// Admin - Financial Reports
export const adminGetFinancialReport = (startDate: string, endDate: string) =>
  api.get<FinancialReport>('/admin/reports/financial', {
    params: { startDate, endDate },
  });

export const adminExportFinancialReport = (startDate: string, endDate: string) => {
  const token = localStorage.getItem('admin_token');
  const baseUrl = import.meta.env.VITE_API_URL || '/api';
  window.open(`${baseUrl}/admin/reports/financial/export?startDate=${startDate}&endDate=${endDate}&token=${token}`, '_blank');
};

export default api;
