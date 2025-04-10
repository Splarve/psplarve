import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function checkOnboarding(req: NextRequest) {
  const supabase = await createClient();
  
  // Check if the user is authenticated using getUser() instead of session
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    // Not authenticated, don't need to check onboarding
    return null;
  }
  
  // Check if user has already joined a company
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  
  if (error) {
    console.error('Error checking user profile:', error);
    return null;
  }
  
  // Path we're trying to access
  const { pathname } = req.nextUrl;
  
  // If they're already on the onboarding page, don't redirect
  if (pathname === '/onboarding') {
    // If they already have a company, redirect to dashboard
    if (profile.company_id) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return null;
  }
  
  // If they're trying to access the dashboard without a company, redirect to onboarding
  if (pathname.startsWith('/dashboard') && !profile.company_id) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }
  
  return null;
} 