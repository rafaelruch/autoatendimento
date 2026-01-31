import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

type PaymentStatus = 'success' | 'failure' | 'pending';

export function PaymentSuccess() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();

  // Determine status from path
  const getStatus = (): PaymentStatus => {
    if (location.pathname.includes('falha')) return 'failure';
    if (location.pathname.includes('pendente')) return 'pending';
    return 'success';
  };

  const status = getStatus();

  useEffect(() => {
    // Only clear cart and reset welcome for successful payments
    if (status === 'success') {
      clearCart();
      sessionStorage.removeItem(`welcome_dismissed_${slug}`);
    }

    // Auto redirect to home after 5 seconds
    const timer = setTimeout(() => {
      navigate(`/${slug}`);
    }, 5000);

    return () => clearTimeout(timer);
  }, [slug, clearCart, navigate, status]);

  const handleNewPurchase = () => {
    navigate(`/${slug}`);
  };

  const handleRetryPayment = () => {
    navigate(`/${slug}/checkout`);
  };

  const statusConfig = {
    success: {
      icon: (
        <svg className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      bgColor: 'bg-green-100',
      title: 'Pagamento Aprovado!',
      message: 'Obrigado pela sua compra. Seu pedido foi confirmado.',
      buttonText: 'Fazer nova compra',
      buttonAction: handleNewPurchase,
    },
    failure: {
      icon: (
        <svg className="w-10 h-10 sm:w-12 sm:h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      bgColor: 'bg-red-100',
      title: 'Pagamento Recusado',
      message: 'Houve um problema com seu pagamento. Tente novamente.',
      buttonText: 'Tentar novamente',
      buttonAction: handleRetryPayment,
    },
    pending: {
      icon: (
        <svg className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-yellow-100',
      title: 'Pagamento Pendente',
      message: 'Seu pagamento esta sendo processado. Aguarde a confirmacao.',
      buttonText: 'Voltar ao inicio',
      buttonAction: handleNewPurchase,
    },
  };

  const config = statusConfig[status];

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto w-full">
        {/* Status Icon */}
        <div className={`w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6 sm:mb-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
          {config.icon}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
          {config.title}
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-10">
          {config.message}
        </p>

        <button
          onClick={config.buttonAction}
          className="w-full py-4 sm:py-5 px-6 rounded-xl sm:rounded-2xl text-white text-lg sm:text-xl font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-95"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {config.buttonText}
        </button>

        <p className="text-sm text-gray-400 mt-6">
          Redirecionando automaticamente...
        </p>
      </div>
    </div>
  );
}
