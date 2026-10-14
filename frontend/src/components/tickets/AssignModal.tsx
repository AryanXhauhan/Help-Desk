import React, { useState } from 'react';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { Select } from '../ui/Select.js';
import { User } from '../../types/index.js';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api/userApi.js';

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAgentId?: string | null;
  onAssign: (agentId: string | null) => Promise<void>;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  isOpen,
  onClose,
  currentAgentId,
  onAssign,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgentId || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => userApi.getAgents(),
    enabled: isOpen,
  });

  const agents: User[] = agentsData?.data?.agents || [];

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onAssign(selectedAgentId === '' ? null : selectedAgentId);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const options = [
    { value: '', label: 'Unassigned (Available in Pool)' },
    ...agents.map((a) => ({
      value: a.id,
      label: `${a.name} (${a.email})`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Ticket"
      description="Select a support agent to handle this ticket."
    >
      <div className="space-y-4">
        <Select
          label="Support Agent"
          options={options}
          value={selectedAgentId}
          onChange={(e) => setSelectedAgentId(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
            Save Assignment
          </Button>
        </div>
      </div>
    </Modal>
  );
};
