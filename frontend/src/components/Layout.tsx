import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from './Header';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';

interface LayoutProps {
  children: ReactNode;
  hideCartButton?: boolean;
}

export function Layout({ children, hideCartButton = false }: LayoutProps) {
  const { store, loading, error } = useStore();
  const { itemCount, total } = useCart();
  const navigate = useNavigate();
  const { slug } = useParams();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <svg
            className="h-24 w-24 mx-auto mb-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Loja não encontrada</h1>
          <p className="text-gray-500">Verifique o endereço e tente novamente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* Floating Cart Button - Green color to encourage purchase */}
      {!hideCartButton && itemCount > 0 && (
        <div className="fixed bottom-4 left-60 right-4 z-50">
          <button
            onClick={() => navigate(`/${slug}/carrinho`)}
            className="w-full py-4 rounded-xl text-white font-semibold flex items-center justify-between px-6 shadow-2xl bg-green-600 hover:bg-green-700 touch-manipulation active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full px-3 py-1">
                <span>{itemCount}</span>
              </div>
              <span>Ver Carrinho</span>
            </div>
            <span className="text-lg font-bold">
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
