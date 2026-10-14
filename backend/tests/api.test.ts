import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Application } from 'express';

let app: Application;
let adminCookie: string[];
let agentCookie: string[];
let customerCookie: string[];
let customerTicketId: string;

describe('HelpDesk SaaS Backend API Tests', () => {
  beforeAll(async () => {
    app = createApp();

    // Log in as Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@helpdesk.com', password: 'Admin123!' });
    expect(adminLogin.status).toBe(200);
    adminCookie = adminLogin.headers['set-cookie'];

    // Log in as Agent
    const agentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'agent.sarah@helpdesk.com', password: 'Agent123!' });
    expect(agentLogin.status).toBe(200);
    agentCookie = agentLogin.headers['set-cookie'];

    // Log in as Customer
    const customerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'customer.john@example.com', password: 'Customer123!' });
    expect(customerLogin.status).toBe(200);
    customerCookie = customerLogin.headers['set-cookie'];
  });

  describe('1. Health & Documentation', () => {
    it('returns healthy status on /api/v1/health', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('2. Authentication & Authorization', () => {
    it('rejects unauthenticated requests to protected routes', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns current profile for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', customerCookie);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('customer.john@example.com');
      expect(res.body.data.user.role).toBe('CUSTOMER');
    });

    it('rejects invalid login credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@helpdesk.com', password: 'WrongPassword123!' });
      expect(res.status).toBe(401);
    });

    it('rejects public registration with weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Weak User', email: 'weak@example.com', password: '123' });
      expect(res.status).toBe(422);
    });
  });

  describe('3. Ticket Management & Customer Isolation', () => {
    it('allows a customer to create a support ticket', async () => {
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Cookie', customerCookie)
        .send({
          subject: 'Integration test ticket for issue',
          description: 'Detailed description of the issue for integration testing purposes.',
          category: 'Technical',
          priority: 'MEDIUM',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ticket.ticketNumber).toMatch(/^HD-\d+$/);
      expect(res.body.data.ticket.status).toBe('OPEN');
      customerTicketId = res.body.data.ticket.id;
    });

    it('strictly isolates customer ticket lists (customer only sees own tickets)', async () => {
      const res = await request(app)
        .get('/api/v1/tickets')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      const tickets = res.body.data.tickets;
      expect(tickets.length).toBeGreaterThan(0);
      tickets.forEach((t: any) => {
        expect(t.customer.email).toBe('customer.john@example.com');
      });
    });

    it('allows support agent to view tickets and assign them', async () => {
      const res = await request(app)
        .patch(`/api/v1/tickets/${customerTicketId}/status`)
        .set('Cookie', agentCookie)
        .send({ status: 'IN_PROGRESS', reason: 'Investigating integration issue' });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('IN_PROGRESS');
    });
  });

  describe('4. Privacy: Internal Notes Protection', () => {
    it('allows agent to add an internal note', async () => {
      const noteRes = await request(app)
        .post(`/api/v1/tickets/${customerTicketId}/messages`)
        .set('Cookie', agentCookie)
        .send({
          body: 'CONFIDENTIAL: Internal engineering note about database replica lag.',
          isInternal: true,
        });

      expect(noteRes.status).toBe(201);
      expect(noteRes.body.data.message.isInternal).toBe(true);
    });

    it('allows agent to view both customer messages and internal notes', async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${customerTicketId}/messages`)
        .set('Cookie', agentCookie);

      expect(res.status).toBe(200);
      const internalNotes = res.body.data.messages.filter((m: any) => m.isInternal === true);
      expect(internalNotes.length).toBeGreaterThanOrEqual(1);
    });

    it('NEVER exposes internal notes to the customer', async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${customerTicketId}/messages`)
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      const messages = res.body.data.messages;
      const leakedNotes = messages.filter((m: any) => m.isInternal === true);
      expect(leakedNotes.length).toBe(0); // Zero internal notes visible to customer!
    });
  });

  describe('5. RBAC Restrictions', () => {
    it('forbids customer from assigning tickets', async () => {
      const res = await request(app)
        .patch(`/api/v1/tickets/${customerTicketId}/assign`)
        .set('Cookie', customerCookie)
        .send({ agentId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(403);
    });

    it('forbids customer from accessing user management', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(403);
    });

    it('allows admin to access user management', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.users.length).toBeGreaterThan(0);
    });

    it('aggregates real metrics on dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/metrics')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.metrics.summary.totalTickets).toBeGreaterThan(0);
      expect(res.body.data.metrics.priorityDistribution).toBeDefined();
    });
  });
});
