import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { getCustomerByPhone, registerCustomer, uploadPublicCustomerPhoto, claimIdentificationSession } from '../services/api';
import type { Customer } from '../types';

type IdentificationStep = 'phone' | 'register' | 'success';

export function CustomerIdentification() {
  const { store, loading: storeLoading, error: storeError } = useStore();
  const [searchParams] = useSearchParams();
  const sessionToken = searchParams.get('token');

  const [step, setStep] = useState<IdentificationStep>('phone');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifiedCustomer, setIdentifiedCustomer] = useState<Customer | null>(null);

  // Registration form
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format phone for display
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Format CPF for display
  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(digits);
    setError(null);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setFormData({ ...formData, cpf: digits });
    setError(null);
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Nao foi possivel acessar a camera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(dataUrl);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
              setPhotoFile(file);
            }
          },
          'image/jpeg',
          0.8
        );
      }
      stopCamera();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoFile(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Check phone
  const handleCheckPhone = async (e: React.FormEvent) => {
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
      // Customer found! Claim the session to notify the totem
      if (sessionToken) {
        await claimIdentificationSession(sessionToken, response.data.id);
      }
      setIdentifiedCustomer(response.data);
      setStep('success');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 404) {
        // Customer not found, go to registration
        setStep('register');
      } else if (error.response?.status === 403) {
        setError('Cadastro inativo. Procure um atendente.');
      } else {
        setError('Erro ao buscar cadastro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Register new customer
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Nome e obrigatorio');
      return;
    }

    if (formData.cpf.length !== 11) {
      setError('CPF deve ter 11 digitos');
      return;
    }

    if (!photoFile) {
      setError('Foto e obrigatoria para reconhecimento facial');
      return;
    }

    if (!store?.id) {
      setError('Loja nao identificada');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload photo
      const uploadResponse = await uploadPublicCustomerPhoto(photoFile);
      const photoUrl = uploadResponse.data.url;

      // Register customer
      const response = await registerCustomer({
        name: formData.name.trim(),
        cpf: formData.cpf,
        phone,
        photo: photoUrl,
        storeId: store.id,
      });

      // Claim the session to notify the totem
      if (sessionToken) {
        await claimIdentificationSession(sessionToken, response.data.id);
      }
      setIdentifiedCustomer(response.data);
      setStep('success');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Erro ao cadastrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <svg
            className="h-16 w-16 mx-auto mb-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h1 className="text-xl font-bold text-gray-700 mb-2">
            Loja nao encontrada
          </h1>
          <p className="text-gray-500">Verifique o endereco e tente novamente</p>
        </div>
      </div>
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          {identifiedCustomer?.photo ? (
            <img
              src={identifiedCustomer.photo}
              alt={identifiedCustomer.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-lg"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {identifiedCustomer?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Ola, {identifiedCustomer?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 mb-6">
            Voce foi identificado com sucesso.
          </p>
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">
            Volte ao totem para continuar suas compras.
          </p>
        </div>
      </div>
    );
  }

  // Registration form
  if (step === 'register') {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div
          className="text-white py-6 px-4"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <div className="container mx-auto text-center">
            {store.logo && (
              <img
                src={store.logo}
                alt={store.name}
                className="h-12 w-12 rounded-full mx-auto mb-2 bg-white object-cover"
              />
            )}
            <h1 className="text-xl font-bold">{store.name}</h1>
            <p className="text-white/80 mt-1 text-sm">Novo cadastro</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 pb-8">
          <form onSubmit={handleRegister} className="max-w-md mx-auto space-y-6">
            {/* Phone (read-only) */}
            <div className="bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <p className="text-lg font-medium text-gray-800">{formatPhone(phone)}</p>
            </div>

            {/* Photo */}
            <div className="bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foto para reconhecimento facial *
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Tire uma foto do seu rosto para identificacao
              </p>
              {cameraActive ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 py-3 rounded-lg text-white font-medium"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      Tirar Foto
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="flex-1 py-3 rounded-lg bg-gray-200 text-gray-700 font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : photo ? (
                <div className="relative">
                  <img
                    src={photo}
                    alt="Foto do cliente"
                    className="w-full rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-700 font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-700 font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Galeria
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Name */}
            <div className="bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setError(null);
                }}
                placeholder="Digite seu nome"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                required
              />
            </div>

            {/* CPF */}
            <div className="bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPF *
              </label>
              <input
                type="tel"
                value={formatCpf(formData.cpf)}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-center">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-white font-bold text-lg disabled:opacity-50 transition-all"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Cadastrando...
                </span>
              ) : (
                'Cadastrar'
              )}
            </button>

            {/* Back button */}
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full py-3 rounded-xl text-gray-600 font-medium text-base bg-gray-200"
            >
              Voltar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Phone input screen
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div
        className="text-white py-6 px-4"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <div className="container mx-auto text-center">
          {store.logo && (
            <img
              src={store.logo}
              alt={store.name}
              className="h-12 w-12 rounded-full mx-auto mb-2 bg-white object-cover"
            />
          )}
          <h1 className="text-xl font-bold">{store.name}</h1>
          <p className="text-white/80 mt-1 text-sm">Identificacao</p>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 pb-8">
        <form onSubmit={handleCheckPhone} className="max-w-md mx-auto space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Digite seu telefone</h2>
              <p className="text-gray-600 text-sm">
                Informe o telefone cadastrado para se identificar
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone com DDD
              </label>
              <input
                type="tel"
                value={formatPhone(phone)}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-xl text-center"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-red-600 text-center text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={phone.length < 10 || loading}
              className="w-full py-4 rounded-xl text-white font-bold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              style={{
                backgroundColor: phone.length >= 10 && !loading ? 'var(--color-primary)' : undefined,
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verificando...
                </span>
              ) : (
                'Continuar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
