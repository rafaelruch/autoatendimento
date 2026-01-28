import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ProductList } from '../components/ProductList';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { getStoreProducts } from '../services/api';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';

export function Home() {
  const { slug } = useParams<{ slug: string }>();
  const { store } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Check scroll position
  const checkScroll = () => {
    const el = categoriesRef.current;
    if (el) {
      setCanScrollUp(el.scrollTop > 0);
      setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight - 1);
    }
  };

  // Scroll categories
  const scrollCategories = (direction: 'up' | 'down') => {
    const el = categoriesRef.current;
    if (el) {
      const scrollAmount = 150;
      el.scrollBy({
        top: direction === 'up' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (!slug) return;

    const fetchProducts = async () => {
      try {
        const response = await getStoreProducts(slug);
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [slug]);

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = products
      .map((p) => p.category)
      .filter((c): c is string => !!c);
    return [...new Set(cats)].sort();
  }, [products]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  // Check scroll when categories change or window resizes
  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--color-primary)' }}
        ></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Categories Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white shadow-lg flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Categorias
          </h2>
        </div>

        {/* Scroll Up Button */}
        <button
          onClick={() => scrollCategories('up')}
          disabled={!canScrollUp}
          className={`flex-shrink-0 w-full py-3 flex items-center justify-center border-b transition-all touch-manipulation ${
            canScrollUp
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Categories List */}
        <div
          ref={categoriesRef}
          onScroll={checkScroll}
          className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide"
        >
          {/* All products button */}
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full text-left px-4 py-4 rounded-xl font-medium transition-all touch-manipulation ${
              selectedCategory === null
                ? 'text-white shadow-lg scale-[1.02]'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95'
            }`}
            style={
              selectedCategory === null
                ? { backgroundColor: 'var(--color-primary)' }
                : undefined
            }
          >
            <div className="flex items-center gap-3">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <div>
                <span className="block text-base">Todos</span>
                <span className="text-xs opacity-75">{products.length} itens</span>
              </div>
            </div>
          </button>

          {/* Category buttons */}
          {categories.map((category) => {
            const count = products.filter((p) => p.category === category).length;
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`w-full text-left px-4 py-4 rounded-xl font-medium transition-all touch-manipulation ${
                  isSelected
                    ? 'text-white shadow-lg scale-[1.02]'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95'
                }`}
                style={
                  isSelected
                    ? { backgroundColor: 'var(--color-primary)' }
                    : undefined
                }
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon category={category} />
                  <div>
                    <span className="block text-base">{category}</span>
                    <span className="text-xs opacity-75">{count} itens</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Scroll Down Button */}
        <button
          onClick={() => scrollCategories('down')}
          disabled={!canScrollDown}
          className={`flex-shrink-0 w-full py-3 flex items-center justify-center border-t transition-all touch-manipulation ${
            canScrollDown
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Barcode Scanner Button */}
        <div className="p-3 border-t flex-shrink-0">
          <button
            onClick={() => setShowScanner(true)}
            className="w-full flex items-center justify-center gap-2 text-white px-4 py-4 rounded-xl transition-colors touch-manipulation btn-primary active:scale-95"
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
            <span className="font-medium">Escanear Código</span>
          </button>
        </div>
      </aside>

      {/* Products Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            {selectedCategory || 'Todos os Produtos'}
          </h1>
          <p className="text-gray-500">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'}
          </p>
        </div>

        <ProductList products={filteredProducts} />
      </main>

      {showScanner && <BarcodeScanner onClose={() => setShowScanner(false)} />}
    </div>
  );
}

// Category icon component
function CategoryIcon({ category }: { category: string }) {
  const iconClass = 'h-5 w-5';

  switch (category.toLowerCase()) {
    case 'bebidas':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'lanches':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'doces':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case 'mercearia':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      );
  }
}
