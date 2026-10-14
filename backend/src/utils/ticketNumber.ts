import { Prisma, PrismaClient } from '@prisma/client';

export const generateTicketNumber = async (
  tx: Prisma.TransactionClient | PrismaClient
): Promise<string> => {
  // Fetch existing ticket numbers to find the true numerical maximum
  const existingTickets = await tx.ticket.findMany({
    select: { ticketNumber: true },
    where: { ticketNumber: { startsWith: 'HD-' } },
  });

  let maxNum = 1000;
  for (const t of existingTickets) {
    const num = parseInt(t.ticketNumber.replace('HD-', ''), 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  return `HD-${maxNum + 1}`;
};
