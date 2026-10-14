import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboardApi.js';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Skeleton } from '../../components/ui/Skeleton.js';
import { Link } from 'react-router-dom';
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => dashboardApi.getMetrics(),
    refetchInterval: 30000,
  });

  // Listen for real-time ticket events to refresh metrics
  useEffect(() => {
    if (!socket) return;

    const handleTicketUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
    };

    socket.on('ticket:created', handleTicketUpdate);
    socket.on('ticket:status_changed', handleTicketUpdate);
    socket.on('ticket:assigned', handleTicketUpdate);

    return () => {
      socket.off('ticket:created', handleTicketUpdate);
      socket.off('ticket:status_changed', handleTicketUpdate);
      socket.off('ticket:assigned', handleTicketUpdate);
    };
  }, [socket, queryClient]);

  const metrics = data?.data?.metrics;
  const summary = metrics?.summary;

  if (isLoading || !summary) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {user?.role === 'CUSTOMER' ? 'My Support Overview' : 'Support Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time analytics, SLA tracking, and ticket workflow performance
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/tickets">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              View Tickets
            </Button>
          </Link>
          <Link to="/tickets/new">
            <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Create Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <Card className="border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Tickets
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.totalTickets}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <TicketIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold text-blue-600">{summary.openTickets} Open</span>
            <span>•</span>
            <span className="font-semibold text-purple-600">{summary.inProgressTickets} In Progress</span>
          </div>
        </Card>

        {/* SLA Overdue Tickets */}
        <Card className={`border-l-4 ${summary.overdueTickets > 0 ? 'border-l-rose-600 bg-rose-50/20' : 'border-l-emerald-600'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overdue / SLA Breach
              </p>
              <h3 className={`text-2xl font-bold mt-1 ${summary.overdueTickets > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {summary.overdueTickets}
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${summary.overdueTickets > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {summary.overdueTickets > 0 ? 'Urgent attention required' : 'All tickets within SLA target'}
          </p>
        </Card>

        {/* Resolved Tickets */}
        <Card className="border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Resolved Tickets
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.resolvedTickets}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {summary.closedTickets} tickets archived / closed
          </p>
        </Card>

        {/* Average Resolution Time */}
        <Card className="border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Avg Resolution Time
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {summary.avgResolutionHours} <span className="text-sm font-normal text-slate-500">hrs</span>
              </h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Target: &lt; 24.0 hrs</span>
          </div>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Volume Over Time (2 cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Ticket Ingestion Volume (14 Days)"
            subtitle="Volume of new tickets created vs resolved tickets over time"
          >
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.ticketVolumeOverTime}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    name="Created"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCreated)"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorResolved)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Priority Distribution Pie */}
        <div>
          <Card
            title="Tickets by Priority"
            subtitle="Severity distribution across all tickets"
          >
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.priorityDistribution}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {metrics.priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} tickets`, name]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Agent Workload Table (for Agents and Admins) */}
      {user?.role !== 'CUSTOMER' && metrics.agentWorkload && metrics.agentWorkload.length > 0 && (
        <Card
          title="Support Agent Workload"
          subtitle="Real-time ticket load and resolution averages per team member"
          headerAction={
            <Link to="/performance">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Detailed Metrics
              </Button>
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                  <th className="py-2.5">Agent</th>
                  <th className="py-2.5">Role</th>
                  <th className="py-2.5 text-center">Active Open</th>
                  <th className="py-2.5 text-center">Resolved</th>
                  <th className="py-2.5 text-right">Avg Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.agentWorkload.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 flex items-center gap-2.5">
                      <img
                        src={agent.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                        alt={agent.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-slate-800">{agent.name}</p>
                        <p className="text-[10px] text-slate-400">{agent.email}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-slate-600">{agent.role}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {agent.openTickets}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {agent.resolvedTickets}
                      </span>
                    </td>
                    <td className="py-3 text-right font-medium text-slate-700">
                      {agent.avgResolutionHours} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
