// app/api/auth/signin/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Server-side validation schema
const signInSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
})

// Rate limiting setup
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
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
          { error: 'Too many sign-in attempts. Please try again later.' },
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
    const result = signInSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      )
    }
    
    // Create Supabase server client
    const supabase = await createClient()
    
    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    })
    
    if (error) {
      // Don't reveal too much information in error messages
      let message = 'Authentication failed'
      
      // Only provide specific errors for usability, not for security probing
      if (error.message.includes('Invalid login credentials')) {
        message = 'Invalid email or password'
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Please verify your email before signing in'
      }
      
      return NextResponse.json({ error: message }, { status: 401 })
    }
    
    // Clear rate limit on successful login
    ipAttempts.delete(ip)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sign-in error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}