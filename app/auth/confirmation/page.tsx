'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'

export default function ConfirmationPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  
  useEffect(() => {
    // Get email from URL parameters
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mx-auto bg-blue-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
          <MailCheck className="h-6 w-6 text-blue-500" />
        </div>
        
        <h1 className="text-2xl font-bold mb-4">Check your email</h1>
        
        <p className="mb-6">
          We sent a verification link to<br />
          <span className="font-medium">{email}</span>
        </p>
        
        <p className="text-gray-600 mb-8">
          Click the link in the email to verify your account and complete the sign-up process.
          The link will expire in 24 hours.
        </p>
        
        <div className="space-y-4">
          <Link href="/auth/signin" className="block w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded border text-center">
            Back to sign in
          </Link>
          
          <p className="text-xs text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <Link href="/auth/signup" className="text-blue-600 hover:underline">
              try again
            </Link> with a different email address.
          </p>
        </div>
      </div>
    </div>
  )
}