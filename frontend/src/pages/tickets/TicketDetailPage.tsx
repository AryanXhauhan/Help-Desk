import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketApi } from '../../api/ticketApi.js';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { TicketStatusBadge } from '../../components/tickets/TicketStatusBadge.js';
import { PriorityBadge } from '../../components/tickets/PriorityBadge.js';
import { StatusModal } from '../../components/tickets/StatusModal.js';
import { AssignModal } from '../../components/tickets/AssignModal.js';
import { ActivityTimeline } from '../../components/tickets/ActivityTimeline.js';
import { MessageComposer } from '../../components/tickets/MessageComposer.js';
import { Skeleton } from '../../components/ui/Skeleton.js';
import {
  ArrowLeft,
  Clock,
  UserCheck,
  RefreshCw,
  Lock,
  MessageSquare,
  AlertTriangle,
  History,
  Calendar,
  Layers,
} from 'lucide-react';
import { Status, Priority } from '../../types/index.js';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { socket, subscribeTicket, unsubscribeTicket } = useSocket();
  const queryClient = useQueryClient();

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversation' | 'activity'>('conversation');

  // Fetch Ticket Data
  const { data: ticketData, isLoading: isTicketLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketApi.getTicketById(id!),
    enabled: !!id,
  });

  // Fetch Messages
  const { data: messagesData, isLoading: isMessagesLoading } = useQuery({
    queryKey: ['ticket', id, 'messages'],
    queryFn: () => ticketApi.getMessages(id!),
    enabled: !!id,
  });

  // Fetch Activity History
  const { data: activityData, isLoading: isActivityLoading } = useQuery({
    queryKey: ['ticket', id, 'activity'],
    queryFn: () => ticketApi.getTicketActivity(id!),
    enabled: !!id,
  });

  // Subscribe to real-time events for this ticket
  useEffect(() => {
    if (!id || !socket) return;

    subscribeTicket(id);

    const handleMessageCreated = (newMessage: any) => {
      // Refresh messages query
      queryClient.setQueryData(['ticket', id, 'messages'], (old: any) => {
        if (!old) return old;
        const exists = old.data.messages.some((m: any) => m.id === newMessage.id);
        if (exists) return old;
        return {
          ...old,
          data: {
            ...old.data,
            messages: [...old.data.messages, newMessage],
          },
        };
      });
      // Also refresh activity
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'activity'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    };

    const handleStatusChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'activity'] });
    };

    const handleAssigned = () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'activity'] });
    };

    socket.on('message:created', handleMessageCreated);
    socket.on('ticket:status_changed', handleStatusChanged);
    socket.on('ticket:assigned', handleAssigned);

    return () => {
      unsubscribeTicket(id);
      socket.off('message:created', handleMessageCreated);
      socket.off('ticket:status_changed', handleStatusChanged);
      socket.off('ticket:assigned', handleAssigned);
    };
  }, [id, socket, subscribeTicket, unsubscribeTicket, queryClient]);

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: Status; reason?: string }) =>
      ticketApi.updateStatus(id!, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'activity'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (agentId: string | null) => ticketApi.assignTicket(id!, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'activity'] });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: (priority: Priority) => ticketApi.updatePriority(id!, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'activity'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ body, isInternal }: { body: string; isInternal: boolean }) =>
      ticketApi.createMessage(id!, { body, isInternal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'activity'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  const ticket = ticketData?.data?.ticket;
  const messages = messagesData?.data?.messages || [];
  const activities = activityData?.data?.activities || [];

  if (isTicketLoading || !ticket) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const isOverdue =
    ticket.slaDeadline &&
    new Date(ticket.slaDeadline) < new Date() &&
    ticket.status !== 'RESOLVED' &&
    ticket.status !== 'CLOSED';

  const canAssign = user?.role === 'ADMIN' || user?.role === 'AGENT';
  const canChangePriority = user?.role === 'ADMIN' || user?.role === 'AGENT';

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link to="/tickets">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {ticket.ticketNumber}
              </span>
              <TicketStatusBadge status={ticket.status} size="sm" />
              <PriorityBadge priority={ticket.priority} size="sm" />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Overdue SLA
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{ticket.subject}</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canAssign && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
              onClick={() => setIsAssignModalOpen(true)}
            >
              Assign
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => setIsStatusModalOpen(true)}
          >
            Update Status
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timeline / Conversation */}
        <div className="lg:col-span-2 space-y-5">
          {/* Ticket Description Card */}
          <Card>
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
              <img
                src={ticket.customer.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                alt={ticket.customer.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">{ticket.customer.name}</p>
                <p className="text-xs text-slate-400">
                  Opened ticket on {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {ticket.description}
            </div>
          </Card>

          {/* Tab Navigation: Conversation vs Activity Audit */}
          <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('conversation')}
              className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'conversation'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Conversation ({messages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit History ({activities.length})</span>
            </button>
          </div>

          {activeTab === 'conversation' ? (
            <div className="space-y-4">
              {/* Messages list */}
              {isMessagesLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : messages.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-100 italic">
                  No replies on this ticket yet. Write a message below to begin conversation.
                </div>
              ) : (
                messages.map((message) => {
                  const isAgent = message.sender.role === 'AGENT' || message.sender.role === 'ADMIN';

                  return (
                    <div
                      key={message.id}
                      className={`rounded-xl border p-4 sm:p-5 transition-colors ${
                        message.isInternal
                          ? 'bg-amber-50/60 border-amber-200 ring-1 ring-amber-200/50'
                          : isAgent
                          ? 'bg-blue-50/30 border-blue-100'
                          : 'bg-white border-slate-200/80 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              message.sender.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'
                            }
                            alt={message.sender.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-900">
                                {message.sender.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  isAgent
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {message.sender.role}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {message.isInternal && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3 text-amber-700" />
                            <span>Internal Note</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed pl-9">
                        {message.body}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Message Composer */}
              <div className="pt-2">
                <MessageComposer
                  userRole={user!.role}
                  onSendMessage={async (body, isInternal) => {
                    await sendMessageMutation.mutateAsync({ body, isInternal });
                  }}
                />
              </div>
            </div>
          ) : (
            <Card title="Ticket Audit Log">
              {isActivityLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <ActivityTimeline activities={activities} />
              )}
            </Card>
          )}
        </div>

        {/* Right 1 Col: Ticket Metadata Sidebar */}
        <div className="space-y-4">
          <Card title="Ticket Details">
            <div className="space-y-4 text-xs">
              {/* Category */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" /> Category
                </span>
                <span className="font-semibold text-slate-800">{ticket.category}</span>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Priority</span>
                {canChangePriority ? (
                  <select
                    value={ticket.priority}
                    onChange={(e) => updatePriorityMutation.mutate(e.target.value as Priority)}
                    className="text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 px-2 py-1 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                ) : (
                  <PriorityBadge priority={ticket.priority} size="sm" />
                )}
              </div>

              {/* Assigned Agent */}
              <div className="py-2 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Assigned Agent
                  </span>
                  {canAssign && (
                    <button
                      onClick={() => setIsAssignModalOpen(true)}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>
                {ticket.assignedAgent ? (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <img
                      src={
                        ticket.assignedAgent.avatarUrl ||
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60'
                      }
                      alt={ticket.assignedAgent.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">
                        {ticket.assignedAgent.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{ticket.assignedAgent.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs">Unassigned (In triage pool)</p>
                )}
              </div>

              {/* SLA Deadline */}
              {ticket.slaDeadline && (
                <div className="py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> SLA Deadline
                  </span>
                  <p
                    className={`font-semibold text-xs ${
                      isOverdue ? 'text-rose-600' : 'text-slate-800'
                    }`}
                  >
                    {new Date(ticket.slaDeadline).toLocaleString()}
                  </p>
                  {isOverdue && (
                    <span className="text-[10px] text-rose-500 font-semibold block mt-0.5">
                      ⚠️ SLA target breached
                    </span>
                  )}
                </div>
              )}

              {/* Target Due Date */}
              {ticket.dueDate && (
                <div className="py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Target Due Date
                  </span>
                  <p className="font-semibold text-slate-800 text-xs">
                    {new Date(ticket.dueDate).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Creation and Updates */}
              <div className="space-y-1.5 pt-1 text-[11px] text-slate-400">
                <p>Created: {new Date(ticket.createdAt).toLocaleString()}</p>
                <p>Last Modified: {new Date(ticket.updatedAt).toLocaleString()}</p>
                {ticket.resolvedAt && (
                  <p className="text-emerald-600 font-medium">
                    Resolved: {new Date(ticket.resolvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Customer Profile Card */}
          <Card title="Customer Information">
            <div className="flex items-center gap-3">
              <img
                src={
                  ticket.customer.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'
                }
                alt={ticket.customer.name}
                className="w-9 h-9 rounded-full object-cover"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-900">{ticket.customer.name}</p>
                <p className="text-slate-500">{ticket.customer.email}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        currentStatus={ticket.status}
        userRole={user!.role}
        onUpdateStatus={async (status, reason) => {
          await updateStatusMutation.mutateAsync({ status, reason });
        }}
      />

      <AssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        currentAgentId={ticket.assignedAgentId}
        onAssign={async (agentId) => {
          await assignMutation.mutateAsync(agentId);
        }}
      />
    </div>
  );
};
