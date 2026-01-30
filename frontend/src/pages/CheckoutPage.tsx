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

      // PIX always uses online payment
      if (method === 'PIX') {
        const paymentResponse = await createPaymentPreference(
          orderResponse.data.id,
          undefined,
          'PIX'
        );
        window.location.href = paymentResponse.data.initPoint;
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
              setLoadingMethod(null);
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

      {/* Order Summary */}
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

      {/* Payment Methods - Large Buttons in 3 Columns */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-6 text-center">Escolha a forma de pagamento</h2>

        <div className="grid grid-cols-3 gap-4">
          {/* PIX Button */}
          <button
            onClick={() => handlePayment('PIX')}
            disabled={loading}
            className="p-6 rounded-xl border-2 border-gray-200 hover:border-green-500 transition-all flex flex-col items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group hover:bg-green-50 min-h-[180px]"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
              {loadingMethod === 'PIX' ? (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
              ) : (
                <svg className="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 12l10 10 10-10L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 6v12M6 12h12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">PIX</p>
              <p className="text-xs text-gray-500 mt-1">Instantaneo</p>
            </div>
          </button>

          {/* Debit Card Button */}
          <button
            onClick={() => handlePayment('DEBIT_CARD')}
            disabled={loading}
            className="p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group hover:bg-blue-50 min-h-[180px]"
          >
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              {loadingMethod === 'DEBIT_CARD' ? (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              ) : (
                <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">Debito</p>
              <p className="text-xs text-gray-500 mt-1">
                {paymentOptions?.hasPoint ? 'Maquininha' : 'Online'}
              </p>
            </div>
          </button>

          {/* Credit Card Button */}
          <button
            onClick={() => handlePayment('CREDIT_CARD')}
            disabled={loading}
            className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 transition-all flex flex-col items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group hover:bg-purple-50 min-h-[180px]"
          >
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              {loadingMethod === 'CREDIT_CARD' ? (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
              ) : (
                <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">Credito</p>
              <p className="text-xs text-gray-500 mt-1">
                {paymentOptions?.hasPoint ? 'Maquininha' : 'Online'}
              </p>
            </div>
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 mt-6">
          Pagamento 100% seguro
        </p>
      </div>
    </div>
  );
}
