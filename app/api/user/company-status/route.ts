import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Define types
type Company = {
  id: string;
  handle: string;
  name: string;
  logo?: string;
};

type Invitation = {
  id: string;
  from_email: string;
  company_id: string;
  message?: string;
  status: string;
  role: string;
  created_at: string;
  companies: Company;
};

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, username, avatar, role, tags')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // If user is not part of a company, get their invitations
    let invitations = [];
    
    if (!profile.company_id) {
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select(`
          id, 
          from_email, 
          company_id, 
          message, 
          status, 
          role, 
          created_at, 
          companies:company_id (
            id, 
            handle, 
            name, 
            logo
          )
        `)
        .eq('to_email', user.email)
        .eq('status', 'pending');

      if (invitationsError) {
        console.error('Error fetching invitations:', invitationsError);
        return NextResponse.json(
          { error: 'Failed to fetch invitations' },
          { status: 500 }
        );
      }
      
      invitations = invitationsData || [];
    }

    return NextResponse.json({
      hasCompany: !!profile.company_id,
      profile,
      invitations
    });

  } catch (error) {
    console.error('Error fetching user company status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 