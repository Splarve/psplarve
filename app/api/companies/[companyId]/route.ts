import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // Get the user's profile to check if they belong to this company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Only allow users to view their own company details
    if (profile.company_id !== companyId) {
      return NextResponse.json(
        { error: 'You do not have permission to view this company' },
        { status: 403 }
      );
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError) {
      return NextResponse.json(
        { error: 'Failed to fetch company details' },
        { status: 500 }
      );
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Error fetching company details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 