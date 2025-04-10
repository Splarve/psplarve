import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Properly handle the dynamic route parameter
    const invitationId = await Promise.resolve(params.id);
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
    const { status } = body;

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "accepted" or "rejected"' },
        { status: 400 }
      );
    }

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        id, 
        from_email, 
        to_email, 
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
      .eq('id', invitationId)
      .eq('to_email', user.email)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or you do not have permission to respond to it' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'This invitation has already been responded to' },
        { status: 400 }
      );
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ status })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invitation status' },
        { status: 500 }
      );
    }

    // If accepted, update the user's profile to join the company
    if (status === 'accepted') {
      // First check if user already belongs to a company
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error checking profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to check user profile' },
          { status: 500 }
        );
      }

      if (profile.company_id) {
        // Update the invitation back to pending
        await supabase
          .from('invitations')
          .update({ status: 'pending' })
          .eq('id', invitationId);
          
        return NextResponse.json(
          { error: 'You already belong to a company. You must leave your current company before accepting this invitation.' },
          { status: 400 }
        );
      }

      // Update user's profile
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          company_id: invitation.company_id,
          role: invitation.role
        })
        .eq('user_id', user.id);

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
        
        // Revert the invitation status
        await supabase
          .from('invitations')
          .update({ status: 'pending' })
          .eq('id', invitationId);
          
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: status === 'accepted' 
        ? `You have joined ${invitation.companies[0]?.name || 'the company'}`
        : 'Invitation rejected'
    });

  } catch (error) {
    console.error('Error responding to invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Properly handle the dynamic route parameter
    const invitationId = params.id;
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

    // Get user's company and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('company_id, role, status, attempt_count')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Only allow canceling pending invitations
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending invitations can be canceled' },
        { status: 400 }
      );
    }

    // Check if user can cancel this invitation
    let canCancel = false;
    
    // The invitation was sent to this user
    const { data: userInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('id', invitationId)
      .eq('to_email', user.email)
      .maybeSingle();
      
    if (userInvitation) {
      canCancel = true;
    } else if (profile.company_id === invitation.company_id) {
      // Or user is from the same company and has proper permissions
      if (profile.role === 'Admin' || 
         (profile.role !== 'Member' && profile.role !== 'Guest' && 
          ['Member', 'Guest'].includes(invitation.role))) {
        canCancel = true;
      }
    }

    if (!canCancel) {
      return NextResponse.json(
        { error: 'You do not have permission to cancel this invitation' },
        { status: 403 }
      );
    }

    // Archive the invitation instead of deleting it
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Error archiving invitation:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation canceled successfully'
    });

  } catch (error) {
    console.error('Error canceling invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 