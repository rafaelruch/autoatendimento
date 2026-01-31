import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { getCustomerByPhone } from '../services/api';
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
  const [lastCheckedPhone, setLastCheckedPhone] = useState<string | null>(null);

  // Generate identification URL
  const identificationUrl = `${window.location.origin}/${store?.slug}/identificar`;

  // Generate QR code using a simple API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(identificationUrl)}`;

  // Check if customer was identified via localStorage (set by mobile page)
  const checkForIdentification = useCallback(async () => {
    const pendingPhone = localStorage.getItem(`pending_identification_${store?.id}`);

    if (pendingPhone && pendingPhone !== lastCheckedPhone && store?.id) {
      setLastCheckedPhone(pendingPhone);

      try {
        const response = await getCustomerByPhone(pendingPhone, store.id);
        // Clear the pending identification
        localStorage.removeItem(`pending_identification_${store.id}`);
        onCustomerIdentified(response.data);
      } catch {
        // Customer not found yet, keep waiting
      }
    }
  }, [store?.id, lastCheckedPhone, onCustomerIdentified]);

  // Poll for identification every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkForIdentification();
    }, 2000);

    return () => clearInterval(interval);
  }, [checkForIdentification]);

  // Also listen for storage events (cross-tab communication)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `pending_identification_${store?.id}` && e.newValue) {
        checkForIdentification();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [store?.id, checkForIdentification]);

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
              <img
                src={qrCodeUrl}
                alt="QR Code para identificacao"
                className="w-64 h-64"
              />
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
