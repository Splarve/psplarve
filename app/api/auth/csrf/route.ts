// app/api/auth/csrf/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

// CSRF token generation
export async function GET(request: NextRequest) {
  try {
    // Create a CSRF token
    const token = randomBytes(32).toString('hex')
    
    // Get the Supabase client
    const supabase = await createClient()
    
    // Get session to check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    
    // Create response with CSRF token
    const response = NextResponse.json({
      csrfToken: token,
    })

    // Set CSRF token in HTTP-only cookie
    // Use SameSite=Strict for added security
    response.cookies.set('csrf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error('CSRF token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}

// CSRF token validation middleware
export function validateCsrfToken(handler: Function) {
  return async (request: NextRequest) => {
    // Get the CSRF token from the request header
    const csrfToken = request.headers.get('X-CSRF-Token')
    
    // Get the CSRF token from the cookie
    const csrfCookie = request.cookies.get('csrf_token')?.value
    
    // If either token is missing, return an error
    if (!csrfToken || !csrfCookie) {
      return NextResponse.json(
        { error: 'CSRF token missing' },
        { status: 403 }
      )
    }
    
    // If tokens don't match, return an error
    if (csrfToken !== csrfCookie) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }
    
    // If tokens match, proceed with the handler
    return handler(request)
  }
}