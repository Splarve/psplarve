import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CompanyOnboarding from '@/components/onboarding/CompanyOnboarding';

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
    <main className="min-h-screen bg-gray-50 py-12">
      <CompanyOnboarding />
    </main>
  );
} 