// app/api/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    try {
      const supabase = await createClient()
      
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(
          new URL('/auth/signin?error=callback_error', requestUrl.origin)
        )
      }
      
      // Create profile if it doesn't exist (e.g., for OAuth providers)
      if (data?.user) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()
        
        if (!existingProfile) {
          const userMetadata = data.user.user_metadata || {}
          
          await supabase.from('profiles').insert({
            id: data.user.id,
            email: data.user.email,
            full_name: userMetadata.full_name || userMetadata.name || null,
            avatar_url: userMetadata.avatar_url || null,
            created_at: new Date().toISOString(),
          })
        }
      }
      
      // Redirect to dashboard after successful auth
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    } catch (error) {
      console.error('Auth callback processing error:', error)
      return NextResponse.redirect(
        new URL('/auth/signin?error=internal_error', requestUrl.origin)
      )
    }
  }
  
  // If no code is present, redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}