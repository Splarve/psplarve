// app/auth/signin/page.tsx
import SignInForm from '@/components/auth/SignInForm'
import AuthButton from '@/components/auth/AuthButton'

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignInForm />
    </div>
  )
}