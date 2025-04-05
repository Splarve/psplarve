// app/page.tsx
import Link from 'next/link'
import AuthButton from '@/components/auth/AuthButton'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <header className="w-full max-w-4xl flex justify-between items-center p-4">
        <h1 className="text-2xl font-bold">Next.js + Supabase Auth</h1>
        <AuthButton />
      </header>

      <main className="flex flex-col items-center justify-center flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">
          Welcome to{' '}
          <span className="text-indigo-600">Supabase Auth Demo</span>
        </h1>

        <p className="mt-3 text-2xl">
          Get started by signing in or creating an account
        </p>

        <div className="flex flex-wrap items-center justify-around max-w-4xl mt-6 sm:w-full">
          <Link
            href="/auth/signin"
            className="p-6 mt-6 text-left border w-96 rounded-xl hover:text-indigo-600 focus:text-indigo-600"
          >
            <h3 className="text-2xl font-bold">Sign In &rarr;</h3>
            <p className="mt-4 text-xl">
              Already have an account? Sign in here.
            </p>
          </Link>

          <Link
            href="/auth/signup"
            className="p-6 mt-6 text-left border w-96 rounded-xl hover:text-indigo-600 focus:text-indigo-600"
          >
            <h3 className="text-2xl font-bold">Sign Up &rarr;</h3>
            <p className="mt-4 text-xl">
              Create a new account to get started.
            </p>
          </Link>
        </div>
      </main>
    </div>
  )
}