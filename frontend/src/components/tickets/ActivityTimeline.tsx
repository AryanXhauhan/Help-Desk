import React from 'react';
import { TicketActivity } from '../../types/index.js';
import { Clock, UserCheck, RefreshCw, FileText, MessageSquare, AlertCircle } from 'lucide-react';

interface ActivityTimelineProps {
  activities: TicketActivity[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return <p className="text-xs text-slate-400 italic">No activity recorded yet.</p>;
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'TICKET_CREATED':
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case 'AGENT_ASSIGNED':
        return <UserCheck className="w-3.5 h-3.5 text-purple-500" />;
      case 'STATUS_UPDATED':
      case 'TICKET_REOPENED':
      case 'TICKET_RESOLVED':
      case 'TICKET_CLOSED':
        return <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />;
      case 'INTERNAL_NOTE_ADDED':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formatActionTitle = (activity: TicketActivity) => {
    const actor = activity.user?.name || 'System';
    switch (activity.action) {
      case 'TICKET_CREATED':
        return `${actor} created this ticket`;
      case 'AGENT_ASSIGNED':
        return `${actor} assigned ticket to ${activity.details?.assignedAgentName || 'Agent'}`;
      case 'STATUS_UPDATED':
        return `${actor} changed status from ${activity.details?.from} to ${activity.details?.to}`;
      case 'TICKET_RESOLVED':
        return `${actor} marked ticket as RESOLVED`;
      case 'TICKET_CLOSED':
        return `${actor} CLOSED the ticket`;
      case 'TICKET_REOPENED':
        return `${actor} REOPENED the ticket`;
      case 'INTERNAL_NOTE_ADDED':
        return `${actor} added an internal note`;
      case 'CUSTOMER_REPLIED':
        return `${actor} replied`;
      case 'AGENT_REPLIED':
        return `${actor} replied to customer`;
      case 'PRIORITY_UPDATED':
        return `${actor} updated priority to ${activity.details?.to}`;
      default:
        return `${actor} performed ${activity.action}`;
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {activities.map((activity) => (
        <div key={activity.id} className="relative group">
          {/* Timeline Dot */}
          <div className="absolute -left-6 top-0.5 p-1 bg-white border border-slate-300 rounded-full shadow-xs">
            {getActionIcon(activity.action)}
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-800">{formatActionTitle(activity)}</p>
            {activity.details?.reason && (
              <p className="text-slate-500 mt-0.5 italic">"{activity.details.reason}"</p>
            )}
            <div className="flex items-center gap-1.5 text-slate-400 mt-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(activity.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
