# 🎫 HelpDesk — Enterprise Customer Support Management SaaS

[![Node.js](https://img.shields.io/badge/Node.js-v18+-68a063?style=flat&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat&logo=docker)](https://www.docker.com/)

**HelpDesk** is a full-featured, enterprise-grade customer support platform architected for reliability, strict data isolation, real-time collaboration, and automated SLA enforcement. Built with a modern full-stack TypeScript ecosystem, it handles complex ticket lifecycles, automated background queue management, interactive live metrics, and real-time WebSocket communication.

---

## 📑 Table of Contents

- [Key Architecture & Features](#-key-architecture--features)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [SLA Matrix & Background Workers](#-sla-matrix--background-workers)
- [Real-Time WebSocket Events](#-real-time-websocket-events)
- [Tech Stack Details](#-tech-stack-details)
- [Database Schema & ERD](#-database-schema--erd)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Docker & Containerized Deployment](#-docker--containerized-deployment)
- [API Documentation & Endpoints](#-api-documentation--endpoints)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Directory Structure](#-directory-structure)
- [Security & Compliance](#-security--compliance)

---

## 🚀 Key Architecture & Features

### 1. Granular Role-Based Access Control (RBAC)
- **Admin**: Full administrative authority over users, tickets, SLA triggers, and global platform analytics.
- **Support Agent**: Ticket triage pool access, status progression, customer replies, private internal team notes, and personalized performance & SLA compliance analytics.
- **Customer**: Clean self-service portal to lodge tickets, track ticket status in real time, view message threads, and reopen resolved queries.

### 2. Strict Multi-Tenant Data Isolation & Privacy
- **Database-Level Isolation**: Customers are scoped to their own records at query level (`customerId == user.id`).
- **Confidential Internal Notes**: Support agents can post internal notes (`isInternal: true`) that are filtered out at the Prisma ORM layer when a customer queries ticket messages.
- **WebSocket Filtered Dispatches**: Internal notes are never broadcast to customer client rooms.

### 3. Automated SLA Engine & Background BullMQ Workers
- Dynamically assigns Service Level Agreement (SLA) deadlines upon ticket creation based on severity priority.
- Recurring background worker scans active tickets, identifies breaches, marks overdue states, logs activity audits, and broadcasts real-time alerts.

### 4. Interactive Live Analytics & Visualizations
- Real-time aggregated metrics: Total, Open, In Progress, Overdue, and Resolved ticket counts alongside Average Resolution Times.
- Recharts visualizations: 14-day ingestion volume curves, priority distribution, ticket status breakdowns, and agent load distributions.
- Redis caching with seamless in-memory fallback for high-throughput dashboard loads.

### 5. Enterprise Security Hardening
- **Authentication**: Short-lived JWT access tokens paired with rotating refresh tokens stored as SHA-256 hashes in PostgreSQL.
- **Cookies**: HTTP-only, `SameSite=Lax`, secure cookie flags to safeguard against XSS and CSRF token theft.
- **Rate Limiting**: Defends sensitive authentication endpoints against brute-force attacks via `express-rate-limit`.
- **Validation**: Strict schema validation with Zod on request headers, query parameters, URL params, and request bodies.
- **Audit Trails**: Every ticket change (status transition, assignment, message) produces immutable `TicketActivity` log records.

---

## 🏛 System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Browser                        │
│             React 18 + Vite + Tailwind CSS + Lucide         │
└──────────────┬──────────────────────────────┬───────────────┘
               │ HTTP REST Requests           │ Socket.IO (WS)
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express Backend                        │
│        TypeScript + Zod + Helmet + RateLimiter + JWT        │
├──────────────────────────────┬──────────────────────────────┤
│    REST Controllers / API    │     Socket.IO Gateway        │
│   (/api/v1/tickets, auth)    │ (ticket rooms & live alerts) │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
       Prisma Client                     Redis Adapter
               ▼                              ▼
┌──────────────────────────────┐┌─────────────────────────────┐
│      PostgreSQL 15           ││       Redis Cache &         │
│ Users, Tickets, Messages,    ││   BullMQ SLA Breach Queue   │
│ Activities, Refresh Tokens   ││ (Graceful Memory Fallback)  │
└──────────────────────────────┘└─────────────────────────────┘
```

---

## 👥 Role-Based Access Control (RBAC)

| Role | Submit Ticket | View All Tickets | Change Status | Internal Notes | Reassign Ticket | Manage Users | View Admin Metrics |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Agent** | ❌ | Assigned + Unassigned | ✅ | ✅ | ✅ | ❌ | Personal |
| **Customer** | ✅ | Own Tickets Only | Reopen Only | ❌ | ❌ | ❌ | ❌ |

### Seed Demo Accounts

The database seed (`npm run prisma:seed`) initializes fully populated accounts with active conversation histories:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@helpdesk.com` | `Admin123!` | Complete administrative access |
| **Support Agent** | `agent.sarah@helpdesk.com` | `Agent123!` | Senior Tier 2 Agent |
| **Support Agent** | `agent.alex@helpdesk.com` | `Agent123!` | Technical Support Specialist |
| **Customer** | `customer.john@example.com` | `Customer123!` | Active Customer with submitted tickets |
| **Customer** | `customer.emily@example.com` | `Customer123!` | Customer account |

> **Quick Login**: The web interface features one-click quick-login buttons on `/login` for instantaneous testing of each persona.

---

## ⏱ SLA Matrix & Background Workers

When a ticket is created, its SLA target resolution deadline is automatically computed:

| Priority | SLA Resolution Target | Target Description |
| :--- | :---: | :--- |
| **URGENT** | **4 Hours** | Production outage, severe security incident, critical blocker |
| **HIGH** | **12 Hours** | Impaired core functionality, enterprise client escalations |
| **MEDIUM** | **24 Hours** | General functionality impairment, non-blocking inquiries |
| **LOW** | **48 Hours** | Feature recommendations, non-urgent information requests |

### Automated SLA BullMQ Worker
1. Scheduled worker queries non-resolved tickets where `slaDeadline < NOW()` and `isOverdue == false`.
2. Automatically transitions `isOverdue = true` in an atomic database transaction.
3. Appends an audit trail entry in `TicketActivity` documenting the SLA breach.
4. Broadcasts WebSocket alerts to support agents and admins.

---

## ⚡ Real-Time WebSocket Events

The platform uses Socket.IO namespaces and room grouping (`ticket:${ticketId}` and `user:${userId}`):

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `ticket:created` | Server → Agents | `{ ticket }` | Notifies agents of a newly submitted ticket |
| `ticket:updated` | Server → Room | `{ ticketId, changes }` | Broadcasts status, priority, or field changes |
| `ticket:assigned` | Server → Agent | `{ ticketId, assignedTo }` | Direct notification to assigned agent |
| `message:new` | Server → Room | `{ ticketId, message }` | Broadcasts customer & public agent replies |
| `note:new` | Server → Staff Room | `{ ticketId, note }` | Emits internal notes strictly to staff |
| `notification:new` | Server → User | `{ notification }` | Alerts user of assignments or ticket status updates |

---

## 🛠 Tech Stack Details

### Backend
- **Engine**: Node.js v18+ with Express and TypeScript (`tsx`)
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Task Scheduling & Queuing**: BullMQ & Redis (ioredis) with automatic in-memory fallback
- **Real-Time Layer**: Socket.IO
- **Security & Cryptography**: bcryptjs, jsonwebtoken, helmet, express-rate-limit
- **Validation**: Zod (strictly typed DTOs and parsers)
- **Documentation**: Swagger UI & OpenAPI 3.0 specification
- **Logger**: Pino with Pino-Pretty

### Frontend
- **Framework**: React 18 with Vite and TypeScript
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **State & Server Cache**: TanStack React Query v5
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with `@hookform/resolvers/zod`
- **Charts & Graphs**: Recharts
- **Icons & UI Elements**: Lucide React
- **HTTP Client**: Axios with automatic interceptors and token refresh

---

## 📊 Database Schema & ERD

```
┌──────────────┐       1:N       ┌────────────────┐
│     User     ├────────────────►│     Ticket     │
│──────────────│ (as Customer)   │────────────────│
│ id           │                 │ id             │
│ email        │       1:N       │ ticketNumber   │
│ passwordHash ├────────────────►│ title          │
│ role         │ (as Assigned)   │ status         │
│ name         │                 │ priority       │
│ department   │                 │ slaDeadline    │
└──────┬───────┘                 │ isOverdue      │
       │                         └───────┬────────┘
       │ 1:N                             │ 1:N
       ▼                                 ▼
┌──────────────┐                 ┌────────────────┐
│ Notification │                 │ TicketMessage  │
├──────────────┤                 ├────────────────┤
│ id           │                 │ id             │
│ userId       │                 │ ticketId       │
│ title        │                 │ senderId       │
│ message      │                 │ body           │
│ isRead       │                 │ isInternal     │
└──────────────┘                 └────────────────┘
                                         │ 1:N
                                         ▼
                                 ┌────────────────┐
                                 │ TicketActivity │
                                 ├────────────────┤
                                 │ id             │
                                 │ ticketId       │
                                 │ userId         │
                                 │ action         │
                                 │ oldValue       │
                                 │ newValue       │
                                 └────────────────┘
```

---

## 📦 Getting Started & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Local service or Docker container
- **Redis**: Optional (automatically falls back to in-memory mode if Redis is not running)

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/AryanXhauhan/Help-Desk.git
cd Help-Desk

# Configure environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Dependency Installation

```bash
# Install root orchestration packages
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Return to root
cd ..
```

### 3. Database Initialization & Seeding

Ensure PostgreSQL is running, then execute migrations and database seed:

```bash
# Run Prisma migrations
npm run prisma:migrate

# Seed demo users, tickets, and messages
npm run prisma:seed
```

### 4. Running the Development Servers

```bash
# Start backend and frontend concurrently
npm run dev

# Or start individually:
npm run dev:backend   # API server running on http://localhost:5000
npm run dev:frontend  # Vite web client on http://localhost:3000
```

### Available Endpoints
- **Frontend Web UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API Base**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)
- **Interactive OpenAPI / Swagger**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

---

## 🐳 Docker & Containerized Deployment

To deploy the entire stack using Docker Compose:

```bash
# Build images and start containers
docker compose up -d

# Check live logs across services
docker compose logs -f

# Shut down services and volumes
docker compose down
```

### Container Layout
- `postgres`: PostgreSQL 15 Database (Port 5432)
- `redis`: Redis Cache & Queue Broker (Port 6379)
- `backend`: Node.js Express Container (Port 5000)
- `frontend`: Multi-stage build served via Nginx (Port 3000)

---

## 📡 API Documentation & Endpoints

Comprehensive interactive documentation is served at `/api/docs` via Swagger UI. Below is the API route summary:

### Authentication (`/api/v1/auth`)
- `POST /register` — Register a customer account
- `POST /login` — Authenticate and receive HTTP-only cookies
- `POST /refresh-token` — Rotate refresh token & issue new access token
- `POST /logout` — Invalidate session and clear auth cookies
- `GET /me` — Retrieve current authenticated session identity

### Tickets (`/api/v1/tickets`)
- `GET /` — List tickets with filtering, pagination, search, priority, and status
- `POST /` — Create a new ticket (auto-assigns ticket number & SLA deadline)
- `GET /:id` — Get ticket details, full message history, and activity audit timeline
- `PATCH /:id/status` — Update ticket status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`)
- `PATCH /:id/assign` — Assign or reassign ticket to an agent (Staff only)
- `POST /:id/messages` — Post a public reply or internal staff note

### Analytics & Dashboard (`/api/v1/dashboard`)
- `GET /stats` — High-level metrics counters (Total, Open, In Progress, Overdue, Resolved)
- `GET /charts` — Aggregated time-series trend data and workload distribution

### User Administration (`/api/v1/users`)
- `GET /` — List all registered users (Admin only)
- `POST /` — Provision a new agent or admin account (Admin only)
- `PATCH /:id` — Update user role or department (Admin only)

### Notifications (`/api/v1/notifications`)
- `GET /` — List unread and read notifications for current user
- `PATCH /:id/read` — Mark a notification as read
- `PATCH /read-all` — Mark all notifications as read

---

## 🧪 Testing & Quality Assurance

Run the test suite powered by Vitest and Supertest:

```bash
cd backend
npm test
```

### Coverage Scope:
- **Authentication Lifecycle**: Registration, login, invalid credentials, and password validation.
- **Access Control & RBAC**: Customer isolation verification, unauthorized route rejection.
- **Confidential Internal Notes**: Verification that customers can never fetch or see notes flagged `isInternal: true`.
- **SLA & Overdue Calculations**: Validating time calculations and SLA assignments.
- **Atomic Operations**: Sequenced `HD-XXXX` ticket numbering generation.

---

## 📂 Directory Structure

```
helpdesk/
├── backend/
│   ├── prisma/
│   │   ├── migrations/            # Production database schema migrations
│   │   ├── schema.prisma          # PostgreSQL relational schema definition
│   │   └── seed.ts                # Realistic demo dataset seeder
│   ├── src/
│   │   ├── config/                # Environment variables, database, redis, logger config
│   │   ├── controllers/           # HTTP Request handlers (Auth, Ticket, User, Dashboard)
│   │   ├── docs/                  # Swagger & OpenAPI spec declarations
│   │   ├── jobs/                  # BullMQ background workers for SLA tracking
│   │   ├── middlewares/           # Auth guard, RBAC role guard, Zod validation, Rate limiting
│   │   ├── routes/                # Modular Express routers
│   │   ├── services/              # Core business domain logic and database transactions
│   │   ├── socket/                # Socket.IO WebSocket gateway & event dispatchers
│   │   ├── types/                 # TypeScript interfaces and global type augmentations
│   │   ├── utils/                 # Token handling, password hashing, ticket code generator
│   │   ├── app.ts                 # Express application middleware pipeline configuration
│   │   └── server.ts              # HTTP & WebSocket server entrypoint & graceful shutdown
│   ├── tests/
│   │   └── api.test.ts            # Integration test suite (Vitest + Supertest)
│   ├── Dockerfile                 # Production backend container build
│   ├── package.json               # Backend dependencies and scripts
│   └── tsconfig.json              # TypeScript compiler configuration
│
├── frontend/
│   ├── src/
│   │   ├── api/                   # Typed API service wrappers using Axios
│   │   ├── components/
│   │   │   ├── layout/            # Navigation, Sidebar, Layout wrapper, Role-based route guards
│   │   │   ├── tickets/           # Ticket UI: StatusBadge, PriorityBadge, Modals, MessageComposer
│   │   │   └── ui/                # Atomic UI kit: Button, Card, Modal, Input, Badge, Skeleton
│   │   ├── context/               # React Context: AuthContext, SocketContext
│   │   ├── pages/
│   │   │   ├── auth/              # Login and Register views with one-click demo credentials
│   │   │   ├── dashboard/         # Real-time analytics charts and agent workload tables
│   │   │   ├── tickets/           # Ticket lists, ticket details, creation flow
│   │   │   ├── performance/       # Agent SLA performance tracking
│   │   │   ├── notifications/     # Notification center
│   │   │   ├── users/             # Admin user management console
│   │   │   ├── profile/           # User profile and security settings
│   │   │   └── error/             # 404 Not Found & 403 Forbidden views
│   │   ├── App.tsx                # Client-side router configuration
│   │   ├── main.tsx               # Application bootstrap
│   │   └── index.css              # Custom styling & Tailwind directives
│   ├── Dockerfile                 # Multi-stage production container build (Vite + Nginx)
│   ├── nginx.conf                 # Production Nginx reverse proxy configuration
│   ├── tailwind.config.js         # Tailwind theme & color token setup
│   ├── vite.config.ts             # Vite build & development proxy setup
│   └── package.json               # Frontend dependencies and scripts
│
├── docker-compose.yml             # Full-stack orchestration (PostgreSQL, Redis, API, UI)
├── setup_db.sh                    # Automated database creation script
├── .env.example                   # Root environment variable documentation template
├── .gitignore                     # Git ignore rules for node_modules, builds, and secrets
└── README.md                      # Comprehensive project guide and reference
```

---

## 🔒 Security & Compliance

- **Zero Plaintext Secrets**: Passwords are cryptographically salted and hashed using `bcryptjs`.
- **JWT & Token Rotation**: Refresh tokens are stored strictly as one-way SHA-256 hashes in PostgreSQL to mitigate token replay if database backups are compromised.
- **Strict Query Filtering**: Customer queries are hard-scoped to the authenticated customer ID; agents and admins cannot leak internal notes to external customers.
- **Cross-Site Scripting (XSS)**: All cookies use `HttpOnly; SameSite=Lax; Secure` attributes preventing JavaScript access.
- **Defensive API Rate Limiting**: Auth routes enforce strict IP window limits to thwart brute-force password guessing.
- **Auditing**: Every status shift, ticket assignment, and message action is logged in an immutable `TicketActivity` table for accountability.

---

## 📄 License

This project is licensed under the MIT License.
