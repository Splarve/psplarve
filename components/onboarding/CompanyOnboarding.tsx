"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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

type Profile = {
  id: string;
  company_id: string | null;
  username: string;
  avatar?: string;
  role?: string;
  tags?: any;
};

export default function CompanyOnboarding() {
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const [companyName, setCompanyName] = useState('');
  const [companyHandle, setCompanyHandle] = useState('');
  const [formError, setFormError] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [respondingToInvitation, setRespondingToInvitation] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    async function fetchUserStatus() {
      try {
        setLoading(true);
        const response = await fetch('/api/user/company-status');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user company status');
        }
        
        const data = await response.json();
        console.log('Company status data:', data); // Debug log
        
        if (data.hasCompany) {
          // User already has a company, redirect to dashboard
          router.push('/dashboard');
          return;
        }
        
        setProfile(data.profile);
        setInvitations(data.invitations || []);
      } catch (error) {
        console.error('Error fetching user status:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserStatus();
  }, [router]);

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    
    if (!companyName || !companyHandle) {
      setFormError('Company name and handle are required');
      return;
    }
    
    try {
      setCreatingCompany(true);
      setFormError('');
      
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: companyName,
          handle: companyHandle,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create company');
      }
      
      // Redirect to dashboard after successful company creation
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating company:', error);
      setFormError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setCreatingCompany(false);
    }
  }

  async function handleInvitationResponse(invitationId: string, accept: boolean) {
    try {
      setRespondingToInvitation(true);
      
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: accept ? 'accepted' : 'rejected',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${accept ? 'accept' : 'reject'} invitation`);
      }
      
      if (accept) {
        // Redirect to dashboard after accepting invitation
        router.push('/dashboard');
      } else {
        // Update the invitations list
        setInvitations(invitations.filter(inv => inv.id !== invitationId));
      }
    } catch (error) {
      console.error(`Error ${accept ? 'accepting' : 'rejecting'} invitation:`, error);
      setFormError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setRespondingToInvitation(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Welcome to Splarve</h1>
        <p className="text-gray-600 text-sm mt-2">
          Create your own company or accept an invitation to join one.
        </p>
      </div>

      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <span className="block sm:inline">{formError}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* Pending Invitations Section - Always shown */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Pending Invitations</h2>
          
          {invitations.length === 0 ? (
            <div className="py-4 text-center text-gray-500 bg-gray-50 rounded-lg">
              You don&apos;t have any pending invitations.
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto p-1">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    {invitation.companies?.logo ? (
                      <Image
                        src={invitation.companies.logo}
                        alt={invitation.companies.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 font-medium">
                          {invitation.companies?.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium">{invitation.companies?.name || 'Unknown Company'}</h3>
                      <p className="text-xs text-gray-500">@{invitation.companies?.handle || 'unknown'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">From:</span> {invitation.from_email}
                    </div>
                    <div>
                      <span className="text-gray-500">Role:</span> {invitation.role}
                    </div>
                  </div>
                  
                  {invitation.message && (
                    <p className="text-xs mb-3 bg-gray-50 p-2 rounded">
                      {invitation.message}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, true)}
                      disabled={respondingToInvitation}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition-colors flex-1"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, false)}
                      disabled={respondingToInvitation}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded text-sm transition-colors flex-1"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Company Form */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Create Your Company</h2>
          
          <form onSubmit={handleCreateCompany} className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Company Name"
              />
            </div>
            
            <div>
              <label htmlFor="companyHandle" className="block text-sm font-medium text-gray-700 mb-1">
                Company Handle
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-100 text-gray-500 border border-r-0 rounded-l-md">
                  @
                </span>
                <input
                  type="text"
                  id="companyHandle"
                  value={companyHandle}
                  onChange={(e) => setCompanyHandle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="company-handle"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This will be your company's unique identifier.
              </p>
            </div>
            
            <button
              type="submit"
              disabled={creatingCompany}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
            >
              {creatingCompany ? 'Creating...' : 'Create Company'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 