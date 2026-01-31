import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { getCustomerByPhone } from '../services/api';
import type { Customer } from '../types';

interface QRCodeScreenProps {
  phone: string;
  onRegistered: (customer: Customer) => void;
  onCancel: () => void;
}

export function QRCodeScreen({
  phone,
  onRegistered,
  onCancel,
}: QRCodeScreenProps) {
  const { store } = useStore();
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(120);

  // Generate registration URL
  const registrationUrl = `${window.location.origin}/${store?.slug}/cadastro?phone=${phone}`;

  // Generate QR code using a simple API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(registrationUrl)}`;

  // Format phone for display
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Check if customer has registered
  const checkRegistration = useCallback(async () => {
    if (!store?.id || checking) return;

    setChecking(true);
    try {
      const response = await getCustomerByPhone(phone, store.id);
      onRegistered(response.data);
    } catch {
      // Customer not found yet, keep waiting
    } finally {
      setChecking(false);
    }
  }, [store?.id, phone, checking, onRegistered]);

  // Poll for registration every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkRegistration();
    }, 3000);

    return () => clearInterval(interval);
  }, [checkRegistration]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onCancel]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
      {/* Header */}
      <div
        className="text-white py-6 px-4"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <div className="container mx-auto text-center">
          <h1 className="text-2xl font-bold">Cadastre-se</h1>
          <p className="text-white/80 mt-1">
            Escaneie o QR Code com seu celular
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          {/* Phone display */}
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm">Telefone informado:</p>
            <p className="text-2xl font-bold text-gray-800">
              {formatPhone(phone)}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-gray-100">
              <img
                src={qrCodeUrl}
                alt="QR Code para cadastro"
                className="w-64 h-64"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center mb-6">
            <p className="text-gray-600">
              Aponte a camera do seu celular para o QR Code acima e preencha o
              cadastro.
            </p>
          </div>

          {/* Timer */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
              <svg
                className="h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                className={`font-medium ${countdown <= 30 ? 'text-red-600' : 'text-gray-600'}`}
              >
                {formatTime(countdown)}
              </span>
            </div>
          </div>

          {/* Checking indicator */}
          {checking && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg
                className="animate-spin h-4 w-4"
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
              Verificando cadastro...
            </div>
          )}
        </div>
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
