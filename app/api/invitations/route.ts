import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST: Create a new invitation
export async function POST(request: NextRequest) {
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

    // Parse the request body
    const body = await request.json();
    const { toEmail, companyId, role, message } = body;

    if (!toEmail || !companyId || !role) {
      return NextResponse.json(
        { error: 'Email, company ID, and role are required' },
        { status: 400 }
      );
    }

    // Check if the user has permission to send the invitation
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Check if the user belongs to the company they're sending an invitation for
    if (profile.company_id !== companyId) {
      return NextResponse.json(
        { error: 'You can only send invitations for your own company' },
        { status: 403 }
      );
    }

    // Check if the user's role allows them to send invitations for the specified role
    if (profile.role !== 'Admin') {
      const roleHierarchy = {
        'Admin': 1,
        'Manager': 2,
        'HR': 3,
        'Member': 4,
        'Guest': 5
      };

      if (!roleHierarchy[profile.role as keyof typeof roleHierarchy] || 
          !roleHierarchy[role as keyof typeof roleHierarchy] ||
          roleHierarchy[profile.role as keyof typeof roleHierarchy] >= roleHierarchy[role as keyof typeof roleHierarchy]) {
        return NextResponse.json(
          { error: 'You can only invite users with a lower role than yours' },
          { status: 403 }
        );
      }
    }

    // Check if an invitation already exists for this email from this company
    const { data: existingInvitation, error: invitationCheckError } = await supabase
      .from('invitations')
      .select('id')
      .eq('to_email', toEmail)
      .eq('company_id', companyId)
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 409 }
      );
    }

    // Create the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        from_email: user.email,
        to_email: toEmail,
        company_id: companyId,
        role,
        message: message || null,
        status: 'pending'
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation,
      message: 'Invitation sent successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: List invitations for the current user's company
export async function GET(request: NextRequest) {
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

    // Get the user's company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !profile.company_id) {
      return NextResponse.json(
        { error: 'User is not part of a company' },
        { status: 403 }
      );
    }

    // Check if we should include all invitation statuses
    const url = new URL(request.url);
    const includeAll = url.searchParams.get('include_all') === 'true';
    
    // Build the query
    let query = supabase
      .from('invitations')
      .select('*, companies(*)')
      .eq('company_id', profile.company_id);
    
    // Only include pending invitations unless include_all is true
    if (!includeAll) {
      query = query.eq('status', 'pending');
    }
    
    // Get invitations sent by the user's company
    const { data: invitations, error: invitationsError } = await query;

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations: invitations || [] });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 