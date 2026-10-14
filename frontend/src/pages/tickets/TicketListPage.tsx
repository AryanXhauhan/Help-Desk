import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketApi } from '../../api/ticketApi.js';
import { userApi } from '../../api/userApi.js';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { TicketStatusBadge } from '../../components/tickets/TicketStatusBadge.js';
import { PriorityBadge } from '../../components/tickets/PriorityBadge.js';
import { TableSkeleton } from '../../components/ui/Skeleton.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Link } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowUpDown,
  User as UserIcon,
} from 'lucide-react';
import { Ticket } from '../../types/index.js';

export const TicketListPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch agent options for filter
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => userApi.getAgents(),
    enabled: user?.role !== 'CUSTOMER',
  });

  const agents = agentsData?.data?.agents || [];

  // Fetch tickets
  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { page, search, status, priority, category, assignedAgentId, sortBy, sortOrder }],
    queryFn: () =>
      ticketApi.getTickets({
        page,
        limit: 10,
        search,
        status,
        priority,
        category,
        assignedAgentId,
        sortBy,
        sortOrder,
      }),
  });

  // Real-time updates for ticket changes
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    };

    socket.on('ticket:created', handleUpdate);
    socket.on('ticket:status_changed', handleUpdate);
    socket.on('ticket:assigned', handleUpdate);

    return () => {
      socket.off('ticket:created', handleUpdate);
      socket.off('ticket:status_changed', handleUpdate);
      socket.off('ticket:assigned', handleUpdate);
    };
  }, [socket, queryClient]);

  const tickets = data?.data?.tickets || [];
  const pagination = data?.data?.pagination;

  const handleToggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setCategory('');
    setAssignedAgentId('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Tickets</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse, search, and manage all customer tickets with SLA deadlines
          </p>
        </div>
        <Link to="/tickets/new">
          <Button variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
            New Ticket
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              label="Search Tickets"
              placeholder="Search by ticket # or subject..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              label="Status"
              placeholder="All Statuses"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'OPEN', label: 'Open' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'WAITING_FOR_CUSTOMER', label: 'Waiting on Customer' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'CLOSED', label: 'Closed' },
              ]}
            />
          </div>

          {/* Priority Filter */}
          <div>
            <Select
              label="Priority"
              placeholder="All Priorities"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
            />
          </div>

          {/* Agent Filter (Agents & Admins only) */}
          {user?.role !== 'CUSTOMER' ? (
            <div>
              <Select
                label="Assignee"
                placeholder="All Assignees"
                value={assignedAgentId}
                onChange={(e) => {
                  setAssignedAgentId(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'unassigned', label: 'Unassigned Only' },
                  ...agents.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
            </div>
          ) : (
            <div>
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={handleResetFilters}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Tickets Table Card */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No tickets found"
              description="No tickets match your active filter criteria. Try adjusting your search query or reset filters."
              action={
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Clear All Filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => handleToggleSort('ticketNumber')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Ticket #</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => handleToggleSort('subject')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Subject</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  {user?.role !== 'CUSTOMER' && <th className="py-3 px-4">Customer</th>}
                  <th className="py-3 px-4">Assignee</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 transition-colors"
                    onClick={() => handleToggleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Created</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket: Ticket) => {
                  const isOverdue =
                    ticket.slaDeadline &&
                    new Date(ticket.slaDeadline) < new Date() &&
                    ticket.status !== 'RESOLVED' &&
                    ticket.status !== 'CLOSED';

                  return (
                    <tr
                      key={ticket.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOverdue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Ticket Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs font-bold text-blue-600">
                        <Link to={`/tickets/${ticket.id}`} className="hover:underline">
                          {ticket.ticketNumber}
                        </Link>
                      </td>

                      {/* Subject & Category */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                        >
                          {ticket.subject}
                        </Link>
                        <span className="text-[11px] text-slate-400 mt-0.5 inline-block">
                          Category: {ticket.category}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <TicketStatusBadge status={ticket.status} size="sm" />
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityBadge priority={ticket.priority} size="sm" />
                      </td>

                      {/* Customer (Agents/Admin) */}
                      {user?.role !== 'CUSTOMER' && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                ticket.customer?.avatarUrl ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'
                              }
                              alt={ticket.customer?.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="text-xs text-slate-700 font-medium">
                              {ticket.customer?.name}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Assigned Agent */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {ticket.assignedAgent ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                ticket.assignedAgent.avatarUrl ||
                                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60'
                              }
                              alt={ticket.assignedAgent.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="text-xs text-slate-700 font-medium">
                              {ticket.assignedAgent.name}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 italic">
                            <UserIcon className="w-3.5 h-3.5" /> Unassigned
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{(page - 1) * 10 + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(page * 10, pagination.totalCount)}
              </span>{' '}
              of <span className="font-semibold">{pagination.totalCount}</span> tickets
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="font-semibold text-slate-700">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
