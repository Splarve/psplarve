// app/auth/signin/page.tsx
import SignInForm from '@/components/auth/SignInForm'
import AuthButton from '@/components/auth/AuthButton'

export default function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">      
      {/* Keep the form for functionality, but you can style it to be less prominent */}
      <div className="mt-20">
        <SignInForm />
      </div>
    </div>
  )
}