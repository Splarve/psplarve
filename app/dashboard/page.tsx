// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuthButton from '@/components/auth/AuthButton'

export default async function Dashboard() {
  const supabase = await createClient()
  
  // Get user using getUser() - best practice compared to getSession
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    // If there's an error or no user, redirect to sign in
    redirect('/auth/signin')
  }
  
  return (
    <div className="min-h-screen bg-muted/40">
      {/* Only AuthButton in the top right */}
      <div className="fixed top-4 right-4">
        <AuthButton />
      </div>
    </div>
  )
}