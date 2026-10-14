import { PrismaClient, Role, Priority, Status, MessageType, ActivityAction, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log('🌱 Starting HelpDesk database seed...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.ticketActivity.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  console.log('Creating demo users...');

  const adminPassword = await hashPassword('Admin123!');
  const agentPassword = await hashPassword('Agent123!');
  const customerPassword = await hashPassword('Customer123!');

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@helpdesk.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      name: 'Sarah Connor',
      email: 'agent.sarah@helpdesk.com',
      passwordHash: agentPassword,
      role: Role.AGENT,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'agent.alex@helpdesk.com',
      passwordHash: agentPassword,
      role: Role.AGENT,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'customer.john@example.com',
      passwordHash: customerPassword,
      role: Role.CUSTOMER,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: 'Emily Watson',
      email: 'customer.emily@example.com',
      passwordHash: customerPassword,
      role: Role.CUSTOMER,
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      name: 'Michael Scott',
      email: 'customer.michael@example.com',
      passwordHash: customerPassword,
      role: Role.CUSTOMER,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
  });

  console.log('Demo users created.');

  // 2. Create Tickets
  console.log('Creating demo tickets with conversation histories...');

  const now = new Date();

  // Ticket 1: Urgent payment issue
  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNumber: 'HD-1001',
      subject: 'Payment gateway timeout during enterprise plan renewal',
      description: 'Our annual subscription renewal failed with error PG-504 gateway timeout. Our corporate card was debited twice, but the account still displays Free Tier status. Please review urgently.',
      category: 'Billing',
      priority: Priority.URGENT,
      status: Status.IN_PROGRESS,
      customerId: customer1.id,
      assignedAgentId: agent1.id,
      createdAt: new Date(now.getTime() - 3 * 3600 * 1000), // 3 hours ago
      slaDeadline: new Date(now.getTime() + 1 * 3600 * 1000), // 1 hour left
    },
  });

  // Ticket 1 Activities & Messages
  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket1.id,
      userId: customer1.id,
      action: ActivityAction.TICKET_CREATED,
      details: { subject: ticket1.subject, priority: ticket1.priority },
      createdAt: new Date(now.getTime() - 3 * 3600 * 1000),
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket1.id,
      userId: admin.id,
      action: ActivityAction.AGENT_ASSIGNED,
      details: { assignedAgentName: agent1.name, assignedBy: admin.name },
      createdAt: new Date(now.getTime() - 2.5 * 3600 * 1000),
    },
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      senderId: agent1.id,
      messageType: MessageType.INTERNAL_NOTE,
      body: 'Verified Stripe transaction log. Double charge occurred due to webhook retry. Queued refund of second charge #ch_9824f8.',
      isInternal: true,
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000),
    },
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      senderId: agent1.id,
      messageType: MessageType.AGENT_REPLY,
      body: 'Hello John, thank you for reaching out. We have identified the webhook issue and have initiated the refund for the duplicate transaction. Your Enterprise plan is now being manually activated.',
      isInternal: false,
      createdAt: new Date(now.getTime() - 1.5 * 3600 * 1000),
    },
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      senderId: customer1.id,
      messageType: MessageType.CUSTOMER_REPLY,
      body: 'Thank you Sarah! I can see the Enterprise badge now. Awaiting confirmation of the refund receipt.',
      isInternal: false,
      createdAt: new Date(now.getTime() - 45 * 60 * 1000),
    },
  });

  // Ticket 2: High priority CSV export error (Unassigned & Open)
  const ticket2 = await prisma.ticket.create({
    data: {
      ticketNumber: 'HD-1002',
      subject: 'Cannot export quarterly analytics report to CSV',
      description: 'When clicking "Export CSV" on the Quarterly Sales Dashboard, the modal spins indefinitely and eventually throws a 500 error in the browser console. Dataset contains roughly 45,000 rows.',
      category: 'Analytics',
      priority: Priority.HIGH,
      status: Status.OPEN,
      customerId: customer2.id,
      assignedAgentId: null,
      createdAt: new Date(now.getTime() - 5 * 3600 * 1000),
      slaDeadline: new Date(now.getTime() + 7 * 3600 * 1000),
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket2.id,
      userId: customer2.id,
      action: ActivityAction.TICKET_CREATED,
      details: { subject: ticket2.subject, priority: ticket2.priority },
      createdAt: new Date(now.getTime() - 5 * 3600 * 1000),
    },
  });

  // Ticket 3: SAML/SSO Setup (Waiting on Customer)
  const ticket3 = await prisma.ticket.create({
    data: {
      ticketNumber: 'HD-1003',
      subject: 'Requesting SAML/SSO integration configuration guide for Okta',
      description: 'Our IT security department requires Okta SAML 2.0 configuration details (Entity ID, ACS URL, and certificate requirement). Could you provide your IdP metadata XML?',
      category: 'Security',
      priority: Priority.MEDIUM,
      status: Status.WAITING_FOR_CUSTOMER,
      customerId: customer3.id,
      assignedAgentId: agent2.id,
      createdAt: new Date(now.getTime() - 24 * 3600 * 1000),
      slaDeadline: new Date(now.getTime() + 12 * 3600 * 1000),
    },
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket3.id,
      senderId: agent2.id,
      messageType: MessageType.AGENT_REPLY,
      body: 'Hi Michael, I have attached our SP metadata endpoint. Could you please provide your Okta Identity Provider Issuer URI so we can generate your tenant assertion consumer URL?',
      isInternal: false,
      createdAt: new Date(now.getTime() - 18 * 3600 * 1000),
    },
  });

  // Ticket 4: Resolved ticket
  const ticket4 = await prisma.ticket.create({
    data: {
      ticketNumber: 'HD-1004',
      subject: 'Dark mode preference resets upon clearing browser session',
      description: 'Whenever I log in from an incognito window or clear cookies, the UI theme reverts to light mode even though my profile has dark mode set.',
      category: 'UI/UX',
      priority: Priority.LOW,
      status: Status.RESOLVED,
      customerId: customer1.id,
      assignedAgentId: agent1.id,
      createdAt: new Date(now.getTime() - 48 * 3600 * 1000),
      slaDeadline: new Date(now.getTime() - 24 * 3600 * 1000),
      resolvedAt: new Date(now.getTime() - 12 * 3600 * 1000),
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket4.id,
      userId: agent1.id,
      action: ActivityAction.TICKET_RESOLVED,
      details: { resolvedBy: agent1.name },
      createdAt: new Date(now.getTime() - 12 * 3600 * 1000),
    },
  });

  // Ticket 5: SLA Breached / Overdue ticket!
  const ticket5 = await prisma.ticket.create({
    data: {
      ticketNumber: 'HD-1005',
      subject: 'Critical API rate-limiting false positive blocking production worker',
      description: 'Our automated ingestion worker (IP 198.51.100.42) is being HTTP 429 blocked despite staying within our contracted 100 req/sec limit. Production pipeline is stalled.',
      category: 'API / Infrastructure',
      priority: Priority.URGENT,
      status: Status.OPEN,
      customerId: customer2.id,
      assignedAgentId: agent2.id,
      createdAt: new Date(now.getTime() - 8 * 3600 * 1000),
      slaDeadline: new Date(now.getTime() - 4 * 3600 * 1000), // Overdue by 4 hours!
    },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket5.id,
      userId: customer2.id,
      action: ActivityAction.TICKET_CREATED,
      details: { subject: ticket5.subject, priority: ticket5.priority },
      createdAt: new Date(now.getTime() - 8 * 3600 * 1000),
    },
  });

  // Ticket 6: Closed ticket
  const ticket6 = await prisma.ticket.create({
    data: {
      ticketNumber: 'HD-1006',
      subject: 'Correction required for invoice #INV-2026-004 VAT calculation',
      description: 'The VAT on invoice 004 was calculated at standard 20% instead of reverse charge EU business exemption. Reverse charge VAT ID provided: IE6388047V.',
      category: 'Billing',
      priority: Priority.HIGH,
      status: Status.CLOSED,
      customerId: customer3.id,
      assignedAgentId: agent2.id,
      createdAt: new Date(now.getTime() - 72 * 3600 * 1000),
      slaDeadline: new Date(now.getTime() - 60 * 3600 * 1000),
      resolvedAt: new Date(now.getTime() - 36 * 3600 * 1000),
      closedAt: new Date(now.getTime() - 20 * 3600 * 1000),
    },
  });

  // Notifications
  await prisma.notification.create({
    data: {
      userId: agent1.id,
      title: 'Ticket Assigned: HD-1001',
      message: 'You have been assigned to ticket "Payment gateway timeout during enterprise plan renewal"',
      type: NotificationType.TICKET_ASSIGNED,
      link: `/tickets/${ticket1.id}`,
      createdAt: new Date(now.getTime() - 2.5 * 3600 * 1000),
    },
  });

  await prisma.notification.create({
    data: {
      userId: agent2.id,
      title: '⚠️ SLA Breach Alert: HD-1005',
      message: 'Ticket "Critical API rate-limiting false positive blocking production worker" has exceeded SLA!',
      type: NotificationType.SLA_WARNING,
      link: `/tickets/${ticket5.id}`,
      createdAt: new Date(now.getTime() - 3.8 * 3600 * 1000),
    },
  });

  console.log('✅ Demo seed data created successfully!');
  console.log('----------------------------------------------------');
  console.log('Credentials for evaluation:');
  console.log('• Admin:    admin@helpdesk.com        / Admin123!');
  console.log('• Agent 1:  agent.sarah@helpdesk.com  / Agent123!');
  console.log('• Agent 2:  agent.alex@helpdesk.com   / Agent123!');
  console.log('• Customer: customer.john@example.com / Customer123!');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
