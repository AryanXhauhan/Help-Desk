export type Role = 'ADMIN' | 'AGENT' | 'CUSTOMER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type Status = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type MessageType = 'CUSTOMER_REPLY' | 'AGENT_REPLY' | 'INTERNAL_NOTE';
export type NotificationType = 'TICKET_ASSIGNED' | 'NEW_REPLY' | 'STATUS_CHANGED' | 'SLA_WARNING' | 'OVERDUE_ALERT' | 'SYSTEM';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  _count?: {
    customerTickets: number;
    assignedTickets: number;
  };
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  assignedAgentId?: string | null;
  assignedAgent?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  dueDate?: string | null;
  slaDeadline?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatarUrl?: string | null;
  };
  messageType: MessageType;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketActivity {
  id: string;
  ticketId: string;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatarUrl?: string | null;
  } | null;
  action: string;
  details?: any;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  type: NotificationType;
  createdAt: string;
}

export interface DashboardMetrics {
  summary: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    waitingTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    overdueTickets: number;
    avgResolutionHours: number;
  };
  priorityDistribution: { name: string; count: number; color: string }[];
  statusDistribution: { name: string; count: number; color: string }[];
  ticketVolumeOverTime: { date: string; created: number; resolved: number }[];
  agentWorkload: {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatarUrl?: string | null;
    totalAssigned: number;
    openTickets: number;
    resolvedTickets: number;
    avgResolutionHours: number;
  }[];
}

export interface AgentPerformance {
  agentId: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  totalAssigned: number;
  openCount: number;
  resolvedCount: number;
  slaComplianceRate: number;
  avgResolutionHours: number;
}

export interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}
