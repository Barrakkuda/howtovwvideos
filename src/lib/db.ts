import { PrismaClient } from "../../generated/prisma";

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    // See Prisma queries in the console in development mode
    // log: ['query', 'info', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
