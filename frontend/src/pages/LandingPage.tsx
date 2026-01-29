import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActiveStores } from '../services/api';
import type { Store } from '../types';

export function LandingPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await getActiveStores();
        setStores(response.data);
      } catch (error) {
        console.error('Error fetching stores:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AutoMercado SaaS
          </h1>
          <p className="text-xl text-green-100">
            Sistema de autoatendimento para supermercados
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Lojas Disponíveis
          </h2>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center text-green-100">
              <p>Nenhuma loja cadastrada ainda.</p>
              <Link
                to="/superadmin/login"
                className="inline-block mt-4 bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                Acessar Super Admin
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  to={`/${store.slug}`}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
                >
                  <div
                    className="h-3"
                    style={{ backgroundColor: store.primaryColor }}
                  />
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {store.logo ? (
                        <img
                          src={store.logo}
                          alt={store.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                          style={{ backgroundColor: store.primaryColor }}
                        >
                          {store.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                          {store.name}
                        </h3>
                        <p className="text-gray-500 text-sm">/{store.slug}</p>
                      </div>
                    </div>
                    <div
                      className="text-center py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: store.primaryColor }}
                    >
                      Acessar Loja
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/superadmin/login"
            className="text-green-200 hover:text-white transition-colors"
          >
            Acesso Administrativo
          </Link>
        </div>
      </div>
    </div>
  );
}
