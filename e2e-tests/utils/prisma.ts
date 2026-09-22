import './env';
import path from 'path';

// The generated Prisma client lives in the server package, not in this
// standalone test project, so it is required from there directly.
const { PrismaClient } = require(
  path.resolve(__dirname, '../../server/node_modules/@prisma/client')
);

export const prisma = new PrismaClient();

export const bcrypt = require(
  path.resolve(__dirname, '../../server/node_modules/bcryptjs')
);
