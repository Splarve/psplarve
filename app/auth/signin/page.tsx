// app/auth/signin/page.tsx
import SignInForm from '@/components/auth/SignInForm'

export default function SignIn() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center flex-1 px-4 sm:px-20">
        <SignInForm />
      </main>
    </div>
  )
}