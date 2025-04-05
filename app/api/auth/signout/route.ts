// app/api/auth/signout/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase server client
    const supabase = await createClient()
    
    // Sign out
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign-out error:', error)
      return NextResponse.json(
        { error: 'Failed to sign out' },
        { status: 500 }
      )
    }
    
    // Clear all auth cookies
    const response = NextResponse.json({ success: true })
    
    // Explicitly clear any auth cookies (for added security)
    response.cookies.delete('sb-refresh-token')
    response.cookies.delete('sb-access-token')
    
    return response
  } catch (error) {
    console.error('Sign-out error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}