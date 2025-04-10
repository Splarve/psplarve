import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST: Create a new company
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
    const { handle, name } = body;

    if (!handle || !name) {
      return NextResponse.json(
        { error: 'Company handle and name are required' },
        { status: 400 }
      );
    }

    // Check if handle is already taken
    const { data: existingCompany, error: handleCheckError } = await supabase
      .from('companies')
      .select('id')
      .eq('handle', handle)
      .single();

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company handle is already taken' },
        { status: 409 }
      );
    }

    // Start a transaction
    // 1. Insert the company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        handle,
        name,
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      );
    }

    // 2. Update the user's profile to join the company as Admin
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        company_id: company.id,
        role: 'Admin'
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Attempt to rollback by deleting the company
      await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);
        
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      company,
      message: 'Company created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: List all companies (for admin purposes - protected by RLS)
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch companies' },
        { status: 500 }
      );
    }

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 