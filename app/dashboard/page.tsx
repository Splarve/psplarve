"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/auth/SignOutButton";

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

export default function Dashboard() {
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {company?.name || "Your Company"} Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {profile?.username}! You are signed in as a {profile?.role}.
            </p>
          </div>
          <SignOutButton />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Company Management Card */}
        <Link href="/dashboard/members" className="block">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Member Management</h3>
            <p className="text-gray-600">Manage team members, send invitations, and assign roles.</p>
          </div>
        </Link>

        {/* Company Profile Card */}
        <Link href="/dashboard/company" className="block">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Company Profile</h3>
            <p className="text-gray-600">View and edit your company details, logo, and settings.</p>
          </div>
        </Link>

        {/* User Profile Card */}
        <Link href="/dashboard/profile" className="block">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Your Profile</h3>
            <p className="text-gray-600">Update your personal information, avatar, and preferences.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}