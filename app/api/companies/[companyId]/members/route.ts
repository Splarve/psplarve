import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET: List all members of a company
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    // Properly handle the dynamic route parameter
    const companyId = await Promise.resolve(params.companyId);
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

    // Check if the user belongs to this company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.company_id !== companyId) {
      return NextResponse.json(
        { error: 'You do not have permission to view members of this company' },
        { status: 403 }
      );
    }

    // Get all members of the company
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id, user_id, username, avatar, role, tags')
      .eq('company_id', companyId);

    if (membersError) {
      console.error('Error fetching company members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch company members' },
        { status: 500 }
      );
    }

    return NextResponse.json({ members });

  } catch (error) {
    console.error('Error fetching company members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update a member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    // Properly handle the dynamic route parameter
    const companyId = await Promise.resolve(params.companyId);
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

    // Parse request body
    const body = await request.json();
    const { memberId, newRole } = body;

    if (!memberId || !newRole) {
      return NextResponse.json(
        { error: 'Member ID and new role are required' },
        { status: 400 }
      );
    }

    if (!['Admin', 'Manager', 'HR', 'Member', 'Guest'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if the current user is from this company and has permission
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (currentUserError || !currentUserProfile || currentUserProfile.company_id !== companyId) {
      return NextResponse.json(
        { error: 'You do not have permission to update members in this company' },
        { status: 403 }
      );
    }

    // Only admins can change roles
    if (currentUserProfile.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Only administrators can change member roles' },
        { status: 403 }
      );
    }

    // Get the member to update
    const { data: memberToUpdate, error: memberError } = await supabase
      .from('profiles')
      .select('id, user_id, role')
      .eq('id', memberId)
      .eq('company_id', companyId)
      .single();

    if (memberError || !memberToUpdate) {
      return NextResponse.json(
        { error: 'Member not found in this company' },
        { status: 404 }
      );
    }

    // Check if changing the last admin
    if (memberToUpdate.role === 'Admin' && newRole !== 'Admin') {
      // Count the number of admins in the company
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)
        .eq('role', 'Admin');

      if (adminsError) {
        return NextResponse.json(
          { error: 'Failed to check admin count' },
          { status: 500 }
        );
      }

      if (admins.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot change the role of the last admin in the company' },
          { status: 400 }
        );
      }
    }

    // Update the member's role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error updating member role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member role updated successfully'
    });

  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a member from the company
export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    // Properly handle the dynamic route parameter
    const companyId = await Promise.resolve(params.companyId);
    const supabase = await createClient();
    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }
    
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

    // Check if the current user is from this company and has permission
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (currentUserError || !currentUserProfile || currentUserProfile.company_id !== companyId) {
      return NextResponse.json(
        { error: 'You do not have permission to remove members from this company' },
        { status: 403 }
      );
    }

    // Get the member to remove
    const { data: memberToRemove, error: memberError } = await supabase
      .from('profiles')
      .select('id, user_id, role')
      .eq('id', memberId)
      .eq('company_id', companyId)
      .single();

    if (memberError || !memberToRemove) {
      return NextResponse.json(
        { error: 'Member not found in this company' },
        { status: 404 }
      );
    }

    // Non-admins can only remove themselves
    if (currentUserProfile.role !== 'Admin' && memberToRemove.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to remove other members' },
        { status: 403 }
      );
    }

    // Check if removing the last admin
    if (memberToRemove.role === 'Admin') {
      // Count the number of admins in the company
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)
        .eq('role', 'Admin');

      if (adminsError) {
        return NextResponse.json(
          { error: 'Failed to check admin count' },
          { status: 500 }
        );
      }

      if (admins.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin from the company' },
          { status: 400 }
        );
      }
    }

    // Update the member's profile to remove company association
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        company_id: null,
        role: null,
        tags: null
      })
      .eq('id', memberId)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error removing member from company:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove member from company' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed from company successfully'
    });

  } catch (error) {
    console.error('Error removing member from company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 