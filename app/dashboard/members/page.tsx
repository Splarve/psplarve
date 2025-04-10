"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Plus, X, UserPlus, Settings, Mail, Check, UserCog, ChevronDown } from 'lucide-react';

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
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  
  // New invitation form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [message, setMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Role change state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState<string | null>(null);
  const [roleChangeLoading, setRoleChangeLoading] = useState<string | null>(null);

  // Role options
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
    
    return (roleHierarchy as any)[r] > (roleHierarchy as any)[userRole as keyof typeof roleHierarchy];
  });

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
        setCurrentUserEmail(profileData.profile.username);
        
        // Fetch company members
        const membersRes = await fetch(`/api/companies/${profileData.profile.company_id}/members`);
        
        if (!membersRes.ok) {
          throw new Error('Failed to fetch company members');
        }
        
        const membersData = await membersRes.json();
        setMembers(membersData.members);
        
        // Fetch invitations - including all statuses
        const invitationsRes = await fetch('/api/invitations?include_all=true');
        
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
    
    // Check if the email is already a member or invited
    const isMember = members.some(member => member.username.toLowerCase() === email.toLowerCase());
    const isInvited = invitations.some(invite => invite.to_email.toLowerCase() === email.toLowerCase());
    
    if (isMember) {
      setError('This user is already a member of your company');
      return;
    }
    
    if (isInvited) {
      setError('This user has already been invited');
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
  async function changeRole(memberId: string, newRole: string) {
    if (!companyId) return;
    
    try {
      setRoleChangeLoading(memberId);
      setError(null);
      
      const response = await fetch(`/api/companies/${companyId}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          newRole,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role');
      }
      
      // Update member in the list
      setMembers(members.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      ));
      
      // Close role menu
      setRoleMenuOpen(null);
      
    } catch (err) {
      console.error('Error changing role:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setRoleChangeLoading(null);
    }
  }

  // Handle removing a member from the company
  async function removeMember(member: Member) {
    // Count admins to ensure at least one remains
    const adminCount = members.filter(m => m.role === 'Admin').length;
    
    // If trying to remove an Admin and there's only one admin, prevent removal
    if (member.role === 'Admin' && adminCount <= 1) {
      setError('Cannot remove the last admin. Please promote another member to Admin first.');
      return;
    }
    
    // Prepare different confirmation messages for self-removal vs removing others
    const isCurrentUser = member.id === members.find(m => m.username === currentUserEmail)?.id;
    const confirmMessage = isCurrentUser
      ? 'Are you sure you want to leave this company? You will be redirected to the onboarding page.'
      : `Are you sure you want to remove ${member.username} from the company?`;
    
    if (!confirm(confirmMessage)) {
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
      
      // If the user removed themselves, redirect to onboarding
      if (data.isSelfRemoval) {
        router.push('/onboarding');
        return;
      }
      
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }
  
  // Close role menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleMenuOpen && !(event.target as HTMLElement).closest('.role-menu-container')) {
        setRoleMenuOpen(null);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [roleMenuOpen]);

  // Check if user can manage roles (only Admin can)
  const canManageRoles = userRole === 'Admin';
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Members</h1>
        {canManageRoles && (
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium">Team Members</h2>
          <span className="bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded-full">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>
        
        <ul className="divide-y">
          {members.map((member) => (
            <li key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                  {member.avatar ? (
                    <Image 
                      src={member.avatar} 
                      alt={member.username}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{member.username}</p>
                  <p className="text-xs text-gray-500">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full mr-2 text-xs
                      ${member.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                      member.role === 'Manager' ? 'bg-blue-100 text-blue-800' : 
                      member.role === 'HR' ? 'bg-green-100 text-green-800' : 
                      member.role === 'Member' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}`}
                    >
                      {member.role}
                    </span>
                  </p>
                </div>
              </div>
              
              {/* Member actions - update to allow removing other admins if there are multiple */}
              {canManageRoles && (
                <div className="flex gap-2">
                  {member.role !== 'Admin' && (
                    <div className="relative role-menu-container">
                      <button
                        onClick={() => setRoleMenuOpen(roleMenuOpen === member.id ? null : member.id)}
                        className={`text-gray-600 hover:text-blue-600 p-2 rounded hover:bg-gray-100 flex items-center gap-1 ${roleMenuOpen === member.id ? 'bg-gray-100 text-blue-600' : ''}`}
                        title="Change role"
                      >
                        {roleChangeLoading === member.id ? (
                          <div className="h-4 w-4 border-t-2 border-b-2 border-blue-600 rounded-full animate-spin" />
                        ) : (
                          <>
                            <span className="text-xs">{member.role}</span>
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                      
                      {roleMenuOpen === member.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg z-10 py-1 border">
                          {availableRoles.map(r => (
                            <button
                              key={r}
                              onClick={() => {
                                if (r !== member.role) {
                                  changeRole(member.id, r);
                                } else {
                                  setRoleMenuOpen(null);
                                }
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${r === member.role ? 'bg-gray-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                              disabled={roleChangeLoading === member.id}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <button
                    onClick={() => removeMember(member)}
                    className="text-gray-600 hover:text-red-600 p-1 rounded-full hover:bg-gray-100"
                    title="Remove member"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-medium">Invitations</h2>
            <span className="bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded-full">
              {invitations.length} {invitations.length === 1 ? 'invitation' : 'invitations'}
            </span>
          </div>
          
          <ul className="divide-y">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex-shrink-0 flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{invitation.to_email}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs
                        ${invitation.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                        invitation.role === 'Manager' ? 'bg-blue-100 text-blue-800' : 
                        invitation.role === 'HR' ? 'bg-green-100 text-green-800' : 
                        invitation.role === 'Member' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}`}
                      >
                        {invitation.role}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full
                        ${invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        invitation.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                        'bg-red-100 text-red-800'}`}
                      >
                        {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {canManageRoles && invitation.status === 'pending' && (
                  <button
                    onClick={() => cancelInvitation(invitation.id)}
                    className="text-gray-600 hover:text-red-600 p-1 rounded-full hover:bg-gray-100"
                    title="Cancel invitation"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Invite New Member</h3>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={sendInvitation} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Join our team..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center"
                >
                  {inviteLoading ? 'Sending...' : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 