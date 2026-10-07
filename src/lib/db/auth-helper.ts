import { db } from "./client";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import { User } from "@supabase/supabase-js";
import { generateRandomUsername } from "@/lib/utils/random-username";

/**
 * Look up a user in the DB by their Supabase ID.
 * Returns the user record or null if not found.
 */
export async function getDbUser(supabaseId: string) {
  const logMessage = (msg: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] AUTH-HELPER: ${msg}`);
  };

  logMessage(`getDbUser: Checking for Supabase ID: ${supabaseId}`);
  try {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId))
      .limit(1);

    const user = results[0] || null;
    logMessage(
      `getDbUser: Result for ${supabaseId}: ${user ? "FOUND (" + user.username + ")" : "NOT FOUND"}`,
    );
    return user;
  } catch (error) {
    logMessage(
      `getDbUser: Error for ${supabaseId}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Ensures a user exists in the local database, creating them if necessary.
 * This should be used in protected routes to fix sync issues.
 */
export async function getOrCreateDbUser(
  supabaseUser: User,
  locale: string = "en",
) {
  const logMessage = (msg: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] AUTH-HELPER: ${msg}`);
  };

  const dbUser = await getDbUser(supabaseUser.id);
  if (dbUser) return dbUser;

  logMessage(
    `getOrCreateDbUser: User ${supabaseUser.id} not found in DB. Creating...`,
  );

  try {
    // Check for email conflict first
    if (supabaseUser.email) {
      const emailConflict = await db.query.users.findFirst({
        where: eq(users.email, supabaseUser.email),
      });

      if (emailConflict) {
        // If email exists but ID is different, we have a problem.
        // We can't merge automatically securely.
        // But maybe we update the supabaseId if it was empty or different?
        // For now, let's just log and throw distinct error
        logMessage(
          `getOrCreateDbUser: Email conflict for ${supabaseUser.email}`,
        );
        throw new Error("Email already exists linked to another account");
      }
    }

    let username = generateRandomUsername();
    // Try up to 5 times to get a unique username
    for (let i = 0; i < 5; i++) {
      const taken = await db.query.users.findFirst({
        where: eq(users.username, username),
      });
      if (!taken) break;
      username = generateRandomUsername();
    }

    const userLocale =
      (supabaseUser.user_metadata?.locale as string) || locale || "en";

    const [newUser] = await db
      .insert(users)
      .values({
        supabaseId: supabaseUser.id,
        email: supabaseUser.email!,
        username,
        locale: userLocale,
        tier: "FREE",
        aiCredits: 30,
      })
      .returning();

    logMessage(`getOrCreateDbUser: User created with ID ${newUser.id}`);
    return newUser;
  } catch (error) {
    logMessage(
      `getOrCreateDbUser: Error creating user: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}
