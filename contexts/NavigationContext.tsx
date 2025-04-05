'use client';

import { createContext, useContext, ReactNode, useState } from 'react';

type NavigationContextType = {
  showAuthButtons: boolean;
  setShowAuthButtons: (show: boolean) => void;
};

const NavigationContext = createContext<NavigationContextType>({
  showAuthButtons: true,
  setShowAuthButtons: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [showAuthButtons, setShowAuthButtons] = useState(true);

  return (
    <NavigationContext.Provider value={{ showAuthButtons, setShowAuthButtons }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}