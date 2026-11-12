import React, { createContext, useContext, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

interface AnalysisLockContextValue {
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

const AnalysisLockContext = createContext<AnalysisLockContextValue>({
  isAnalyzing: false,
  setIsAnalyzing: () => {},
});

export function AnalysisLockProvider({ children }: { children: React.ReactNode }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Prevent hardware back button on Android while analysis is running
  useEffect(() => {
    if (!isAnalyzing) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Return true to prevent default back navigation
      return true;
    });

    return () => {
      backHandler.remove();
    };
  }, [isAnalyzing]);

  return (
    <AnalysisLockContext.Provider value={{ isAnalyzing, setIsAnalyzing }}>
      {children}
    </AnalysisLockContext.Provider>
  );
}

export function useAnalysisLock(): AnalysisLockContextValue {
  return useContext(AnalysisLockContext);
}

