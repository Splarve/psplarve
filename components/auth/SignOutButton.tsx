// components/auth/SignOutButton.tsx
'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SignOutButton() {
  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      
      toast.success("Signed out successfully")
      
      // Hard redirect to homepage
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error("Error signing out")
    }
  }

  return (
    <Button onClick={handleSignOut} variant="outline" size="sm">
      Sign out
    </Button>
  )
}