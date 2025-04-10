import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CompanyOnboarding from '@/components/onboarding/CompanyOnboarding';
import AuthButton from '@/components/auth/AuthButton';

export default async function OnboardingPage() {
  const supabase = await createClient();
  
  // Check if the user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // If not authenticated, redirect to login
    redirect('/auth/login');
  }

  // The actual onboarding UI is handled by the client-side component
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="absolute top-4 right-6">
        <AuthButton />
      </div>
      <CompanyOnboarding />
    </div>
  );
} 