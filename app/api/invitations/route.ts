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
    const { toEmail, companyId, role, message, reinvite, invitationId } = body;

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

    // Check if we're reinviting or sending a new invitation
    if (reinvite && invitationId) {
      // This is a reinvitation
      const { data: existingInvitation, error: invitationCheckError } = await supabase
        .from('invitations')
        .select('id, attempt_count, status')
        .eq('id', invitationId)
        .eq('company_id', companyId)
        .single();

      if (invitationCheckError || !existingInvitation) {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        );
      }

      // Check if it's a rejected invitation and if attempt limit is reached
      if (existingInvitation.status === 'rejected' && existingInvitation.attempt_count >= 3) {
        return NextResponse.json(
          { error: 'Maximum reattempt limit reached (3). Cannot reinvite this user again.' },
          { status: 400 }
        );
      }

      // Update the existing invitation
      const { data: updatedInvitation, error: updateError } = await supabase
        .from('invitations')
        .update({
          from_email: user.email,
          role,
          message: message || null,
          status: 'pending',
          attempt_count: existingInvitation.attempt_count + 1,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating invitation:', updateError);
        return NextResponse.json(
          { error: 'Failed to reinvite user' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        invitation: updatedInvitation,
        message: 'User reinvited successfully'
      }, { status: 200 });
    } else {
      // Check if an active invitation already exists for this email from this company
      const { data: existingPendingInvitation, error: pendingCheckError } = await supabase
        .from('invitations')
        .select('id')
        .eq('to_email', toEmail)
        .eq('company_id', companyId)
        .eq('status', 'pending');

      if (existingPendingInvitation && existingPendingInvitation.length > 0) {
        return NextResponse.json(
          { error: 'A pending invitation already exists for this email' },
          { status: 409 }
        );
      }

      // Check if there's a rejected invitation that can be updated
      const { data: existingRejectedInvitation, error: rejectedCheckError } = await supabase
        .from('invitations')
        .select('id, attempt_count')
        .eq('to_email', toEmail)
        .eq('company_id', companyId)
        .in('status', ['rejected', 'archived'])
        .order('updated_at', { ascending: false })
        .limit(1);

      if (existingRejectedInvitation && existingRejectedInvitation.length > 0) {
        const rejectedInvite = existingRejectedInvitation[0];
        
        // Check if attempt limit is reached
        if (rejectedInvite.attempt_count >= 3) {
          return NextResponse.json(
            { error: 'Maximum reattempt limit reached (3). Cannot reinvite this user.' },
            { status: 400 }
          );
        }
        
        // Update the rejected invitation
        const { data: updatedInvitation, error: updateError } = await supabase
          .from('invitations')
          .update({
            from_email: user.email,
            role,
            message: message || null,
            status: 'pending',
            attempt_count: rejectedInvite.attempt_count + 1,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', rejectedInvite.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating rejected invitation:', updateError);
          return NextResponse.json(
            { error: 'Failed to reinvite user' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          invitation: updatedInvitation,
          message: 'User reinvited successfully'
        }, { status: 200 });
      }

      // Check if user is already in a company
      const { data: invitedUserProfile, error: invitedUserError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('username', toEmail)
        .single();

      if (!invitedUserError && invitedUserProfile && invitedUserProfile.company_id) {
        return NextResponse.json(
          { error: 'This user is already a member of a company' },
          { status: 409 }
        );
      }

      // Create a new invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('invitations')
        .insert({
          from_email: user.email,
          to_email: toEmail,
          company_id: companyId,
          role,
          message: message || null,
          status: 'pending',
          attempt_count: 1
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
    }

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