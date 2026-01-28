import type { Product } from '../types';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem(product);
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-gray-100 relative">
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
              className="h-16 w-16"
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
        {product.stock <= 5 && product.stock > 0 && (
          <span className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
            Últimas unidades
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-4 py-2 rounded font-bold">
              Esgotado
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        {product.category && (
          <span
            className="text-xs font-medium uppercase"
            style={{ color: 'var(--color-primary)' }}
          >
            {product.category}
          </span>
        )}
        <h3 className="font-semibold text-gray-800 mt-1 line-clamp-2">
          {product.name}
        </h3>
        <p
          className="text-2xl font-bold mt-2"
          style={{ color: 'var(--color-primary)' }}
        >
          R$ {product.price.toFixed(2).replace('.', ',')}
        </p>

        <button
          onClick={handleAdd}
          disabled={product.stock === 0}
          className="w-full mt-4 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors btn-primary"
        >
          {product.stock === 0 ? 'Indisponível' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}
