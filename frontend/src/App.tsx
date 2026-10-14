import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { Layout } from './components/layout/Layout.js';
import { RoleGuard } from './components/layout/RoleGuard.js';

// Pages
import { LoginPage } from './pages/auth/LoginPage.js';
import { RegisterPage } from './pages/auth/RegisterPage.js';
import { DashboardPage } from './pages/dashboard/DashboardPage.js';
import { TicketListPage } from './pages/tickets/TicketListPage.js';
import { TicketDetailPage } from './pages/tickets/TicketDetailPage.js';
import { CreateTicketPage } from './pages/tickets/CreateTicketPage.js';
import { AgentPerformancePage } from './pages/performance/AgentPerformancePage.js';
import { NotificationsPage } from './pages/notifications/NotificationsPage.js';
import { UserManagementPage } from './pages/users/UserManagementPage.js';
import { ProfilePage } from './pages/profile/ProfilePage.js';
import { NotFoundPage } from './pages/error/NotFoundPage.js';
import { UnauthorizedPage } from './pages/error/UnauthorizedPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10, // 10s
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Protected App Routes */}
              <Route
                element={
                  <RoleGuard>
                    <Layout />
                  </RoleGuard>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/tickets" element={<TicketListPage />} />
                <Route path="/tickets/new" element={<CreateTicketPage />} />
                <Route path="/tickets/:id" element={<TicketDetailPage />} />
                <Route
                  path="/performance"
                  element={
                    <RoleGuard allowedRoles={['ADMIN', 'AGENT']}>
                      <AgentPerformancePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']}>
                      <UserManagementPage />
                    </RoleGuard>
                  }
                />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
