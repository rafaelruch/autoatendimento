import { Link, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CartItem } from './CartItem';

export function Cart() {
  const { items, total, clearCart } = useCart();
  const { slug } = useParams();

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-24 w-24 mx-auto mb-4 text-gray-300"
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
        <h2 className="text-xl font-semibold text-gray-600 mb-2">
          Seu carrinho está vazio
        </h2>
        <p className="text-gray-500 mb-6">
          Adicione produtos para começar suas compras
        </p>
        <Link
          to={`/${slug}`}
          className="inline-block text-white font-medium px-6 py-3 rounded-lg transition-colors btn-primary"
        >
          Ver Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          Seu Carrinho ({items.length} {items.length === 1 ? 'item' : 'itens'})
        </h2>
        <button
          onClick={clearCart}
          className="text-red-500 hover:text-red-700 text-sm font-medium"
        >
          Limpar carrinho
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <CartItem key={item.product.id} item={item} />
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <div className="flex justify-between items-center text-xl font-bold mb-4">
          <span>Total:</span>
          <span style={{ color: 'var(--color-primary)' }}>
            R$ {total.toFixed(2).replace('.', ',')}
          </span>
        </div>

        <Link
          to={`/${slug}/checkout`}
          className="block w-full text-white text-center font-bold py-4 rounded-lg transition-colors text-lg btn-primary"
        >
          Finalizar Compra
        </Link>
      </div>
    </div>
  );
}
