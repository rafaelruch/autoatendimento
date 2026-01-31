import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ProductList } from '../components/ProductList';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { IdentificationQRScreen } from '../components/IdentificationQRScreen';
import { getStoreProducts, getProductByBarcode } from '../services/api';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useScanner } from '../context/ScannerContext';
import toast from 'react-hot-toast';
import type { Product, Customer } from '../types';

// Flow: initial -> qr-code -> welcome (instructions) -> shopping
type CheckoutFlow = 'initial' | 'qr-code' | 'welcome' | 'shopping';

export function Home() {
  const { slug } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [flowState, setFlowState] = useState<CheckoutFlow>('initial');
  const [welcomeExiting, setWelcomeExiting] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [inactivityTimer, setInactivityTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const { addItem, clearCart, itemCount } = useCart();
  const { store } = useStore();
  const { showScanner, closeScanner } = useScanner();

  // Check if in shopping mode (for barcode scanner)
  const isShopping = flowState === 'shopping';

  // Barcode scanner input buffer (for USB barcode readers)
  const barcodeBufferRef = useRef<string>('');
  const barcodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Process barcode from USB reader
  const processBarcode = useCallback(async (barcode: string) => {
    if (!store || isProcessingRef.current || !barcode.trim()) return;

    isProcessingRef.current = true;

    try {
      const response = await getProductByBarcode(barcode.trim(), store.id);
      addItem(response.data);
      toast.success(`${response.data.name} adicionado ao carrinho`);
    } catch {
      toast.error(`Produto não encontrado: ${barcode}`);
    } finally {
      isProcessingRef.current = false;
    }
  }, [store, addItem]);

  // Listen for keyboard input from USB barcode scanner
  useEffect(() => {
    if (!isShopping || !store) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Enter key - process the barcode
      if (e.key === 'Enter' && barcodeBufferRef.current.length > 0) {
        e.preventDefault();
        const barcode = barcodeBufferRef.current;
        barcodeBufferRef.current = '';
        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
          barcodeTimeoutRef.current = null;
        }
        processBarcode(barcode);
        return;
      }

      // Only accept alphanumeric characters for barcode
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        barcodeBufferRef.current += e.key;

        // Clear previous timeout
        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
        }

        // Set timeout to clear buffer if no more input (manual typing detection)
        // USB scanners type very fast (< 50ms between chars), humans are slower
        barcodeTimeoutRef.current = setTimeout(() => {
          // If buffer has content but took too long, it might be manual typing
          // Only process if it looks like a barcode (at least 4 chars)
          if (barcodeBufferRef.current.length >= 4) {
            const barcode = barcodeBufferRef.current;
            barcodeBufferRef.current = '';
            processBarcode(barcode);
          } else {
            barcodeBufferRef.current = '';
          }
          barcodeTimeoutRef.current = null;
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, [isShopping, store, processBarcode]);

  // Check if session exists on mount
  useEffect(() => {
    const savedCustomer = sessionStorage.getItem(`customer_${slug}`);
    if (savedCustomer) {
      try {
        setCurrentCustomer(JSON.parse(savedCustomer));
        setFlowState('shopping');
      } catch {
        setFlowState('initial');
      }
    } else {
      setFlowState('initial');
    }
    setWelcomeExiting(false);
  }, [slug]);

  // Inactivity timeout - reset to initial after 120s of no items
  useEffect(() => {
    // Clear any existing timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    if (flowState === 'shopping' && itemCount === 0) {
      const timer = setTimeout(() => {
        // Reset everything
        sessionStorage.removeItem(`customer_${slug}`);
        setCurrentCustomer(null);
        setFlowState('initial');
        clearCart();
      }, 120000); // 120 seconds

      setInactivityTimer(timer);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowState, itemCount, slug]);

  // Go to QR code screen for identification
  const handleIdentify = () => {
    setFlowState('qr-code');
  };

  // Customer was identified (from QR polling)
  const handleCustomerIdentified = (customer: Customer) => {
    setCurrentCustomer(customer);
    sessionStorage.setItem(`customer_${slug}`, JSON.stringify(customer));
    setFlowState('welcome'); // Show instructions
    toast.success(`Bem-vindo, ${customer.name.split(' ')[0]}!`);
  };

  // Cancel identification and go back
  const handleCancelIdentification = () => {
    setFlowState('initial');
  };

  // Start shopping after seeing instructions
  const handleStartShopping = () => {
    setWelcomeExiting(true);
    setTimeout(() => {
      setFlowState('shopping');
      setWelcomeExiting(false);
    }, 500);
  };

  // Check scroll position for horizontal slider
  const checkScroll = () => {
    const el = categoriesRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    }
  };

  // Scroll categories horizontally
  const scrollCategories = (direction: 'left' | 'right') => {
    const el = categoriesRef.current;
    if (el) {
      const scrollAmount = 200;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
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

  // Initial Screen - "Já é cadastrado?"
  if (flowState === 'initial') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md mx-auto px-6 py-8 text-center">
          {/* Store Logo */}
          {store?.logo && (
            <img
              src={store.logo}
              alt={store.name}
              className="h-20 w-20 rounded-full mx-auto mb-4 bg-white object-cover shadow-lg"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{store?.name}</h1>
          <p className="text-lg text-gray-600 mb-12">Auto-atendimento</p>

          {/* Question */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Identificacao</h2>
            <p className="text-gray-600 mb-6">
              Escaneie o QR Code com seu celular para se identificar ou fazer seu cadastro
            </p>
            <button
              onClick={handleIdentify}
              className="w-full py-5 rounded-xl text-white text-xl font-bold shadow-lg transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Comecar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // QR Code Screen for identification
  if (flowState === 'qr-code') {
    return (
      <IdentificationQRScreen
        onCustomerIdentified={handleCustomerIdentified}
        onCancel={handleCancelIdentification}
      />
    );
  }

  // Welcome/Instructions Screen (after identification)
  if (flowState === 'welcome') {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto transition-transform duration-500 ease-in-out ${
          welcomeExiting ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 text-center flex flex-col min-h-full justify-center">
          {/* Customer greeting */}
          <div className="mb-4 sm:mb-8 flex-shrink-0">
            {currentCustomer?.photo ? (
              <img
                src={currentCustomer.photo}
                alt={currentCustomer.name}
                className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 rounded-full object-cover shadow-lg border-4 border-white"
              />
            ) : (
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {currentCustomer?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
              Ola, {currentCustomer?.name?.split(' ')[0]}!
            </h1>
            <p className="text-base sm:text-lg text-gray-600">Veja como funciona</p>
          </div>

          {/* Steps */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-8 flex-shrink-0">
            {/* Step 1 */}
            <div className="flex items-center gap-3 sm:gap-4 bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white text-lg sm:text-xl font-bold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                1
              </div>
              <div className="text-left flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 leading-tight">Passe o codigo de barras dos produtos</h3>
                <p className="text-xs sm:text-sm text-gray-500">Use o leitor ou clique em "Escanear Codigo"</p>
              </div>
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 sm:gap-4 bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white text-lg sm:text-xl font-bold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                2
              </div>
              <div className="text-left flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 leading-tight">Toque em VER CARRINHO</h3>
                <p className="text-xs sm:text-sm text-gray-500">Confira os itens e as quantidades</p>
              </div>
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 sm:gap-4 bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white text-lg sm:text-xl font-bold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                3
              </div>
              <div className="text-left flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 leading-tight">Finalize escolhendo como quer pagar</h3>
                <p className="text-xs sm:text-sm text-gray-500">PIX, Cartao de Credito ou Debito</p>
              </div>
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartShopping}
            className="w-full py-4 sm:py-5 px-6 rounded-xl sm:rounded-2xl text-white text-lg sm:text-xl font-bold shadow-xl transform transition-all hover:scale-[1.02] active:scale-95 flex-shrink-0 flex items-center justify-center gap-3"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {/* Touch/Tap Icon */}
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            Toque para comecar
          </button>

                  </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Customer greeting */}
      {currentCustomer && (
        <div
          className="flex items-center gap-3 px-4 py-2 text-white"
          style={{ backgroundColor: 'var(--color-primary-dark)' }}
        >
          {currentCustomer.photo ? (
            <img
              src={currentCustomer.photo}
              alt={currentCustomer.name}
              className="w-8 h-8 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-sm font-bold">
                {currentCustomer.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-sm">
            Ola, <strong>{currentCustomer.name.split(' ')[0]}</strong>!
          </span>
        </div>
      )}

      {/* Horizontal Category Slider */}
      <div className="bg-white shadow-md flex-shrink-0">
        <div className="flex items-center gap-2 px-2 py-3">
          {/* Scroll Left Button */}
          <button
            onClick={() => scrollCategories('left')}
            disabled={!canScrollLeft}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all touch-manipulation active:scale-90 ${
              canScrollLeft
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Categories Horizontal Scroll */}
          <div
            ref={categoriesRef}
            onScroll={checkScroll}
            className="flex-1 overflow-x-auto flex gap-2 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* All products button */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-5 py-3 rounded-xl font-medium transition-all touch-manipulation active:scale-95 ${
                selectedCategory === null
                  ? 'text-white shadow-lg'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
              style={
                selectedCategory === null
                  ? { backgroundColor: 'var(--color-primary)' }
                  : undefined
              }
            >
              <div className="flex items-center gap-2 whitespace-nowrap">
                <svg
                  className="h-5 w-5"
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
                <span className="text-base">Todos ({products.length})</span>
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
                  className={`flex-shrink-0 px-5 py-3 rounded-xl font-medium transition-all touch-manipulation active:scale-95 ${
                    isSelected
                      ? 'text-white shadow-lg'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: 'var(--color-primary)' }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <CategoryIcon category={category} />
                    <span className="text-base">{category} ({count})</span>
                  </div>
                </button>
              );
            })}

          </div>

          {/* Scroll Right Button */}
          <button
            onClick={() => scrollCategories('right')}
            disabled={!canScrollRight}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all touch-manipulation active:scale-90 ${
              canScrollRight
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Products Area - Full Width */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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

      {showScanner && <BarcodeScanner onClose={closeScanner} />}
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
