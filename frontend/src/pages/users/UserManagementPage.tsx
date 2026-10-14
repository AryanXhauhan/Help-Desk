import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../api/userApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Modal } from '../../components/ui/Modal.js';
import { TableSkeleton } from '../../components/ui/Skeleton.js';
import { Badge } from '../../components/ui/Badge.js';
import { User, Role } from '../../types/index.js';
import { UserPlus, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('AGENT');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search, role: roleFilter }],
    queryFn: () =>
      userApi.getUsers({
        page,
        limit: 10,
        search,
        role: roleFilter,
      }),
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: { name: string; email: string; password: string; role: Role }) =>
      userApi.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddUserOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to create user');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: Role; isActive?: boolean } }) =>
      userApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const users: User[] = data?.data?.users || [];
  const pagination = data?.data?.pagination;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newName || !newEmail || !newPassword) {
      setFormError('All fields are required.');
      return;
    }
    createUserMutation.mutate({
      name: newName,
      email: newEmail,
      password: newPassword,
      role: newRole,
    });
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="purple" size="sm">Admin</Badge>;
      case 'AGENT':
        return <Badge variant="blue" size="sm">Support Agent</Badge>;
      default:
        return <Badge variant="gray" size="sm">Customer</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Administer support team agents, customer accounts, and security access roles
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddUserOpen(true)}
        >
          Add User
        </Button>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Search Users"
              placeholder="Search by name or email..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Select
              label="Role Filter"
              placeholder="All Roles"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ADMIN', label: 'Admin' },
                { value: 'AGENT', label: 'Support Agent' },
                { value: 'CUSTOMER', label: 'Customer' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Tickets</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <img
                        src={
                          u.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'
                        }
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <p className="font-semibold text-slate-900 text-xs sm:text-sm">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                      {u.role === 'CUSTOMER' ? (
                        <span>{u._count?.customerTickets || 0} submitted</span>
                      ) : (
                        <span>{u._count?.assignedTickets || 0} assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle Active status */}
                        <button
                          onClick={() =>
                            updateUserMutation.mutate({
                              id: u.id,
                              data: { isActive: !u.isActive },
                            })
                          }
                          className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                            u.isActive
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{(page - 1) * 10 + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(page * 10, pagination.totalCount)}</span> of{' '}
              <span className="font-semibold">{pagination.totalCount}</span> users
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

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Create New User"
        description="Add a new administrator, support agent, or customer to HelpDesk."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Full Name"
            required
            placeholder="e.g. Jessica Taylor"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <Input
            label="Email Address"
            type="email"
            required
            placeholder="jessica@helpdesk.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />

          <Input
            label="Temporary Password"
            type="password"
            required
            placeholder="At least 8 chars (Uppercase, number, symbol)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <Select
            label="System Role"
            required
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as Role)}
            options={[
              { value: 'AGENT', label: 'Support Agent' },
              { value: 'ADMIN', label: 'System Admin' },
              { value: 'CUSTOMER', label: 'Customer' },
            ]}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsAddUserOpen(false)}
              disabled={createUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={createUserMutation.isPending}
            >
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
