import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../api/notificationApi.js';
import { useSocket } from '../../context/SocketContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Skeleton } from '../../components/ui/Skeleton.js';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  ExternalLink,
  AlertTriangle,
  MessageSquare,
  UserCheck,
} from 'lucide-react';
import { Notification } from '../../types/index.js';

export const NotificationsPage: React.FC = () => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: () => notificationApi.getNotifications({ unreadOnly }),
  });

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:received', handleNotification);

    return () => {
      socket.off('notification:received', handleNotification);
    };
  }, [socket, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unreadCount || 0;

  const getIcon = (type: string) => {
    switch (type) {
      case 'TICKET_ASSIGNED':
        return <UserCheck className="w-4 h-4 text-purple-600" />;
      case 'SLA_WARNING':
      case 'OVERDUE_ALERT':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'NEW_REPLY':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time ticket assignments, conversation replies, and SLA warnings
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            isLoading={markAllMutation.isPending}
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold">
        <button
          onClick={() => setUnreadOnly(false)}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            !unreadOnly ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`pb-3 px-1 flex items-center gap-1.5 border-b-2 transition-colors ${
            unreadOnly ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          <span>Unread Only</span>
          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification List */}
      <Card className="p-0 overflow-hidden divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Bell className="w-10 h-10 text-slate-300" />}
              title="No notifications"
              description={
                unreadOnly
                  ? 'You are all caught up! There are no unread notifications.'
                  : 'You have not received any notifications yet.'
              }
            />
          </div>
        ) : (
          notifications.map((notif: Notification) => (
            <div
              key={notif.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                !notif.isRead ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{notif.title}</h4>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{notif.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                    {notif.link && (
                      <Link
                        to={notif.link}
                        className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>View Ticket</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!notif.isRead && (
                <button
                  onClick={() => markReadMutation.mutate(notif.id)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-slate-200/60 shadow-2xs"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
};
