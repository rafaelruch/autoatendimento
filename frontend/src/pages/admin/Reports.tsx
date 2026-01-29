import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminGetFinancialReport, adminExportFinancialReport } from '../../services/api';
import type { FinancialReport } from '../../types';
import toast from 'react-hot-toast';

type DateFilter = 'today' | '7days' | '30days' | 'custom';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(filter: DateFilter, customStart?: string, customEnd?: string) {
  const today = new Date();
  let start: Date;
  let end: Date = today;

  switch (filter) {
    case 'today':
      start = today;
      break;
    case '7days':
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = customEnd ? new Date(customEnd) : today;
      break;
    default:
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start: formatDate(start), end: formatDate(end) };
}

export function AdminReports() {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>('30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [storeName, setStoreName] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setStoreName(user.storeName || '');
      } catch {
        // ignore
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchReport();
  }, [filter, customStart, customEnd]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(filter, customStart, customEnd);
      const response = await adminGetFinancialReport(start, end);
      setReport(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Erro ao carregar relatorio');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const { start, end } = getDateRange(filter, customStart, customEnd);
    adminExportFinancialReport(start, end);
    toast.success('Exportacao iniciada');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Pago';
      case 'PENDING':
        return 'Pendente';
      case 'CANCELLED':
        return 'Cancelado';
      case 'REFUNDED':
        return 'Reembolsado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !report) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h1 className="text-xl font-bold">{storeName || 'Admin'}</h1>
          {storeName && <p className="text-xs text-gray-400 mt-1">Painel Administrativo</p>}
        </div>
        <nav className="mt-6">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-6 py-3 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>
          <Link
            to="/admin/products"
            className="flex items-center gap-3 px-6 py-3 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Produtos
          </Link>
          <Link
            to="/admin/orders"
            className="flex items-center gap-3 px-6 py-3 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Pedidos
          </Link>
          <Link
            to="/admin/reports"
            className="flex items-center gap-3 px-6 py-3 bg-gray-800 text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Relatorios
          </Link>
        </nav>
        <div className="absolute bottom-0 w-full p-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Relatorio Financeiro</h2>
          <div className="flex items-center gap-3">
            {/* Date filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as DateFilter)}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="today">Hoje</option>
              <option value="7days">Ultimos 7 dias</option>
              <option value="30days">Ultimos 30 dias</option>
              <option value="custom">Personalizado</option>
            </select>

            {filter === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
                <span className="text-gray-500">ate</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </>
            )}

            <button
              onClick={handleExport}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : report ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Receita Total</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(report.summary.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total de Pedidos</p>
                    <p className="text-2xl font-bold text-gray-800">{report.summary.orderCount}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Ticket Medio</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(report.summary.averageTicket)}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Receita Pendente</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(report.summary.pendingRevenue)}
                    </p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* By Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Por Status</h3>
                <div className="space-y-3">
                  {report.byStatus.map((item) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                        <span className="text-gray-600">{item.count} pedidos</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  {report.byStatus.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nenhum dado disponivel</p>
                  )}
                </div>
              </div>

              {/* By Payment Method */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Por Metodo de Pagamento</h3>
                <div className="space-y-3">
                  {report.byPaymentMethod.map((item) => (
                    <div key={item.method} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {item.method}
                        </span>
                        <span className="text-gray-600">{item.count} pedidos</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  {report.byPaymentMethod.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nenhum dado disponivel</p>
                  )}
                </div>
              </div>
            </div>

            {/* Daily Summary Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Resumo Diario</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pedidos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Receita
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ticket Medio
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.byDay.map((day) => (
                      <tr key={day.date}>
                        <td className="px-6 py-4 text-sm">
                          {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-sm">{day.count}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {formatCurrency(day.total)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {formatCurrency(day.count > 0 ? day.total / day.count : 0)}
                        </td>
                      </tr>
                    ))}
                    {report.byDay.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Nenhum pedido no periodo selecionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Nenhum dado disponivel
          </div>
        )}
      </main>
    </div>
  );
}
