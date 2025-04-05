'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { toast } from "sonner"

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { searchParams } = new URL(window.location.href)
      const code = searchParams.get('code')
      
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code)
          toast.success("Authentication successful", {
            description: "Redirecting to dashboard..."
          })
          router.push('/dashboard')
        } catch (error: any) {
          console.error('Error exchanging code for session:', error)
          toast.error("Authentication failed", {
            description: error.message || "Unable to complete authentication"
          })
          setTimeout(() => {
            router.push('/auth/signin?error=callback_error')
          }, 3000)
        }
      }
    }

    handleAuthCallback()
  }, [router, supabase])

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  )
}