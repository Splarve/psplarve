// app/page.tsx
import AuthButton from '@/components/auth/AuthButton'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      {/* Only AuthButton in the top right */}
      <div className="fixed top-4 right-4">
        <AuthButton />
      </div>
    </div>
  )
}