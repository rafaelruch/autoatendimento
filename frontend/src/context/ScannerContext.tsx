import { createContext, useContext, useState, type ReactNode } from 'react';

interface ScannerContextType {
  showScanner: boolean;
  openScanner: () => void;
  closeScanner: () => void;
}

const ScannerContext = createContext<ScannerContextType | null>(null);

export function ScannerProvider({ children }: { children: ReactNode }) {
  const [showScanner, setShowScanner] = useState(false);

  const openScanner = () => setShowScanner(true);
  const closeScanner = () => setShowScanner(false);

  return (
    <ScannerContext.Provider value={{ showScanner, openScanner, closeScanner }}>
      {children}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (!context) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
}
