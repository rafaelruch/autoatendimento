import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { createIdentificationSession, checkIdentificationSession } from '../services/api';
import type { Customer } from '../types';

interface IdentificationQRScreenProps {
  onCustomerIdentified: (customer: Customer) => void;
  onCancel: () => void;
}

export function IdentificationQRScreen({
  onCustomerIdentified,
  onCancel,
}: IdentificationQRScreenProps) {
  const { store } = useStore();
  const [countdown, setCountdown] = useState(120);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(true);

  // Create a session when component mounts
  useEffect(() => {
    if (!store?.id) return;

    const createSession = async () => {
      try {
        const response = await createIdentificationSession(store.id);
        setSessionToken(response.data.token);
      } catch (error) {
        console.error('Error creating identification session:', error);
      } finally {
        setIsCreatingSession(false);
      }
    };

    createSession();
  }, [store?.id]);

  // Generate identification URL with token
  const identificationUrl = sessionToken
    ? `${window.location.origin}/${store?.slug}/identificar?token=${sessionToken}`
    : '';

  // Generate QR code using a simple API
  const qrCodeUrl = identificationUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(identificationUrl)}`
    : '';

  // Check if session was claimed via API polling
  const checkForIdentification = useCallback(async () => {
    if (!sessionToken) return;

    try {
      const response = await checkIdentificationSession(sessionToken);

      if (response.data.claimed && response.data.customer) {
        onCustomerIdentified(response.data.customer);
      }
    } catch {
      // Session not found or expired, ignore
    }
  }, [sessionToken, onCustomerIdentified]);

  // Poll for identification every 2 seconds
  useEffect(() => {
    if (!sessionToken) return;

    const interval = setInterval(() => {
      checkForIdentification();
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionToken, checkForIdentification]);

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
          <h1 className="text-2xl font-bold">Identificacao</h1>
          <p className="text-white/80 mt-1">
            Escaneie o QR Code com seu celular
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-gray-100">
              {isCreatingSession ? (
                <div className="w-64 h-64 flex items-center justify-center">
                  <div
                    className="animate-spin rounded-full h-12 w-12 border-b-2"
                    style={{ borderColor: 'var(--color-primary)' }}
                  ></div>
                </div>
              ) : qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code para identificacao"
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-gray-400">
                  Erro ao gerar QR Code
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center mb-6 space-y-4">
            <div className="flex items-center gap-3 text-left bg-gray-50 rounded-xl p-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                1
              </div>
              <p className="text-gray-700">Aponte a camera do celular para o QR Code</p>
            </div>
            <div className="flex items-center gap-3 text-left bg-gray-50 rounded-xl p-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                2
              </div>
              <p className="text-gray-700">Digite seu telefone para se identificar</p>
            </div>
            <div className="flex items-center gap-3 text-left bg-gray-50 rounded-xl p-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                3
              </div>
              <p className="text-gray-700">Se nao tiver cadastro, faca agora mesmo!</p>
            </div>
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
