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
} from '../services/api';
import toast from 'react-hot-toast';
import type { PaymentProvider, PaymentOptions } from '../types';

type PaymentMethod = 'online' | 'point';

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { store } = useStore();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [loading, setLoading] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('online');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('MERCADOPAGO');
  const [pointStatus, setPointStatus] = useState<string | null>(null);
  const [pointPaymentId, setPointPaymentId] = useState<string | null>(null);

  // Load payment options
  useEffect(() => {
    if (store?.id) {
      getPaymentOptions(store.id)
        .then((res) => {
          setPaymentOptions(res.data);
          setSelectedProvider(res.data.defaultProvider);
          // Default to point if available
          if (res.data.hasPoint) {
            setSelectedMethod('point');
          }
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
          toast.success('Pagamento aprovado!');
          navigate(`/${slug}/pagamento/sucesso`);
        } else if (res.data.status === 'CANCELED' || res.data.status === 'ERROR') {
          clearInterval(interval);
          toast.error('Pagamento cancelado ou com erro');
          setPointPaymentId(null);
          setPointStatus(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pointPaymentId, store?.id, clearCart, navigate, slug]);

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Seu carrinho está vazio');
      return;
    }

    setLoading(true);

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

      if (selectedMethod === 'point') {
        // Send to card machine
        const pointResponse = await createPointPayment(orderResponse.data.id, selectedProvider);

        if (pointResponse.data.success) {
          setPointPaymentId(pointResponse.data.paymentIntentId || null);
          setPointStatus('WAITING');
          toast.success('Pagamento enviado para a maquininha!');
        } else {
          toast.error(pointResponse.data.message || 'Erro ao enviar para maquininha');
          setLoading(false);
        }
      } else {
        // Online payment
        const paymentResponse = await createPaymentPreference(
          orderResponse.data.id,
          selectedProvider
        );

        // Redirect to payment page
        window.location.href = paymentResponse.data.initPoint;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erro ao processar pedido. Tente novamente.');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate(`/${slug}/carrinho`);
    return null;
  }

  const providerName = (provider: PaymentProvider) => {
    switch (provider) {
      case 'MERCADOPAGO':
        return 'Mercado Pago';
      case 'PAGBANK':
        return 'PagBank';
      default:
        return provider;
    }
  };

  // Show waiting screen when point payment is in progress
  if (pointStatus) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div
            className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent mx-auto mb-6"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          ></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Aguardando Pagamento</h2>
          <p className="text-gray-600 mb-2">
            Por favor, realize o pagamento na maquininha.
          </p>
          <p className="text-sm text-gray-500">
            Status: <span className="font-medium">{pointStatus}</span>
          </p>
          <div className="mt-8">
            <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <button
            onClick={() => {
              setPointPaymentId(null);
              setPointStatus(null);
              setLoading(false);
            }}
            className="mt-6 text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Finalizar Compra</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Resumo do Pedido</h2>

        <div className="space-y-3 mb-4">
          {items.map((item) => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.quantity}x {item.product.name}
              </span>
              <span className="font-medium">
                R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between text-xl font-bold">
            <span>Total:</span>
            <span style={{ color: 'var(--color-primary)' }}>
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Forma de Pagamento</h2>

        {/* Payment Method Selection */}
        <div className="space-y-3 mb-6">
          {paymentOptions?.hasPoint && (
            <button
              onClick={() => setSelectedMethod('point')}
              className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                selectedMethod === 'point'
                  ? 'border-current'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={selectedMethod === 'point' ? { borderColor: 'var(--color-primary)' } : {}}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor:
                    selectedMethod === 'point' ? 'var(--color-primary)' : '#e5e7eb',
                }}
              >
                <svg
                  className={`h-6 w-6 ${selectedMethod === 'point' ? 'text-white' : 'text-gray-500'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">Cartão (Maquininha)</p>
                <p className="text-sm text-gray-500">Débito ou Crédito na maquininha</p>
              </div>
            </button>
          )}

          <button
            onClick={() => setSelectedMethod('online')}
            className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
              selectedMethod === 'online'
                ? 'border-current'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={selectedMethod === 'online' ? { borderColor: 'var(--color-primary)' } : {}}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                backgroundColor:
                  selectedMethod === 'online' ? 'var(--color-primary)' : '#e5e7eb',
              }}
            >
              <svg
                className={`h-6 w-6 ${selectedMethod === 'online' ? 'text-white' : 'text-gray-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">PIX ou Cartão Online</p>
              <p className="text-sm text-gray-500">Pague pelo celular</p>
            </div>
          </button>
        </div>

        {/* Provider Selection (if multiple available) */}
        {paymentOptions &&
          ((selectedMethod === 'online' && paymentOptions.online.length > 1) ||
            (selectedMethod === 'point' && paymentOptions.point.length > 1)) && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Processador:</p>
              <div className="flex gap-3">
                {(selectedMethod === 'online'
                  ? paymentOptions.online
                  : paymentOptions.point
                ).map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setSelectedProvider(provider)}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedProvider === provider
                        ? 'border-current text-white'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                    style={
                      selectedProvider === provider
                        ? { borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-primary)' }
                        : {}
                    }
                  >
                    {providerName(provider)}
                  </button>
                ))}
              </div>
            </div>
          )}

        <p className="text-sm text-gray-500 mt-4">
          {selectedMethod === 'point'
            ? 'O pagamento será processado na maquininha do estabelecimento.'
            : 'Você será redirecionado para o checkout seguro.'}
        </p>
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full disabled:bg-gray-400 text-white font-bold py-4 rounded-lg transition-colors text-lg flex items-center justify-center gap-2 btn-primary"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Processando...
          </>
        ) : (
          <>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            {selectedMethod === 'point' ? 'Pagar na Maquininha' : 'Pagar Online'}
          </>
        )}
      </button>
    </div>
  );
}
