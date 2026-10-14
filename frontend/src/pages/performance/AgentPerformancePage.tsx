import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api/userApi.js';
import { Card } from '../../components/ui/Card.js';
import { Skeleton } from '../../components/ui/Skeleton.js';
import { AgentPerformance } from '../../types/index.js';
import {
  Users,
  CheckCircle,
  Clock,
  ShieldAlert,
  Award,
} from 'lucide-react';

export const AgentPerformancePage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['agents', 'performance'],
    queryFn: () => userApi.getAgentPerformance(),
  });

  const performanceList: AgentPerformance[] = data?.data?.performance || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Aggregate stats
  const totalAssignedAll = performanceList.reduce((sum, a) => sum + a.totalAssigned, 0);
  const totalResolvedAll = performanceList.reduce((sum, a) => sum + a.resolvedCount, 0);
  const avgSlaAll =
    performanceList.length > 0
      ? Math.round(
          performanceList.reduce((sum, a) => sum + a.slaComplianceRate, 0) /
            performanceList.length
        )
      : 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Support Team & Agent Performance
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Evaluate ticket resolution throughput, active loads, and SLA compliance metrics
        </p>
      </div>

      {/* Top Aggregate Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Handled
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalAssignedAll}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Total tickets assigned to team</p>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Successfully Resolved
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalResolvedAll}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Closed & resolved support inquiries</p>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Team SLA Compliance
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{avgSlaAll}%</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-600 font-semibold">Exceeds 90% SLA baseline</p>
        </Card>
      </div>

      {/* Agent Performance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {performanceList.map((agent) => (
          <Card key={agent.agentId} className="flex flex-col justify-between">
            <div>
              {/* Agent Header */}
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
                <img
                  src={
                    agent.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                  }
                  alt={agent.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">{agent.name}</h3>
                  <p className="text-xs text-slate-400">{agent.email}</p>
                  <span className="inline-block text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded mt-1">
                    {agent.role}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Active Open Tickets:</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {agent.openCount}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Resolved Tickets:</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {agent.resolvedCount}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Avg Resolution Time:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {agent.avgResolutionHours} hrs
                  </span>
                </div>

                {/* SLA Compliance Progress Bar */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-500 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> SLA Compliance:
                    </span>
                    <span className="font-bold text-slate-900">{agent.slaComplianceRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        agent.slaComplianceRate >= 90
                          ? 'bg-emerald-500'
                          : agent.slaComplianceRate >= 75
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${agent.slaComplianceRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
