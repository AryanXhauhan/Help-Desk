import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Card } from '../../components/ui/Card.js';
import { LifeBuoy, ShieldCheck, Headphones, UserCheck, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-blue-600 items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-3">
          <LifeBuoy className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          HelpDesk SaaS
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Customer support ticket management platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="shadow-lg border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          {/* Demo quick logins for testing */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Quick Demo Accounts (1-Click Fill)
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@helpdesk.com', 'Admin123!')}
                className="p-2 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center text-center transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600 mb-1" />
                <span className="font-semibold text-slate-800">Admin</span>
                <span className="text-[10px] text-slate-400">Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('agent.sarah@helpdesk.com', 'Agent123!')}
                className="p-2 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center text-center transition-colors"
              >
                <Headphones className="w-4 h-4 text-blue-600 mb-1" />
                <span className="font-semibold text-slate-800">Agent</span>
                <span className="text-[10px] text-slate-400">Sarah</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('customer.john@example.com', 'Customer123!')}
                className="p-2 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center text-center transition-colors"
              >
                <UserCheck className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="font-semibold text-slate-800">Customer</span>
                <span className="text-[10px] text-slate-400">John</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
              Register as Customer
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
