import React from 'react';
import { Priority } from '../../types/index.js';
import { Badge } from '../ui/Badge.js';
import { Flame } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  switch (priority) {
    case 'LOW':
      return <Badge variant="green" size={size}>Low</Badge>;
    case 'MEDIUM':
      return <Badge variant="blue" size={size}>Medium</Badge>;
    case 'HIGH':
      return <Badge variant="amber" size={size}>High</Badge>;
    case 'URGENT':
      return (
        <Badge variant="red" size={size} className="animate-pulse">
          <Flame className="w-3 h-3 text-rose-600 inline mr-0.5" /> Urgent
        </Badge>
      );
    default:
      return <Badge variant="gray" size={size}>{priority}</Badge>;
  }
};
