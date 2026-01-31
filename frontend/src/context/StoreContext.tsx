import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useParams } from 'react-router-dom';
import type { Store } from '../types';
import { getStore } from '../services/api';

interface StoreContextType {
  store: Store | null;
  loading: boolean;
  error: string | null;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const fetchStore = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getStore(slug);
        setStore(response.data);

        // Set page title
        document.title = `${response.data.name} | ruchmarket`;

        // Apply theme colors
        const root = document.documentElement;
        root.style.setProperty('--color-primary', response.data.primaryColor);

        // Generate darker and lighter variants
        const hex = response.data.primaryColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Darker version
        const darkerR = Math.max(0, r - 30);
        const darkerG = Math.max(0, g - 30);
        const darkerB = Math.max(0, b - 30);
        root.style.setProperty(
          '--color-primary-dark',
          `rgb(${darkerR}, ${darkerG}, ${darkerB})`
        );

        // Lighter version
        const lighterR = Math.min(255, r + 30);
        const lighterG = Math.min(255, g + 30);
        const lighterB = Math.min(255, b + 30);
        root.style.setProperty(
          '--color-primary-light',
          `rgb(${lighterR}, ${lighterG}, ${lighterB})`
        );
      } catch (err) {
        setError('Loja não encontrada');
        setStore(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [slug]);

  return (
    <StoreContext.Provider value={{ store, loading, error }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
