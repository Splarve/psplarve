"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Types
type Member = {
  id: string;
  user_id: string;
  username: string;
  avatar?: string;
  role: string;
  tags?: any;
};

type Invitation = {
  id: string;
  to_email: string;
  from_email: string;
  role: string;
  status: string;
  message?: string;
  created_at: string;
};

export default function MembersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // New invitation form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [message, setMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Role change state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  // Fetch members and invitations
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // First, get the user's profile to know their role and company
        const profileRes = await fetch('/api/user/company-status');
        
        if (!profileRes.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        const profileData = await profileRes.json();
        
        if (!profileData.hasCompany) {
          router.push('/onboarding');
          return;
        }
        
        setCompanyId(profileData.profile.company_id);
        setUserRole(profileData.profile.role);
        
        // Fetch company members
        const membersRes = await fetch(`/api/companies/${profileData.profile.company_id}/members`);
        
        if (!membersRes.ok) {
          throw new Error('Failed to fetch company members');
        }
        
        const membersData = await membersRes.json();
        setMembers(membersData.members);
        
        // Fetch invitations
        const invitationsRes = await fetch('/api/invitations');
        
        if (!invitationsRes.ok) {
          throw new Error('Failed to fetch invitations');
        }
        
        const invitationsData = await invitationsRes.json();
        setInvitations(invitationsData.invitations);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [router]);

  // Handle sending invitation
  async function sendInvitation(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !role || !companyId) {
      setError('Email and role are required');
      return;
    }
    
    try {
      setInviteLoading(true);
      setError(null);
      
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toEmail: email,
          companyId,
          role,
          message: message || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }
      
      // Add new invitation to the list
      setInvitations([...invitations, data.invitation]);
      
      // Reset form
      setEmail('');
      setRole('Member');
      setMessage('');
      setShowInviteForm(false);
      
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setInviteLoading(false);
    }
  }

  // Handle canceling an invitation
  async function cancelInvitation(id: string) {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel invitation');
      }
      
      // Remove invitation from the list
      setInvitations(invitations.filter(inv => inv.id !== id));
      
    } catch (err) {
      console.error('Error canceling invitation:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }

  // Handle changing a member's role
  async function changeRole() {
    if (!selectedMember || !newRole || !companyId) {
      return;
    }
    
    try {
      setRoleChangeLoading(true);
      setError(null);
      
      const response = await fetch(`/api/companies/${companyId}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: selectedMember.id,
          newRole,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role');
      }
      
      // Update member in the list
      setMembers(members.map(member => 
        member.id === selectedMember.id ? { ...member, role: newRole } : member
      ));
      
      // Close modal
      setShowRoleModal(false);
      setSelectedMember(null);
      
    } catch (err) {
      console.error('Error changing role:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setRoleChangeLoading(false);
    }
  }

  // Handle removing a member from the company
  async function removeMember(member: Member) {
    if (!confirm(`Are you sure you want to remove ${member.username} from the company?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/companies/${companyId}/members?memberId=${member.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }
      
      // Remove member from the list
      setMembers(members.filter(m => m.id !== member.id));
      
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }

  // Check if user can manage roles (only Admin can)
  const canManageRoles = userRole === 'Admin';
  
  // Role options for the invitation form
  const roleOptions = ['Admin', 'Manager', 'HR', 'Member', 'Guest'];
  
  // Filter role options based on user's role for the invitation
  const availableRoles = roleOptions.filter(r => {
    // Admins can assign any role
    if (userRole === 'Admin') return true;
    
    // Others can only assign lower roles
    const roleHierarchy = {
      'Admin': 1,
      'Manager': 2,
      'HR': 3,
      'Member': 4,
      'Guest': 5
    };
    
    return roleHierarchy[r as keyof typeof roleHierarchy] > 
           roleHierarchy[userRole as keyof typeof roleHierarchy];
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Company Members</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Members List */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Members ({members.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {member.avatar ? (
                          <Image
                            className="h-10 w-10 rounded-full"
                            src={member.avatar}
                            alt={member.username}
                            width={40}
                            height={40}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {member.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${member.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                        member.role === 'Manager' ? 'bg-blue-100 text-blue-800' : 
                        member.role === 'HR' ? 'bg-green-100 text-green-800' : 
                        member.role === 'Member' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {canManageRoles && (
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setNewRole(member.role);
                          setShowRoleModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Change Role
                      </button>
                    )}
                    {(canManageRoles || (member.user_id === members.find(m => m.role === 'Admin')?.user_id)) && (
                      <button
                        onClick={() => removeMember(member)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Invitations */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Invitations ({invitations.length})</h2>
          <button
            onClick={() => setShowInviteForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Invite New Member
          </button>
        </div>
        
        {invitations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No pending invitations
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Sent
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{invitation.to_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${invitation.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                          invitation.role === 'Manager' ? 'bg-blue-100 text-blue-800' : 
                          invitation.role === 'HR' ? 'bg-green-100 text-green-800' : 
                          invitation.role === 'Member' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}
                      >
                        {invitation.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          invitation.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                          'bg-red-100 text-red-800'}`}
                      >
                        {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {invitation.status === 'pending' && (
                        <button
                          onClick={() => cancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium">Invite New Member</h3>
            </div>
            
            <form onSubmit={sendInvitation}>
              <div className="p-6">
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message (Optional)
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="bg-blue-600 border border-transparent rounded-md px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Role Change Modal */}
      {showRoleModal && selectedMember && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium">Change Role for {selectedMember.username}</h3>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="newRole" className="block text-sm font-medium text-gray-700 mb-1">
                  New Role
                </label>
                <select
                  id="newRole"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedMember(null);
                }}
                className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={changeRole}
                disabled={roleChangeLoading || newRole === selectedMember.role}
                className="bg-blue-600 border border-transparent rounded-md px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {roleChangeLoading ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 