import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HelpDesk SaaS API',
      version: '1.0.0',
      description: 'Production Customer Support Ticket Management API with RBAC, Real-Time updates, and SLA tracking',
      contact: {
        name: 'HelpDesk Engineering',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'HTTP-only JWT access token cookie',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token header',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'AGENT', 'CUSTOMER'] },
            avatarUrl: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            ticketNumber: { type: 'string', example: 'HD-1001' },
            subject: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'] },
            customerId: { type: 'string', format: 'uuid' },
            assignedAgentId: { type: 'string', format: 'uuid', nullable: true },
            slaDeadline: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TicketMessage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            ticketId: { type: 'string', format: 'uuid' },
            senderId: { type: 'string', format: 'uuid' },
            messageType: { type: 'string', enum: ['CUSTOMER_REPLY', 'AGENT_REPLY', 'INTERNAL_NOTE'] },
            body: { type: 'string' },
            isInternal: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        DashboardMetrics: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalTickets: { type: 'integer' },
                openTickets: { type: 'integer' },
                inProgressTickets: { type: 'integer' },
                waitingTickets: { type: 'integer' },
                resolvedTickets: { type: 'integer' },
                closedTickets: { type: 'integer' },
                overdueTickets: { type: 'integer' },
                avgResolutionHours: { type: 'number' },
              },
            },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
