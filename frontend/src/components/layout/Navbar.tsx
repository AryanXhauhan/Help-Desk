import React, { useEffect } from 'react';
import { Menu, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../api/notificationApi.js';

interface NavbarProps {
  onToggleMobile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobile }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ['notifications', { unreadOnly: true }],
    queryFn: () => notificationApi.getNotifications({ unreadOnly: true }),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.data?.unreadCount || 0;

  // Real-time listener for incoming notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:received', handleNewNotification);

    return () => {
      socket.off('notification:received', handleNewNotification);
    };
  }, [socket, queryClient]);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-base font-semibold text-slate-800">
            Welcome back, <span className="text-blue-600">{user?.name}</span>
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications Icon with Badge */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile Link */}
        <Link
          to="/profile"
          className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity"
        >
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={user?.name}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
          />
          <span className="hidden md:block text-xs font-semibold text-slate-700">
            {user?.name}
          </span>
        </Link>
      </div>
    </header>
  );
};
