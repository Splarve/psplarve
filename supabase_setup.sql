-- Reset and setup Supabase tables, policies, and functions

BEGIN;

-- Drop existing functions, triggers and policies
DROP FUNCTION IF EXISTS can_send_invite CASCADE;
DROP FUNCTION IF EXISTS is_company_admin CASCADE;
DROP FUNCTION IF EXISTS has_multiple_admins CASCADE;
DROP FUNCTION IF EXISTS get_user_role CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;

-- Create companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handle TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    logo TEXT,
    description TEXT,
    industry TEXT,
    size TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    username TEXT UNIQUE,
    avatar TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    role TEXT CHECK (role IN ('Admin', 'Manager', 'HR', 'Member', 'Guest')),
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invitations table
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    message TEXT,
    role TEXT CHECK (role IN ('Admin', 'Manager', 'HR', 'Member', 'Guest')) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'archived')) DEFAULT 'pending',
    attempt_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, to_email, status)
);

-- Create function to check if user can send invite based on role hierarchy
CREATE OR REPLACE FUNCTION can_send_invite(inviter_role TEXT, invitee_role TEXT) RETURNS BOOLEAN AS $$
DECLARE
    role_hierarchy JSON := '{"Admin": 1, "Manager": 2, "HR": 3, "Member": 4, "Guest": 5}';
    inviter_rank INTEGER;
    invitee_rank INTEGER;
BEGIN
    inviter_rank := (role_hierarchy->inviter_role)::INTEGER;
    invitee_rank := (role_hierarchy->invitee_role)::INTEGER;
    RETURN inviter_rank < invitee_rank OR inviter_role = 'Admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin for a company
CREATE OR REPLACE FUNCTION is_company_admin(user_id UUID, check_company_id UUID) RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE profiles.user_id = user_id AND profiles.company_id = check_company_id;
    
    RETURN user_role = 'Admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if a company has more than one admin
CREATE OR REPLACE FUNCTION has_multiple_admins(check_company_id UUID) RETURNS BOOLEAN AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM profiles
    WHERE company_id = check_company_id AND role = 'Admin';
    
    RETURN admin_count > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's role in a company
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID, check_company_id UUID) RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE profiles.user_id = user_id AND profiles.company_id = check_company_id;
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies

-- Everyone can read company details
CREATE POLICY "Companies are viewable by everyone" 
ON companies FOR SELECT USING (true);

-- Only company admins can update company details
CREATE POLICY "Company can be updated by admins" 
ON companies FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
    AND profiles.role = 'Admin'
  )
);

-- Anyone can create a company
CREATE POLICY "Anyone can create a company" 
ON companies FOR INSERT WITH CHECK (true);

-- Only admins can delete their company
CREATE POLICY "Only admins can delete companies" 
ON companies FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
    AND profiles.role = 'Admin'
  )
);

-- RLS Policies for profiles

-- Users can view all profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE USING (
  auth.uid() = user_id
);

-- Company admins can update profiles in their company
CREATE POLICY "Company admins can update profiles in their company" 
ON profiles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles AS admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.company_id = profiles.company_id
    AND admin_profile.role = 'Admin'
  )
);

-- Users can remove themselves from a company or be removed by company admins
CREATE POLICY "Users can leave companies or be removed by admins"
ON profiles FOR UPDATE 
USING (
  -- User is updating their own profile
  auth.uid() = user_id
  OR
  -- Admin is removing someone from their company
  EXISTS (
    SELECT 1 FROM profiles AS admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.company_id = profiles.company_id
    AND admin_profile.role = 'Admin'
  )
)
WITH CHECK (
  -- Allow users to set their own company to null (leaving)
  (auth.uid() = user_id AND (company_id IS NULL OR company_id = profiles.company_id))
  OR
  -- Allow admins to update profiles in their company
  EXISTS (
    SELECT 1 FROM profiles AS admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.company_id = profiles.company_id
    AND admin_profile.role = 'Admin'
  )
);

-- RLS Policies for invitations

-- Users can view invitations sent to their email based on profiles
CREATE POLICY "Users can view invitations sent to their email" 
ON invitations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.username = invitations.to_email
  )
);

-- Company members can view invitations from their company
CREATE POLICY "Company members can view invitations from their company" 
ON invitations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = invitations.company_id
  )
);

-- Only appropriate roles can create invitations
CREATE POLICY "Appropriate roles can create invitations" 
ON invitations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = invitations.company_id
    AND (
      -- Admins can invite anyone
      profiles.role = 'Admin'
      OR
      -- Others can only invite lower roles
      can_send_invite(profiles.role, invitations.role)
    )
  )
);

-- Users can update their own invitations (for accepting/rejecting) based on profiles
CREATE POLICY "Users can update their own invitations" 
ON invitations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.username = invitations.to_email
  )
);

-- Company members with appropriate roles can update invitations
CREATE POLICY "Company members with appropriate roles can update invitations" 
ON invitations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = invitations.company_id
    AND (
      -- Admins can update any invitation
      profiles.role = 'Admin'
      OR
      -- Others can only update invitations they could have created
      can_send_invite(profiles.role, invitations.role)
    )
  )
);

-- Company members with appropriate roles can delete invitations
CREATE POLICY "Company members with appropriate roles can delete invitations" 
ON invitations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = invitations.company_id
    AND (
      -- Admins can delete any invitation
      profiles.role = 'Admin'
      OR
      -- Others can only delete invitations they could have created
      can_send_invite(profiles.role, invitations.role)
    )
  )
); 

-- Create an RPC function that can bypass RLS to remove a member from a company
-- This is used as a fallback in server-side code until proper RLS policies are implemented
CREATE OR REPLACE FUNCTION admin_remove_member_from_company(p_member_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles
  SET company_id = NULL, role = NULL, tags = NULL
  WHERE id = p_member_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to remove member: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT; 