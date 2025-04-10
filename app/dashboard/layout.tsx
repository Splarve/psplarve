'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import AuthButton from '@/components/auth/AuthButton';
import { createClient } from '@/lib/supabase/client';

type Profile = {
  id: string;
  company_id: string;
  username: string;
  avatar?: string;
  role: string;
  tags?: any;
};

type Company = {
  id: string;
  handle: string;
  name: string;
  logo?: string;
  description?: string;
  industry?: string;
  size?: string;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch("/api/user/company-status");
        
        if (!res.ok) {
          throw new Error("Failed to fetch user data");
        }
        
        const data = await res.json();
        
        if (!data.hasCompany) {
          router.push("/onboarding");
          return;
        }
        
        setProfile(data.profile);
        
        // Fetch company details
        if (data.profile.company_id) {
          const companyRes = await fetch(`/api/companies/${data.profile.company_id}`);
          
          if (companyRes.ok) {
            const companyData = await companyRes.json();
            setCompany(companyData.company);
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {profile && <Sidebar companyName={company?.name || "Company"} userRole={profile.role} />}
      
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="p-4 flex justify-end">
          <AuthButton />
        </div>
        
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
    </div>
  );
} 