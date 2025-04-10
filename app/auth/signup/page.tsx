// app/auth/signup/page.tsx
import SignUpForm from '@/components/auth/SignUpForm'
import AuthButton from '@/components/auth/AuthButton'

export default function SignUp() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">  
      {/* Keep the form for functionality, but you can style it to be less prominent */}
      <div className="mt-20">
        <SignUpForm />
      </div>
    </div>
  )
}