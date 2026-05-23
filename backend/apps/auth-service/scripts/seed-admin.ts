/**
 * Creates or updates an admin user in auth_db (same behavior as Admin accounts UI).
 * Run: npm run seed:admin (from backend/)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

dotenv.config({ path: path.join(__dirname, '../.env') });

const ADMIN_EMAIL = (process.env.ADMIN_SEED_EMAIL ?? 'admin@navi.test').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? 'Admin123!';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set in apps/auth-service/.env');
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  const hash_password = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      hash_password,
      role: 'admin',
      isEmailVerified: true,
      auth_provider: 'email',
      account_status: 'active',
    },
    update: {
      hash_password,
      role: 'admin',
      isEmailVerified: true,
      account_status: 'active',
      block_until: null,
    },
  });

  console.log('Admin account ready for testing:');
  console.log(`  Email (username): ${user.email}`);
  console.log(`  Password:       ${ADMIN_PASSWORD}`);
  console.log(`  Role:           ${user.role}`);
  console.log(`  User id:        ${user.id}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
