import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { ShieldX, Home } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 bg-red-50 text-red-600 rounded-3xl mb-4 shadow-sm">
        <ShieldX className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">403</h1>
      <h2 className="text-xl font-bold text-slate-800 mt-2">Access Denied</h2>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">
        Your account role does not have authorization to view this resource. Please contact your
        HelpDesk administrator if you believe this is an error.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
};
