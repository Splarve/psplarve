// app/api/auth/signup/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Server-side validation schema
const signUpSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  // Add additional validation for password strength if needed
  // .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: 'Password must contain uppercase, lowercase, and number' }),
})

// Rate limiting setup
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_ATTEMPTS = 5

// Simple rate limiter (in production use Redis or similar)
const ipAttempts = new Map<string, { count: number; timestamp: number }>()

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-real-ip') || 
               request.headers.get('x-forwarded-for') || 
               'unknown'
    // Check rate limiting
    const now = Date.now()
    const ipData = ipAttempts.get(ip)
    
    if (ipData && now - ipData.timestamp < RATE_LIMIT_WINDOW) {
      // Within rate limit window
      if (ipData.count >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: 'Too many sign-up attempts. Please try again later.' },
          { status: 429 }
        )
      }
      ipAttempts.set(ip, { count: ipData.count + 1, timestamp: ipData.timestamp })
    } else {
      // New rate limit window
      ipAttempts.set(ip, { count: 1, timestamp: now })
    }

    // Parse request body
    const body = await request.json()
    
    // Validate with zod
    const result = signUpSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      )
    }
    
    // Create Supabase server client
    const supabase = await createClient()
    
    // Attempt sign up
    const { data, error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })
    
    if (error) {
      // Don't reveal too much information in error messages
      console.error('Signup error:', error)
      
      return NextResponse.json(
        { error: 'Registration failed. Please try again later.' },
        { status: 500 }
      )
    }
    
    // Create profile record in database
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        created_at: new Date().toISOString(),
      }).select()
    }
    
    // Return a JSON response with a redirect URL using query parameters
    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
      redirectUrl: `/auth/confirmation?email=${encodeURIComponent(result.data.email)}`
    })
  } catch (error) {
    console.error('Sign-up error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}