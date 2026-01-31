import { Link, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CartItem } from './CartItem';

export function Cart() {
  const { items, total, clearCart } = useCart();
  const { slug } = useParams();

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-20 w-20 sm:h-24 sm:w-24 mx-auto mb-4 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
            Seu carrinho está vazio
          </h2>
          <p className="text-sm sm:text-base text-gray-500 mb-6">
            Adicione produtos para começar suas compras
          </p>
          <Link
            to={`/${slug}`}
            className="inline-block text-white font-medium px-6 py-3 sm:py-4 rounded-xl transition-colors btn-primary text-base sm:text-lg"
          >
            Ver Produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">
          Seu Carrinho ({items.length} {items.length === 1 ? 'item' : 'itens'})
        </h2>
        <button
          onClick={clearCart}
          className="text-red-500 hover:text-red-700 text-sm font-medium py-2 px-3"
        >
          Limpar carrinho
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {items.map((item) => (
          <CartItem key={item.product.id} item={item} />
        ))}
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center text-lg sm:text-xl font-bold mb-4">
          <span>Total:</span>
          <span style={{ color: 'var(--color-primary)' }}>
            R$ {total.toFixed(2).replace('.', ',')}
          </span>
        </div>

        <div className="space-y-3">
          <Link
            to={`/${slug}/checkout`}
            className="block w-full text-white text-center font-bold py-4 sm:py-5 rounded-xl transition-colors text-base sm:text-lg btn-primary"
          >
            Finalizar Compra
          </Link>

          <Link
            to={`/${slug}`}
            className="block w-full text-center font-medium py-3 sm:py-4 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Continuar Comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
