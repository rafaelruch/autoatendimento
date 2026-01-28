import { Link, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';

export function Header() {
  const { itemCount, total } = useCart();
  const { store } = useStore();
  const { slug } = useParams();

  return (
    <header
      className="text-white shadow-lg"
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to={`/${slug}`} className="flex items-center gap-3">
          {store?.logo && (
            <img
              src={store.logo}
              alt={store.name}
              className="h-10 w-10 rounded-full object-cover bg-white"
            />
          )}
          <span className="text-2xl font-bold">{store?.name || 'AutoMercado'}</span>
        </Link>

        {/* Mobile cart indicator */}
        <div className="lg:hidden flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span className="font-medium">
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </span>
          <span className="font-bold">
            R$ {total.toFixed(2).replace('.', ',')}
          </span>
        </div>

        {/* Desktop info */}
        <div className="hidden lg:flex items-center gap-4">
          <span className="text-white/80">
            {itemCount} {itemCount === 1 ? 'item' : 'itens'} no carrinho
          </span>
        </div>
      </div>
    </header>
  );
}
