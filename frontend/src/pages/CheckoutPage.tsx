import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import {
  createOrder,
  createPaymentPreference,
  createPointPayment,
  getPaymentOptions,
  getPointPaymentStatus,
  getPaymentStatus,
} from '../services/api';
import toast from 'react-hot-toast';
import type { PaymentOptions, PaymentMethodType } from '../types';

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { store } = useStore();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<PaymentMethodType | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const [pointStatus, setPointStatus] = useState<string | null>(null);
  const [pointPaymentId, setPointPaymentId] = useState<string | null>(null);
  // PIX QR Code state
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; paymentId: string } | null>(null);

  // Load payment options
  useEffect(() => {
    if (store?.id) {
      getPaymentOptions(store.id)
        .then((res) => {
          setPaymentOptions(res.data);
        })
        .catch((err) => {
          console.error('Error loading payment options:', err);
        });
    }
  }, [store?.id]);

  // Poll for point payment status
  useEffect(() => {
    if (!pointPaymentId || !store?.id) return;

    const interval = setInterval(async () => {
      try {
        const res = await getPointPaymentStatus(pointPaymentId, store.id);
        setPointStatus(res.data.status);

        if (res.data.status === 'FINISHED' || res.data.status === 'PAID') {
          clearInterval(interval);
          clearCart();
          // Reset welcome screen for next customer
          sessionStorage.removeItem(`welcome_dismissed_${slug}`);
          toast.success('Pagamento aprovado!');
          navigate(`/${slug}/pagamento/sucesso`);
        } else if (res.data.status === 'CANCELED' || res.data.status === 'ERROR') {
          clearInterval(interval);
          toast.error('Pagamento cancelado ou com erro');
          setPointPaymentId(null);
          setPointStatus(null);
          setLoading(false);
          setLoadingMethod(null);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pointPaymentId, store?.id, clearCart, navigate, slug]);

  // Poll for PIX payment status
  useEffect(() => {
    if (!pixData?.paymentId) return;

    const interval = setInterval(async () => {
      try {
        const res = await getPaymentStatus(pixData.paymentId);

        if (res.data.status === 'PAID') {
          clearInterval(interval);
          clearCart();
          // Reset welcome screen for next customer
          sessionStorage.removeItem(`welcome_dismissed_${slug}`);
          toast.success('Pagamento PIX aprovado!');
          navigate(`/${slug}/pagamento/sucesso`);
        } else if (res.data.status === 'CANCELLED' || res.data.status === 'REFUNDED') {
          clearInterval(interval);
          toast.error('Pagamento cancelado');
          setPixData(null);
          setLoading(false);
          setLoadingMethod(null);
        }
      } catch (error) {
        console.error('Error checking PIX status:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pixData?.paymentId, clearCart, navigate, slug]);

  const handlePayment = async (method: PaymentMethodType) => {
    if (items.length === 0) {
      toast.error('Seu carrinho está vazio');
      return;
    }

    setLoading(true);
    setLoadingMethod(method);

    try {
      if (!store) {
        toast.error('Erro: loja não encontrada');
        return;
      }

      // Create order
      const orderResponse = await createOrder(
        items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        store.id
      );

      // PIX - show QR code directly (no redirect)
      if (method === 'PIX') {
        const paymentResponse = await createPaymentPreference(
          orderResponse.data.id,
          undefined,
          'PIX'
        );

        // If we got a QR code, show it instead of redirecting
        if (paymentResponse.data.qrCode && paymentResponse.data.qrCodeBase64) {
          setPixData({
            qrCode: paymentResponse.data.qrCode,
            qrCodeBase64: paymentResponse.data.qrCodeBase64,
            paymentId: paymentResponse.data.preferenceId,
          });
          toast.success('QR Code PIX gerado!');
          return;
        }

        // Fallback to redirect if no QR code
        if (paymentResponse.data.initPoint) {
          window.location.href = paymentResponse.data.initPoint;
        }
        return;
      }

      // For debit/credit: use Point (maquininha) if available, otherwise online
      const usePoint = paymentOptions?.hasPoint;

      if (usePoint) {
        // Send to card machine
        const pointResponse = await createPointPayment(orderResponse.data.id);

        if (pointResponse.data.success) {
          setPointPaymentId(pointResponse.data.paymentIntentId || null);
          setPointStatus('WAITING');
          toast.success('Pagamento enviado para a maquininha!');
        } else {
          toast.error(pointResponse.data.message || 'Erro ao enviar para maquininha');
          setLoading(false);
          setLoadingMethod(null);
        }
      } else {
        // Online payment with specific card type
        const paymentResponse = await createPaymentPreference(
          orderResponse.data.id,
          undefined,
          method
        );
        window.location.href = paymentResponse.data.initPoint;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erro ao processar pedido. Tente novamente.');
      setLoading(false);
      setLoadingMethod(null);
    }
  };

  if (items.length === 0) {
    navigate(`/${slug}/carrinho`);
    return null;
  }

  // Show waiting screen when point payment is in progress
  if (pointStatus) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center w-full max-w-lg">
          <div
            className="animate-spin rounded-full h-20 w-20 sm:h-24 sm:w-24 border-4 border-t-transparent mx-auto mb-8"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          ></div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Aguardando Pagamento</h2>
          <p className="text-lg text-gray-600 mb-2">
            Por favor, realize o pagamento na maquininha.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Status: <span className="font-medium">{pointStatus}</span>
          </p>
          <div className="py-6 px-8 rounded-xl mb-8" style={{ backgroundColor: 'var(--color-primary)', opacity: 0.1 }}>
            <p className="text-4xl sm:text-5xl font-bold" style={{ color: 'var(--color-primary)' }}>
              R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <button
            onClick={() => {
              setPointPaymentId(null);
              setPointStatus(null);
              setLoading(false);
              setLoadingMethod(null);
            }}
            className="text-gray-500 hover:text-gray-700 text-base py-3 px-6"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Show PIX QR Code screen
  if (pixData) {
    const copyPixCode = () => {
      navigator.clipboard.writeText(pixData.qrCode);
      toast.success('Codigo PIX copiado!');
    };

    return (
      <div className="h-full flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center w-full max-w-lg my-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 12l10 10 10-10L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 6v12M6 12h12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Pague com PIX</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Escaneie o QR Code ou copie o codigo
          </p>

          {/* QR Code */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border-2 border-gray-200 inline-block mb-4">
            <img
              src={`data:image/png;base64,${pixData.qrCodeBase64}`}
              alt="QR Code PIX"
              className="w-48 h-48 sm:w-56 sm:h-56"
            />
          </div>

          {/* Total */}
          <div className="mb-4">
            <p className="text-sm text-gray-500">Valor a pagar:</p>
            <p className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>

          {/* Copy button */}
          <button
            onClick={copyPixCode}
            className="w-full py-3 sm:py-4 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors mb-4 flex items-center justify-center gap-2 text-base sm:text-lg"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copiar codigo PIX
          </button>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
            <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">Aguardando pagamento...</span>
          </div>

          {/* Cancel button */}
          <button
            onClick={() => {
              setPixData(null);
              setLoading(false);
              setLoadingMethod(null);
            }}
            className="text-gray-500 hover:text-gray-700 text-sm py-2"
          >
            Cancelar e escolher outro metodo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center w-full">
        {/* Total */}
        <div className="text-center mb-6">
          <p className="text-lg text-gray-600 mb-2">Total a pagar:</p>
          <p className="text-4xl sm:text-5xl font-bold" style={{ color: 'var(--color-primary)' }}>
            R$ {total.toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* Payment Methods - Large Buttons in 3 Columns */}
        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">Escolha a forma de pagamento</h2>

          <div className="grid grid-cols-3 gap-4 sm:gap-8">
            {/* PIX Button */}
            <button
              onClick={() => handlePayment('PIX')}
              disabled={loading}
              className="p-6 sm:p-10 rounded-2xl border-3 border-gray-200 hover:border-green-500 transition-all flex flex-col items-center justify-center gap-4 sm:gap-6 disabled:opacity-50 disabled:cursor-not-allowed group hover:bg-green-50 min-h-[180px] sm:min-h-[280px]"
            >
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                {loadingMethod === 'PIX' ? (
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-green-600"></div>
                ) : (
                  <svg className="w-10 h-10 sm:w-14 sm:h-14 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 12l10 10 10-10L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 6v12M6 12h12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-3xl font-bold text-gray-800">PIX</p>
                <p className="text-sm sm:text-base text-gray-500 mt-1">Instantaneo</p>
              </div>
            </button>

            {/* Debit Card Button */}
            <button
              onClick={() => handlePayment('DEBIT_CARD')}
              disabled={loading}
              className="p-6 sm:p-10 rounded-2xl border-3 border-gray-200 hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-4 sm:gap-6 disabled:opacity-50 disabled:cursor-not-allowed group hover:bg-blue-50 min-h-[180px] sm:min-h-[280px]"
            >
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                {loadingMethod === 'DEBIT_CARD' ? (
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-blue-600"></div>
                ) : (
                  <svg className="w-10 h-10 sm:w-14 sm:h-14 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                )}
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-3xl font-bold text-gray-800">Debito</p>
                <p className="text-sm sm:text-base text-gray-500 mt-1">
                  {paymentOptions?.hasPoint ? 'Maquininha' : 'Online'}
                </p>
              </div>
            </button>

            {/* Credit Card Button */}
            <button
              onClick={() => handlePayment('CREDIT_CARD')}
              disabled={loading}
              className="p-6 sm:p-10 rounded-2xl border-3 border-gray-200 hover:border-purple-500 transition-all flex flex-col items-center justify-center gap-4 sm:gap-6 disabled:opacity-50 disabled:cursor-not-allowed group hover:bg-purple-50 min-h-[180px] sm:min-h-[280px]"
            >
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                {loadingMethod === 'CREDIT_CARD' ? (
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-14 sm:w-14 border-b-2 border-purple-600"></div>
                ) : (
                  <svg className="w-10 h-10 sm:w-14 sm:h-14 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                )}
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-3xl font-bold text-gray-800">Credito</p>
                <p className="text-sm sm:text-base text-gray-500 mt-1">
                  {paymentOptions?.hasPoint ? 'Maquininha' : 'Online'}
                </p>
              </div>
            </button>
          </div>

          <p className="text-base text-center text-gray-400 mt-6 sm:mt-8">
            Pagamento 100% seguro
          </p>
        </div>
      </div>
    </div>
  );
}
