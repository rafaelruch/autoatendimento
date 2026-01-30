import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  superadminGetStores,
  superadminCreateStore,
  superadminUpdateStore,
  superadminDeleteStore,
  superadminGetStoreUsers,
  superadminCreateStoreUser,
  superadminUpdateStoreUser,
  superadminDeleteStoreUser,
  uploadLogo,
  type StoreUser,
} from '../../services/api';
import type { Store, PaymentProvider } from '../../types';
import toast from 'react-hot-toast';

type TabType = 'general' | 'payment' | 'users';

interface StoreFormData {
  name: string;
  slug: string;
  logo: string;
  primaryColor: string;
  // Payment settings
  paymentProvider: PaymentProvider;
  mpAccessToken: string;
  mpPublicKey: string;
  mpPointDeviceId: string;
  mpPointEnabled: boolean;
  pbToken: string;
  pbEmail: string;
  pbPointSerial: string;
  pbPointEnabled: boolean;
  // Admin user (for new stores)
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

const initialFormData: StoreFormData = {
  name: '',
  slug: '',
  logo: '',
  primaryColor: '#16a34a',
  paymentProvider: 'MERCADOPAGO',
  mpAccessToken: '',
  mpPublicKey: '',
  mpPointDeviceId: '',
  mpPointEnabled: false,
  pbToken: '',
  pbEmail: '',
  pbPointSerial: '',
  pbPointEnabled: false,
  adminEmail: '',
  adminPassword: '',
  adminName: '',
};

export function SuperAdminStores() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState<StoreFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showMpToken, setShowMpToken] = useState(false);
  const [showPbToken, setShowPbToken] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // User management state
  const [storeUsers, setStoreUsers] = useState<StoreUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<StoreUser | null>(null);
  const [userFormData, setUserFormData] = useState({ email: '', password: '', name: '' });
  const [showUserPassword, setShowUserPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');

    if (!token || !user) {
      navigate('/superadmin/login');
      return;
    }

    const userData = JSON.parse(user);
    if (userData.role !== 'SUPER_ADMIN') {
      navigate('/superadmin/login');
      return;
    }

    fetchStores();
  }, [navigate]);

  const fetchStores = async () => {
    try {
      const response = await superadminGetStores();
      setStores(response.data);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        slug: store.slug,
        logo: store.logo || '',
        primaryColor: store.primaryColor,
        paymentProvider: store.paymentProvider || 'MERCADOPAGO',
        mpAccessToken: '', // Tokens are not returned from API for security
        mpPublicKey: store.mpPublicKey || '',
        mpPointDeviceId: store.mpPointDeviceId || '',
        mpPointEnabled: store.mpPointEnabled || false,
        pbToken: '',
        pbEmail: store.pbEmail || '',
        pbPointSerial: store.pbPointSerial || '',
        pbPointEnabled: store.pbPointEnabled || false,
        adminEmail: '',
        adminPassword: '',
        adminName: '',
      });
      setLogoPreview(store.logo || null);
      // Fetch users for this store
      fetchStoreUsers(store.id);
    } else {
      setEditingStore(null);
      setFormData(initialFormData);
      setLogoPreview(null);
      setStoreUsers([]);
    }
    setActiveTab('general');
    setShowMpToken(false);
    setShowPbToken(false);
    setShowAdminPassword(false);
    setShowModal(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const response = await uploadLogo(file);
      setFormData({ ...formData, logo: response.data.url });
      toast.success('Logo carregado');
    } catch (error) {
      toast.error('Erro ao fazer upload da logo');
      setLogoPreview(formData.logo || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo: '' });
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: editingStore ? formData.slug : generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Build data to submit (only include tokens if they have values)
    const submitData: Partial<StoreFormData> & {
      adminEmail?: string;
      adminPassword?: string;
      adminName?: string;
    } = {
      name: formData.name,
      slug: formData.slug,
      logo: formData.logo,
      primaryColor: formData.primaryColor,
      paymentProvider: formData.paymentProvider,
      mpPublicKey: formData.mpPublicKey,
      mpPointDeviceId: formData.mpPointDeviceId,
      mpPointEnabled: formData.mpPointEnabled,
      pbEmail: formData.pbEmail,
      pbPointSerial: formData.pbPointSerial,
      pbPointEnabled: formData.pbPointEnabled,
    };

    // Only include tokens if they were changed
    if (formData.mpAccessToken) {
      submitData.mpAccessToken = formData.mpAccessToken;
    }
    if (formData.pbToken) {
      submitData.pbToken = formData.pbToken;
    }

    // Include admin user data for new stores
    if (!editingStore && formData.adminEmail && formData.adminPassword) {
      submitData.adminEmail = formData.adminEmail;
      submitData.adminPassword = formData.adminPassword;
      submitData.adminName = formData.adminName || formData.name + ' Admin';
    }

    try {
      if (editingStore) {
        await superadminUpdateStore(editingStore.id, submitData);
        toast.success('Loja atualizada');
      } else {
        await superadminCreateStore(submitData);
        toast.success('Loja criada' + (formData.adminEmail ? ' com administrador' : ''));
      }
      setShowModal(false);
      fetchStores();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar loja');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta loja? Todos os produtos e pedidos serão removidos.')) {
      return;
    }

    try {
      await superadminDeleteStore(id);
      toast.success('Loja excluída');
      fetchStores();
    } catch (error) {
      toast.error('Erro ao excluir loja');
    }
  };

  const handleToggleActive = async (store: any) => {
    try {
      await superadminUpdateStore(store.id, { active: !store.active });
      toast.success(store.active ? 'Loja desativada' : 'Loja ativada');
      fetchStores();
    } catch (error) {
      toast.error('Erro ao atualizar loja');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/superadmin/login');
  };

  const getProviderLabel = (provider: PaymentProvider) => {
    switch (provider) {
      case 'MERCADOPAGO':
        return 'Mercado Pago';
      case 'PAGBANK':
        return 'PagBank';
      default:
        return provider;
    }
  };

  const handleProviderChange = (provider: PaymentProvider) => {
    // Clear the other provider's data when switching
    if (provider === 'MERCADOPAGO') {
      setFormData({
        ...formData,
        paymentProvider: provider,
        // Clear PagBank fields
        pbToken: '',
        pbEmail: '',
        pbPointSerial: '',
        pbPointEnabled: false,
      });
    } else if (provider === 'PAGBANK') {
      setFormData({
        ...formData,
        paymentProvider: provider,
        // Clear Mercado Pago fields
        mpAccessToken: '',
        mpPublicKey: '',
        mpPointDeviceId: '',
        mpPointEnabled: false,
      });
    }
  };

  // User management functions
  const fetchStoreUsers = async (storeId: string) => {
    setLoadingUsers(true);
    try {
      const response = await superadminGetStoreUsers(storeId);
      setStoreUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setStoreUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const openUserModal = (user?: StoreUser) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({ email: user.email, password: '', name: user.name });
    } else {
      setEditingUser(null);
      setUserFormData({ email: '', password: '', name: '' });
    }
    setShowUserPassword(false);
    setShowUserModal(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    try {
      if (editingUser) {
        const updateData: { email?: string; password?: string; name?: string } = {};
        if (userFormData.email !== editingUser.email) updateData.email = userFormData.email;
        if (userFormData.password) updateData.password = userFormData.password;
        if (userFormData.name !== editingUser.name) updateData.name = userFormData.name;

        await superadminUpdateStoreUser(editingUser.id, updateData);
        toast.success('Usuário atualizado');
      } else {
        await superadminCreateStoreUser(editingStore.id, userFormData);
        toast.success('Usuário criado');
      }
      setShowUserModal(false);
      fetchStoreUsers(editingStore.id);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    if (!editingStore) return;

    try {
      await superadminDeleteStoreUser(userId);
      toast.success('Usuário excluído');
      fetchStoreUsers(editingStore.id);
    } catch (error) {
      toast.error('Erro ao excluir usuário');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h1 className="text-xl font-bold">Super Admin</h1>
        </div>
        <nav className="mt-6">
          <Link
            to="/superadmin"
            className="flex items-center gap-3 px-6 py-3 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>
          <Link
            to="/superadmin/stores"
            className="flex items-center gap-3 px-6 py-3 bg-gray-800 text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Lojas
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
          <h2 className="text-2xl font-bold text-gray-800">Lojas</h2>
          <button
            onClick={() => openModal()}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Loja
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <div key={store.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="h-2" style={{ backgroundColor: store.primaryColor }} />
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  {store.logo ? (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: store.primaryColor }}
                    >
                      {store.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{store.name}</h3>
                    <p className="text-gray-500 text-sm">/{store.slug}</p>
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-gray-600 mb-3">
                  <span>{store._count?.products || 0} produtos</span>
                  <span>{store._count?.orders || 0} pedidos</span>
                </div>

                {/* Payment info */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                    {getProviderLabel(store.paymentProvider || 'MERCADOPAGO')}
                  </span>
                  {store.hasMpToken && (
                    <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                      MP Configurado
                    </span>
                  )}
                  {store.hasPbToken && (
                    <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                      PB Configurado
                    </span>
                  )}
                  {(store.mpPointEnabled || store.pbPointEnabled) && (
                    <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                      Maquininha
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleToggleActive(store)}
                    className={`px-3 py-1 text-xs rounded-full ${
                      store.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {store.active ? 'Ativo' : 'Inativo'}
                  </button>

                  <div className="flex gap-2">
                    <a
                      href={`/${store.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700"
                      title="Abrir loja"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <button
                      onClick={() => openModal(store)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Editar"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Excluir"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {stores.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <svg className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-lg">Nenhuma loja cadastrada</p>
              <p className="text-sm mt-2">Clique em "Nova Loja" para começar</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingStore ? 'Editar Loja' : 'Nova Loja'}
              </h3>
            </div>

            {/* Tabs */}
            <div className="border-b">
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'general'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Geral
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('payment')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'payment'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Pagamentos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'users'
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Usuários
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* General Tab */}
              {activeTab === 'general' && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Loja *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                      placeholder="Mercado Central"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug (URL) *
                    </label>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">/</span>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        required
                        pattern="[a-z0-9-]+"
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                        placeholder="mercado-central"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Apenas letras minúsculas, números e hífens
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logo
                    </label>
                    <div className="space-y-3">
                      {logoPreview && (
                        <div className="flex items-center gap-4">
                          <img
                            src={logoPreview}
                            alt="Preview"
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remover
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className={`px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm ${
                            uploading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {uploading ? 'Enviando...' : 'Escolher arquivo'}
                        </label>
                        <span className="text-xs text-gray-500">
                          PNG, JPG ou GIF (máx. 5MB)
                        </span>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Ou insira uma URL:</p>
                        <input
                          type="url"
                          value={formData.logo}
                          onChange={(e) => {
                            setFormData({ ...formData, logo: e.target.value });
                            setLogoPreview(e.target.value || null);
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 text-sm"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cor Primária
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                        placeholder="#16a34a"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Tab */}
              {activeTab === 'payment' && (
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provedor de Pagamento
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Escolha apenas um provedor de pagamento para esta loja
                    </p>
                    <div className="flex gap-3">
                      {(['MERCADOPAGO', 'PAGBANK'] as PaymentProvider[]).map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => handleProviderChange(provider)}
                          className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                            formData.paymentProvider === provider
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {getProviderLabel(provider)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mercado Pago Section - Only show when selected */}
                  {formData.paymentProvider === 'MERCADOPAGO' && (
                  <div className="border rounded-lg p-4 border-blue-200 bg-blue-50/30">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                      </svg>
                      Configurar Mercado Pago
                      {editingStore?.hasMpToken && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Token configurado
                        </span>
                      )}
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Access Token
                        </label>
                        <div className="relative">
                          <input
                            type={showMpToken ? 'text' : 'password'}
                            value={formData.mpAccessToken}
                            onChange={(e) => setFormData({ ...formData, mpAccessToken: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 pr-10"
                            placeholder={editingStore?.hasMpToken ? '••••••••••••••••' : 'APP_USR-...'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowMpToken(!showMpToken)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          >
                            {showMpToken ? (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Obtenha em: developers.mercadopago.com
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Public Key
                        </label>
                        <input
                          type="text"
                          value={formData.mpPublicKey}
                          onChange={(e) => setFormData({ ...formData, mpPublicKey: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                          placeholder="APP_USR-..."
                        />
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-gray-700">
                            Maquininha Point
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.mpPointEnabled}
                              onChange={(e) => setFormData({ ...formData, mpPointEnabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                          </label>
                        </div>

                        {formData.mpPointEnabled && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ID do Terminal Point
                            </label>
                            <input
                              type="text"
                              value={formData.mpPointDeviceId}
                              onChange={(e) => setFormData({ ...formData, mpPointDeviceId: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                              placeholder="GERTEC__..."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Encontre nas configurações do app Mercado Pago
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}

                  {/* PagBank Section - Only show when selected */}
                  {formData.paymentProvider === 'PAGBANK' && (
                  <div className="border rounded-lg p-4 border-orange-200 bg-orange-50/30">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="h-5 w-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                      </svg>
                      Configurar PagBank
                      {editingStore?.hasPbToken && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Token configurado
                        </span>
                      )}
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Token de API
                        </label>
                        <div className="relative">
                          <input
                            type={showPbToken ? 'text' : 'password'}
                            value={formData.pbToken}
                            onChange={(e) => setFormData({ ...formData, pbToken: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 pr-10"
                            placeholder={editingStore?.hasPbToken ? '••••••••••••••••' : 'Token PagBank'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPbToken(!showPbToken)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          >
                            {showPbToken ? (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Obtenha em: developer.pagbank.com.br
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email da Conta PagBank
                        </label>
                        <input
                          type="email"
                          value={formData.pbEmail}
                          onChange={(e) => setFormData({ ...formData, pbEmail: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                          placeholder="loja@email.com"
                        />
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-gray-700">
                            Maquininha Moderninha
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.pbPointEnabled}
                              onChange={(e) => setFormData({ ...formData, pbPointEnabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                          </label>
                        </div>

                        {formData.pbPointEnabled && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Serial da Moderninha
                            </label>
                            <input
                              type="text"
                              value={formData.pbPointSerial}
                              onChange={(e) => setFormData({ ...formData, pbPointSerial: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                              placeholder="Serial Number"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Encontre na parte traseira da maquininha
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="p-6 space-y-4">
                  {editingStore ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-800">
                          Usuários da Loja
                        </h4>
                        <button
                          type="button"
                          onClick={() => openUserModal()}
                          className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center gap-1"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Novo Usuário
                        </button>
                      </div>

                      {loadingUsers ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
                        </div>
                      ) : storeUsers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <svg className="h-12 w-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p>Nenhum usuário cadastrado</p>
                          <p className="text-sm">Clique em "Novo Usuário" para adicionar</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {storeUsers.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-800">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openUserModal(user)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Editar"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Excluir"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-gray-600 text-sm">
                        Crie um administrador para esta loja (opcional). Você também pode adicionar usuários depois.
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome do Administrador
                        </label>
                        <input
                          type="text"
                          value={formData.adminName}
                          onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                          placeholder="Nome do administrador"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email do Administrador
                        </label>
                        <input
                          type="email"
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                          placeholder="admin@loja.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Senha do Administrador
                        </label>
                        <div className="relative">
                          <input
                            type={showAdminPassword ? 'text' : 'password'}
                            value={formData.adminPassword}
                            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 pr-10"
                            placeholder="Senha segura"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          >
                            {showAdminPassword ? (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      {formData.adminEmail && !formData.adminPassword && (
                        <p className="text-amber-600 text-sm">
                          Preencha a senha para criar o administrador
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Form Actions */}
              <div className="p-6 border-t flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
            </div>
            <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {editingUser ? '(deixe vazio para manter)' : '*'}
                </label>
                <div className="relative">
                  <input
                    type={showUserPassword ? 'text' : 'password'}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    required={!editingUser}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showUserPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
