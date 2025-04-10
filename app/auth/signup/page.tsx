// app/auth/signup/page.tsx
import SignUpForm from '@/components/auth/SignUpForm'
import AuthButton from '@/components/auth/AuthButton'

export default function SignUp() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignUpForm />
    </div>
  )
}