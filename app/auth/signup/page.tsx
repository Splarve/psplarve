// app/auth/signup/page.tsx
import SignUpForm from '@/components/auth/SignUpForm'

export default function SignUp() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center flex-1 px-4 sm:px-20">
        <SignUpForm />
      </main>
    </div>
  )
}