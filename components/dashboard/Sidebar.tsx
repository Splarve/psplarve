'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Users, LayoutDashboard, Menu, X } from 'lucide-react';

type SidebarProps = {
  companyName: string;
  userRole: string;
};

export default function Sidebar({ companyName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      showFor: ['Admin', 'Member'],
    },
    {
      name: 'Team Members',
      href: '/dashboard/members',
      icon: <Users className="h-5 w-5" />,
      showFor: ['Admin'],
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: <User className="h-5 w-5" />,
      showFor: ['Admin', 'Member'],
    },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    item.showFor.includes(userRole)
  );

  const renderMenuItems = () => (
    <ul className="space-y-2">
      {filteredMenuItems.map((item) => (
        <li key={item.name}>
          <Link 
            href={item.href}
            className={`flex items-center p-2 rounded-lg transition-colors ${
              pathname === item.href 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="mr-3">{item.icon}</span>
            {!isCollapsed && <span>{item.name}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );

  // Mobile sidebar
  if (isMobileOpen) {
    return (
      <>
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity"
          onClick={toggleMobile}
        ></div>
        
        <div className="fixed top-0 left-0 z-30 w-64 h-full bg-white shadow-lg transition-transform transform">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold text-lg truncate">{companyName}</h2>
            <button 
              onClick={toggleMobile}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          
          <div className="p-4">
            {renderMenuItems()}
          </div>
        </div>
        
        <div className="lg:hidden fixed top-4 left-4 z-10">
          <button
            onClick={toggleMobile}
            className="p-2 rounded-md bg-white shadow-md"
          >
            <Menu className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </>
    );
  }

  // Desktop sidebar
  return (
    <>
      {/* Mobile toggle button */}
      <div className="lg:hidden fixed top-4 left-4 z-10">
        <button
          onClick={toggleMobile}
          className="p-2 rounded-md bg-white shadow-md"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
      </div>
      
      {/* Desktop sidebar */}
      <div className={`hidden lg:block fixed left-0 top-0 h-full bg-white border-r shadow-sm transition-all ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="flex items-center justify-between p-4 border-b">
          {!isCollapsed && <h2 className="font-semibold text-lg truncate">{companyName}</h2>}
          <button 
            onClick={toggleSidebar}
            className="p-1 rounded-full hover:bg-gray-100 ml-auto"
          >
            {isCollapsed ? (
              <Menu className="h-5 w-5 text-gray-500" />
            ) : (
              <X className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
        
        <div className="p-4">
          {renderMenuItems()}
        </div>
      </div>
      
      {/* Spacer to push content to the right */}
      <div className={`hidden lg:block ${isCollapsed ? 'w-16' : 'w-64'}`}></div>
    </>
  );
} 