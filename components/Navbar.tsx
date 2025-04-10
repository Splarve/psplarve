// components/NavBar.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import AuthButton from './auth/AuthButton'
import { Button } from './ui/button'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }
  
  // Empty navigation to remove unnecessary links
  const navigation: any[] = []
  
  return (
    <nav className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16">
          {/* Left side - empty */}
          <div className="flex-1"></div>
          
          {/* Auth Button on the right */}
          <div className="flex items-center">
            <AuthButton />
          </div>
          
          {/* Mobile menu button - only needed for AuthButton on mobile */}
          <div className="flex items-center sm:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMenu} aria-label="Toggle menu">
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-4 pb-3 border-t border-border">
            <div className="flex items-center px-4 py-3">
              <AuthButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}