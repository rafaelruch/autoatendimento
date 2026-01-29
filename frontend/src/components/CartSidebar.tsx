import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { createOrder, createPaymentPreference } from '../services/api';
import toast from 'react-hot-toast';

export function CartSidebar() {
  const { items, total, updateQuantity, removeItem, clearCart, itemCount } = useCart();
  const { store } = useStore();
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0 || !store) {
      toast.error('Carrinho vazio');
      return;
    }

    setLoading(true);

    try {
      const orderResponse = await createOrder(
        items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        store.id
      );

      const paymentResponse = await createPaymentPreference(orderResponse.data.id);
      clearCart();
      window.location.href = paymentResponse.data.initPoint;
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erro ao processar pedido');
      setLoading(false);
    }
  };

  // Mobile toggle button
  const MobileToggle = () => (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-4 right-4 z-40 lg:hidden bg-primary text-white p-4 rounded-full shadow-lg flex items-center gap-2"
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {itemCount > 0 && (
        <span className="bg-white text-primary font-bold px-2 py-1 rounded-full text-sm" style={{ color: 'var(--color-primary)' }}>
          {itemCount}
        </span>
      )}
    </button>
  );

  // Sidebar content
  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--color-primary)' }}>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Carrinho
        </h2>
        <button onClick={() => setIsOpen(false)} className="lg:hidden text-white">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>Carrinho vazio</p>
            <p className="text-sm mt-2">Adicione produtos para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.product.id} className="bg-white rounded-lg shadow p-3">
                <div className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-800 truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                      R$ {item.product.price.toFixed(2).replace('.', ',')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="p-4 border-t bg-white">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">Total:</span>
            <span className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processando...
              </span>
            ) : (
              'Finalizar Compra'
            )}
          </button>
          <button
            onClick={clearCart}
            className="w-full mt-2 text-red-500 hover:text-red-700 text-sm font-medium py-2"
          >
            Limpar carrinho
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <MobileToggle />

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-80 bg-gray-50 z-50 transform transition-transform lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-80 bg-gray-50 border-l flex-shrink-0">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>
    </>
  );
}
