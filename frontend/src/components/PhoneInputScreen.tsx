import { useState, useRef, useEffect } from 'react';
import type { Customer } from '../types';
import { getCustomerByPhone } from '../services/api';
import { useStore } from '../context/StoreContext';

interface PhoneInputScreenProps {
  onCustomerFound: (customer: Customer) => void;
  onNewCustomer: (phone: string) => void;
  onCancel: () => void;
}

export function PhoneInputScreen({
  onCustomerFound,
  onNewCustomer,
  onCancel,
}: PhoneInputScreenProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { store } = useStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(digits);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phone.length < 10) {
      setError('Digite um telefone valido com DDD');
      return;
    }

    if (!store?.id) {
      setError('Loja nao identificada');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getCustomerByPhone(phone, store.id);
      onCustomerFound(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) {
        onNewCustomer(phone);
      } else if (error.response?.status === 403) {
        setError('Cadastro inativo. Procure um atendente.');
      } else {
        setError('Erro ao buscar cadastro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNumberClick = (num: string) => {
    if (phone.length < 11) {
      setPhone((prev) => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPhone((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPhone('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
      {/* Header */}
      <div
        className="text-white py-6 px-4"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <div className="container mx-auto text-center">
          <h1 className="text-2xl font-bold">Identificacao do Cliente</h1>
          <p className="text-white/80 mt-1">
            Digite seu telefone para continuar
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          {/* Phone display */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
              <label className="block text-gray-500 text-sm mb-2">
                Telefone com DDD
              </label>
              <input
                ref={inputRef}
                type="tel"
                value={formatPhoneDisplay(phone)}
                onChange={handlePhoneChange}
                className="w-full text-center text-4xl font-bold text-gray-800 bg-transparent border-none focus:outline-none"
                placeholder="(00) 00000-0000"
                readOnly
              />
            </div>
            {error && (
              <p className="mt-3 text-center text-red-600 font-medium">
                {error}
              </p>
            )}
          </div>

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberClick(num)}
                className="bg-white rounded-xl shadow py-5 text-3xl font-bold text-gray-800 hover:bg-gray-50 active:scale-95 transition-all touch-manipulation"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="bg-gray-200 rounded-xl shadow py-5 text-xl font-bold text-gray-600 hover:bg-gray-300 active:scale-95 transition-all touch-manipulation"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => handleNumberClick('0')}
              className="bg-white rounded-xl shadow py-5 text-3xl font-bold text-gray-800 hover:bg-gray-50 active:scale-95 transition-all touch-manipulation"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="bg-gray-200 rounded-xl shadow py-5 text-xl font-bold text-gray-600 hover:bg-gray-300 active:scale-95 transition-all touch-manipulation flex items-center justify-center"
            >
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                />
              </svg>
            </button>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={phone.length < 10 || loading}
            className="w-full py-5 rounded-xl text-white font-bold text-xl disabled:bg-gray-300 disabled:cursor-not-allowed transition-all touch-manipulation active:scale-[0.98]"
            style={{
              backgroundColor:
                phone.length >= 10 && !loading ? 'var(--color-primary)' : undefined,
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Buscando...
              </span>
            ) : (
              'Continuar'
            )}
          </button>
        </form>
      </div>

      {/* Cancel button */}
      <div className="p-4 pb-8">
        <button
          onClick={onCancel}
          className="w-full py-4 rounded-xl text-gray-600 font-medium text-lg bg-gray-200 hover:bg-gray-300 transition-all touch-manipulation active:scale-[0.98]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
