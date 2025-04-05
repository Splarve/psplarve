// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { securityMiddleware } from '@/middleware/security'

export async function middleware(request: NextRequest) {
  // First, apply security middleware
  const securityResponse = securityMiddleware(request)
  
  // If security middleware returned a response, return it
  if (securityResponse.status !== 200) {
    return securityResponse
  }
  
  // Otherwise, continue with the normal flow
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Merge security headers with our response
  securityResponse.headers.forEach((value, key) => {
    response.headers.set(key, value)
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get session using Supabase client
  const { data: { session } } = await supabase.auth.getSession()

  // Public paths that don't require authentication
  const publicPaths = ['/', '/auth/signin', '/auth/signup', '/auth/callback']
  
  // Check if the current path is a public path
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname) || 
                       request.nextUrl.pathname.startsWith('/auth/callback') || 
                       request.nextUrl.pathname.startsWith('/api/auth')

  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/profile']
  
  // Check if the current path is a protected path
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path)
  )

  // If trying to access a protected path without a session, redirect to signin
  if (!session && isProtectedPath) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // If already authenticated and trying to access auth pages (except callback), redirect to dashboard
  if (session && (request.nextUrl.pathname === '/auth/signin' || request.nextUrl.pathname === '/auth/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// Apply middleware to all routes except static files and specific API routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}