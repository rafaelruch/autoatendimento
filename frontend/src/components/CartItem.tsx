import type { CartItem as CartItemType } from '../types';
import { useCart } from '../context/CartContext';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const { product, quantity } = item;

  return (
    <div className="flex items-center gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-800 text-base sm:text-lg line-clamp-2">{product.name}</h3>
        <p className="font-bold text-lg sm:text-xl mt-1" style={{ color: 'var(--color-primary)' }}>
          R$ {product.price.toFixed(2).replace('.', ',')}
        </p>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => updateQuantity(product.id, quantity - 1)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-all touch-manipulation active:scale-90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="w-10 text-center font-bold text-xl sm:text-2xl">{quantity}</span>
        <button
          onClick={() => updateQuantity(product.id, quantity + 1)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-all touch-manipulation active:scale-90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="text-right">
        <p className="font-bold text-xl sm:text-2xl">
          R$ {(product.price * quantity).toFixed(2).replace('.', ',')}
        </p>
        <button
          onClick={() => removeItem(product.id)}
          className="text-red-500 hover:text-red-700 text-base font-semibold mt-2 py-2 px-3 touch-manipulation active:scale-95"
        >
          Remover
        </button>
      </div>
    </div>
  );
}
