export type PaymentProvider = 'MERCADOPAGO' | 'PAGBANK' | 'BOTH';

export type PaymentMethodType = 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD';

export interface Store {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  primaryColor: string;
  active: boolean;
  // Payment settings (visible in admin)
  paymentProvider?: PaymentProvider;
  mpPublicKey?: string | null;
  mpPointDeviceId?: string | null;
  mpPointEnabled?: boolean;
  hasMpToken?: boolean;
  pbEmail?: string | null;
  pbPointSerial?: string | null;
  pbPointEnabled?: boolean;
  hasPbToken?: boolean;
}

export interface PaymentOptions {
  defaultProvider: PaymentProvider;
  online: PaymentProvider[];
  point: PaymentProvider[];
  hasPoint: boolean;
}

export interface PointPaymentResult {
  success: boolean;
  paymentIntentId?: string;
  status?: string;
  message?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  costPrice: number | null;  // Valor de compra
  price: number;             // Valor de venda
  image: string | null;
  category: string | null;
  stock: number;
  barcode: string | null;
  active: boolean;
  storeId: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  paymentId: string | null;
  paymentMethod: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: Product;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  recentOrders: Order[];
}

export interface Customer {
  id: string;
  name: string;
  cpf: string;
  rg: string | null;
  phone: string;
  email: string | null;
  photo: string | null;
  condominium: string;
  block: string | null;
  unit: string;
  active: boolean;
  notes: string | null;
  storeId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
  };
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  topCondominiums: Array<{ name: string; count: number }>;
  ordersLast30Days: number;
}

export interface CustomerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomerListResponse {
  data: Customer[];
  pagination: CustomerPagination;
}

export interface FinancialReport {
  summary: {
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    orderCount: number;
    averageTicket: number;
  };
  byStatus: Array<{
    status: OrderStatus;
    count: number;
    total: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    count: number;
    total: number;
  }>;
  byDay: Array<{
    date: string;
    count: number;
    total: number;
  }>;
}
