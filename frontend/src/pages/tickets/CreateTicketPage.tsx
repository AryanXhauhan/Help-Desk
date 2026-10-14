import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketApi } from '../../api/ticketApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { Priority } from '../../types/index.js';
import { ArrowLeft, Send, AlertCircle, Info } from 'lucide-react';

const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
  description: z.string().min(10, 'Please provide a detailed description (min 10 characters)'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string().optional().nullable(),
});

type CreateTicketFormData = {
  subject: string;
  description: string;
  category: string;
  priority: Priority;
  dueDate?: string | null;
};

export const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      category: 'General',
      priority: 'MEDIUM',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateTicketFormData) => {
      return ticketApi.createTicket({
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/tickets/${res.data.ticket.id}`);
    },
  });

  const onSubmit = (data: CreateTicketFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button and title */}
      <div className="flex items-center gap-3">
        <Link to="/tickets">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Support Ticket</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Submit an issue or inquiry to our customer engineering team
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{(mutation.error as any)?.message || 'Failed to submit ticket.'}</span>
            </div>
          )}

          {/* Subject */}
          <Input
            label="Ticket Subject"
            required
            placeholder="e.g. Ingestion pipeline failing on CSV batch with 500 error"
            {...register('subject')}
            error={errors.subject?.message}
          />

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              required
              options={[
                { value: 'General', label: 'General Inquiry' },
                { value: 'Billing', label: 'Billing & Subscriptions' },
                { value: 'Technical', label: 'Technical Issue / Bug' },
                { value: 'UI/UX', label: 'UI / UX Feedback' },
                { value: 'Security', label: 'Security & SSO' },
                { value: 'API / Infrastructure', label: 'API & Webhooks' },
              ]}
              {...register('category')}
              error={errors.category?.message}
            />

            <Select
              label="Priority Level"
              required
              options={[
                { value: 'LOW', label: 'Low (48h SLA response)' },
                { value: 'MEDIUM', label: 'Medium (24h SLA response)' },
                { value: 'HIGH', label: 'High (12h SLA response)' },
                { value: 'URGENT', label: 'Urgent (4h SLA response)' },
              ]}
              {...register('priority')}
              error={errors.priority?.message}
            />
          </div>

          {/* Optional Due Date */}
          <Input
            label="Target Resolution Date (Optional)"
            type="datetime-local"
            {...register('dueDate')}
            error={errors.dueDate?.message}
          />

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              placeholder="Please provide steps to reproduce, error codes, affected account IDs, and any troubleshooting already performed..."
              className={`w-full rounded-lg border bg-white p-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-500' : 'border-slate-300'
              }`}
              {...register('description')}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Once submitted, a unique ticket tracking number (e.g. HD-1007) will be automatically generated.
              Our support team will be notified immediately via real-time WebSocket dispatch.
            </span>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Link to="/tickets">
              <Button variant="outline" type="button" disabled={mutation.isPending}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={mutation.isPending}
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              Submit Ticket
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
