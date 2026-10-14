import React from 'react';
import { Status } from '../../types/index.js';
import { Badge } from '../ui/Badge.js';

interface TicketStatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md';
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status, size = 'md' }) => {
  switch (status) {
    case 'OPEN':
      return <Badge variant="blue" size={size} dot>Open</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="purple" size={size} dot>In Progress</Badge>;
    case 'WAITING_FOR_CUSTOMER':
      return <Badge variant="amber" size={size} dot>Waiting on Customer</Badge>;
    case 'RESOLVED':
      return <Badge variant="green" size={size} dot>Resolved</Badge>;
    case 'CLOSED':
      return <Badge variant="gray" size={size} dot>Closed</Badge>;
    default:
      return <Badge variant="gray" size={size}>{status}</Badge>;
  }
};
