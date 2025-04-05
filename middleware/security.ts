// middleware/security.ts
import { NextRequest, NextResponse } from 'next/server'

// Define security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: buildCSP(),
  },
]

// Build Content Security Policy
function buildCSP() {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"], // For Next.js, unfortunately need unsafe-inline
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https://lh3.googleusercontent.com'], // For Google avatars
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'", 
      process.env.NEXT_PUBLIC_SUPABASE_URL || '', 
      'https://fonts.googleapis.com'
    ],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
  }

  // Convert directives object to CSP string
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ')
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 100 // Adjust based on application needs

// Simple rate limiter (in production use Redis or similar)
const ipRequests = new Map<string, { count: number; timestamp: number }>()

// Security middleware
export function securityMiddleware(request: NextRequest) {
  // Create the response
  const response = NextResponse.next()
  
  // Apply security headers
  securityHeaders.forEach(({ key, value }) => {
    response.headers.set(key, value)
  })

  // Check for rate limiting
  const ip = request.headers.get('x-real-ip') || 
  request.headers.get('x-forwarded-for') || 
  'unknown'
  const now = Date.now()
  const ipData = ipRequests.get(ip)
  
  // Simple rate limiting (should use Redis or similar in production)
  if (ipData && now - ipData.timestamp < RATE_LIMIT_WINDOW) {
    if (ipData.count >= MAX_REQUESTS) {
      // Return 429 Too Many Requests if rate limit exceeded
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      })
    }
    ipRequests.set(ip, { count: ipData.count + 1, timestamp: ipData.timestamp })
  } else {
    ipRequests.set(ip, { count: 1, timestamp: now })
  }
  
  // Add X-XSS-Protection header
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  return response
}