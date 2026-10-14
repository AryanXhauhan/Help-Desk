import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  PlusCircle,
  BarChart3,
  Users,
  Bell,
  User as UserIcon,
  LogOut,
  LifeBuoy,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, logout } = useAuth();

  const links = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      roles: ['ADMIN', 'AGENT', 'CUSTOMER'],
    },
    {
      to: '/tickets',
      label: 'Tickets',
      icon: <TicketIcon className="w-5 h-5" />,
      roles: ['ADMIN', 'AGENT', 'CUSTOMER'],
    },
    {
      to: '/tickets/new',
      label: 'Create Ticket',
      icon: <PlusCircle className="w-5 h-5" />,
      roles: ['ADMIN', 'AGENT', 'CUSTOMER'],
    },
    {
      to: '/performance',
      label: 'Agent Metrics',
      icon: <BarChart3 className="w-5 h-5" />,
      roles: ['ADMIN', 'AGENT'],
    },
    {
      to: '/users',
      label: 'User Management',
      icon: <Users className="w-5 h-5" />,
      roles: ['ADMIN'],
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      roles: ['ADMIN', 'AGENT', 'CUSTOMER'],
    },
    {
      to: '/profile',
      label: 'Account Settings',
      icon: <UserIcon className="w-5 h-5" />,
      roles: ['ADMIN', 'AGENT', 'CUSTOMER'],
    },
  ];

  const visibleLinks = links.filter(
    (link) => user && link.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <LifeBuoy className="w-5 h-5" />
        </div>
        <div>
          <span className="text-base font-bold text-white tracking-tight">HelpDesk</span>
          <span className="text-xs text-blue-400 font-medium block">Support SaaS</span>
        </div>
      </div>

      {/* Nav Links */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Menu
        </div>
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={user?.name || 'User'}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-700"
          />
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <span
              className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 ${
                user?.role === 'ADMIN'
                  ? 'bg-purple-900/60 text-purple-300'
                  : user?.role === 'AGENT'
                  ? 'bg-blue-900/60 text-blue-300'
                  : 'bg-emerald-900/60 text-emerald-300'
              }`}
            >
              {user?.role}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-800"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
