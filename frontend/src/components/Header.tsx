import { Link, useParams, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useScanner } from '../context/ScannerContext';

export function Header() {
  const { itemCount, total, isAnimating } = useCart();
  const { store } = useStore();
  const { slug } = useParams();
  const location = useLocation();
  const { openScanner } = useScanner();

  // Only show scanner button on home page (not cart, checkout, etc)
  const isHomePage = location.pathname === `/${slug}` || location.pathname === `/${slug}/`;

  return (
    <header
      className="text-white shadow-lg"
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to={`/${slug}`} className="flex items-center gap-3">
          {store?.logo && (
            <img
              src={store.logo}
              alt={store.name}
              className="h-10 w-10 rounded-full object-cover bg-white"
            />
          )}
          <span className="text-xl sm:text-2xl font-bold">{store?.name || 'AutoMercado'}</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Scanner Button - only on home page */}
          {isHomePage && (
            <button
              onClick={openScanner}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all touch-manipulation active:scale-95"
            >
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
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              <span className="font-medium hidden sm:inline">Escanear</span>
            </button>
          )}

          {/* Cart indicator */}
          <div className={`flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl transition-all ${
            isAnimating ? 'animate-cart-bounce scale-110 bg-white/40' : ''
          }`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 transition-transform ${isAnimating ? 'animate-wiggle' : ''}`}
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
            <span className={`font-medium transition-all ${isAnimating ? 'scale-125' : ''}`}>
              {itemCount}
            </span>
            <span className="font-bold hidden sm:inline">
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
