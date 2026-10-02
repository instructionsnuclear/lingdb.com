import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is missing.');
  process.exit(1);
}

async function setAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Please provide a user email address.');
    console.log('Usage: pnpm db:set-admin user@example.com');
    process.exit(1);
  }

  const client = postgres(connectionString!, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    const [updatedUser] = await db
      .update(schema.users)
      .set({ role: 'ADMIN' })
      .where(eq(schema.users.email, email.toLowerCase().trim()))
      .returning();

    if (!updatedUser) {
      console.error(`❌ User with email "${email}" not found in database.`);
      process.exit(1);
    }

    console.log(`✅ Successfully promoted user ${updatedUser.email} (${updatedUser.username}) to ADMIN!`);
  } catch (error) {
    console.error('❌ Failed to set admin role:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setAdmin();
