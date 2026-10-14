import React, { useState } from 'react';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { Select } from '../ui/Select.js';
import { Input } from '../ui/Input.js';
import { Status, Role } from '../../types/index.js';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: Status;
  userRole: Role;
  onUpdateStatus: (newStatus: Status, reason?: string) => Promise<void>;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  isOpen,
  onClose,
  currentStatus,
  userRole,
  onUpdateStatus,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<Status>(currentStatus);
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const getAvailableOptions = () => {
    if (userRole === 'CUSTOMER') {
      // Customers can reopen resolved/closed, or close their open ticket
      if (currentStatus === 'RESOLVED' || currentStatus === 'CLOSED') {
        return [{ value: 'OPEN', label: 'Reopen Ticket' }];
      }
      return [{ value: 'CLOSED', label: 'Close Ticket' }];
    }

    // Admins and agents can transition to any valid status
    return [
      { value: 'OPEN', label: 'Open' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'WAITING_FOR_CUSTOMER', label: 'Waiting on Customer' },
      { value: 'RESOLVED', label: 'Resolved' },
      { value: 'CLOSED', label: 'Closed' },
    ];
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdateStatus(selectedStatus, reason);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Ticket Status"
      description="Select the new status and provide an optional reason for the change."
    >
      <div className="space-y-4">
        <Select
          label="New Status"
          options={getAvailableOptions()}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as Status)}
        />

        <Input
          label="Reason / Notes (Optional)"
          placeholder="e.g. Issue resolved after database indexing"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
            Update Status
          </Button>
        </div>
      </div>
    </Modal>
  );
};
