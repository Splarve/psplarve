'use client';

import { useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

export default function HideNavbarButtons() {
  const { setShowAuthButtons } = useNavigation();
  
  useEffect(() => {
    // Hide the navbar buttons when this component mounts
    setShowAuthButtons(false);
    
    // Show them again when component unmounts
    return () => setShowAuthButtons(true);
  }, [setShowAuthButtons]);
  
  return null; // This component doesn't render anything
}