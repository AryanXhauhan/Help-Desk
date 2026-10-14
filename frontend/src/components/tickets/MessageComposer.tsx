import React, { useState } from 'react';
import { Button } from '../ui/Button.js';
import { Role } from '../../types/index.js';
import { Send, Lock, MessageCircle } from 'lucide-react';

interface MessageComposerProps {
  userRole: Role;
  onSendMessage: (body: string, isInternal: boolean) => Promise<void>;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  userRole,
  onSendMessage,
}) => {
  const [body, setBody] = useState<string>('');
  const [isInternal, setIsInternal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const canPostInternal = userRole === 'ADMIN' || userRole === 'AGENT';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setIsLoading(true);
    try {
      await onSendMessage(body.trim(), isInternal);
      setBody('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border transition-colors overflow-hidden ${
        isInternal
          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300/60'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* Mode Selector Tabs (only for agents/admins) */}
      {canPostInternal && (
        <div className="flex border-b border-slate-200/80 bg-slate-50/80 px-3 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setIsInternal(false)}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              !isInternal
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Public Reply
          </button>
          <button
            type="button"
            onClick={() => setIsInternal(true)}
            className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              isInternal
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Internal Note (Private)
          </button>
        </div>
      )}

      {/* Internal note notice */}
      {isInternal && (
        <div className="bg-amber-100/70 px-4 py-1.5 text-xs text-amber-900 flex items-center gap-2 border-b border-amber-200">
          <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>This note is private and visible only to support staff and administrators.</span>
        </div>
      )}

      {/* Textarea */}
      <div className="p-3">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            isInternal
              ? 'Write internal notes, investigation details, or thoughts for team members...'
              : 'Type your message to the customer...'
          }
          className="w-full text-sm bg-transparent border-0 focus:outline-none resize-none placeholder:text-slate-400"
        />
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 bg-slate-50/60 flex items-center justify-between border-t border-slate-100">
        <span className="text-xs text-slate-400">
          Press send or Ctrl+Enter to submit
        </span>
        <Button
          type="submit"
          size="sm"
          variant={isInternal ? 'secondary' : 'primary'}
          isLoading={isLoading}
          disabled={!body.trim()}
          rightIcon={<Send className="w-3.5 h-3.5" />}
        >
          {isInternal ? 'Save Internal Note' : 'Send Reply'}
        </Button>
      </div>
    </form>
  );
};
